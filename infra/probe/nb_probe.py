#!/usr/bin/env python3
"""
NextBit Probe — Unified Super Tool v4.0
Cross-platform hardware diagnostics + NextBit fleet integration

Distribution model:
  - Downloaded as a single binary (PyInstaller, zero install)
  - On every run: prompts for owner secret key (NB-XXXXXXXX)
    └─ If a key was used before, it is shown as default (press Enter to reuse)
    └─ Gateway responds with previous scan history for this machine
  - Identity data (serial, machine_id, MACs) → PostgreSQL via gateway
  - Full diagnostic JSON → MongoDB Atlas via gateway
  - Gateway returns device_id + scan_id + is_new_device + last_seen on success

New in v4.0:
  - Device classification: Laptop / Desktop / Server / VM (chassis + OS ProductType + CPU + virt)
  - Virtualization detection (systemd-detect-virt, BIOS/manufacturer hints, CPUID hypervisor bit)
  - ECC RAM detection (Windows WMI, Linux dmidecode)
  - RAID / SAS controller detection
  - CPU architecture (x86_64, ARM64, etc.)
  - Improved SMART: scans all /dev/sd* and /dev/nvme* automatically
  - Robust BIOS date parser (MM/DD/YYYY + YYYY-MM-DD + DD/MM/YYYY)
  - Per-scan key prompt with config default (always editable)
  - Score now broken down by category: Hardware / Software / Security
  - --no-browser CLI flag
  - HTML: Device Category badge, VM warning, server notes, category score bars

Checks:
  01. System info (model, serial, OS, BIOS age, device category)
  02. OEM license key match
  03. CPU throttle stress test
  04. RAM stability + ECC detection
  05. Battery health (wear %, cycles, capacity)
  06. Disk SMART (power-on hours, wear, errors) — all disks
  07. GPU condition (driver age, crash events)
  08. Display info
  09. Temperature
  10. Network (Wi-Fi, Ethernet, internet)
  11. Peripherals (webcam, BT, audio, USB)
  12. OS & security (activation, AV, FW, TPM)
  13. Startup / performance snapshot
  14. Event log errors

Author: XcognVis / NextBit
Version: 4.0.0
"""

import os, sys, platform, subprocess, json, hashlib, uuid
import socket, struct, time, math, random, re, argparse, glob
from datetime import datetime, timezone

# ── Version ────────────────────────────────────────────────────────
PROBE_VERSION  = "4.0.0"
GATEWAY_BASE   = "http://192.168.100.1:8080"
SUBMIT_URL     = f"{GATEWAY_BASE}/api/probe/submit"
VERSION_URL    = f"{GATEWAY_BASE}/api/probe/version"

# ── Paths ──────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(sys.argv[0]))
_MEIPASS_DIR = getattr(sys, "_MEIPASS", None)
ASSET_BASE   = _MEIPASS_DIR or BASE_DIR
CONFIG_PATH  = os.path.join(BASE_DIR, ".nextbit", "config.json")
REPORTS_DIR  = os.path.join(BASE_DIR, "reports")
LOGO_PATH    = os.path.join(ASSET_BASE, "assets", "images", "NextBit.png")

# ── Optional deps ──────────────────────────────────────────────────
try:
    import psutil; HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

try:
    import qrcode
    from PIL import Image
    import io, base64
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False

try:
    import requests; HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    import tkinter as tk
    from tkinter import ttk, simpledialog, messagebox
    HAS_TK = True
except ImportError:
    HAS_TK = False

# ── OS Detection ───────────────────────────────────────────────────
def detect_os():
    s = platform.system().lower()
    if s == "windows": return "windows"
    if s == "darwin":  return "macos"
    if s == "linux":
        try:
            content = open("/etc/os-release").read().lower()
            for name in ("ubuntu","debian","fedora","centos","arch","kali","manjaro","rhel","opensuse","alpine"):
                if name in content: return name
        except: pass
        return "linux"
    if s == "freebsd": return "freebsd"
    return f"unknown:{s}"

OS_TYPE   = detect_os()
OS_FAMILY = (
    "windows" if "windows" in OS_TYPE else
    "macos"   if OS_TYPE == "macos"   else
    "bsd"     if OS_TYPE in ("freebsd","openbsd","netbsd") else
    "linux"
)
IS_WINDOWS = OS_FAMILY == "windows"
IS_LINUX   = OS_FAMILY == "linux"
IS_MACOS   = OS_FAMILY == "macos"

# ── Console Colours ────────────────────────────────────────────────
_CYAN  = "\033[96m"; _GREEN = "\033[92m"; _YELL  = "\033[93m"
_RED   = "\033[91m"; _GRAY  = "\033[90m"; _BOLD  = "\033[1m"; _RST = "\033[0m"

# ── CLI args ───────────────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(description="NextBit Probe v4.0")
    p.add_argument("--no-browser", action="store_true", help="Do not open HTML report in browser after scan")
    p.add_argument("--key", metavar="NB-XXXXXXXX", help="Owner key (skip interactive prompt)")
    p.add_argument("--output-dir", metavar="PATH", help="Override reports output directory")
    # ignore unknown args so PyInstaller doesn't break
    args, _ = p.parse_known_args()
    return args

# ══════════════════════════════════════════════════════════════════
# ADMIN ELEVATION
# ══════════════════════════════════════════════════════════════════
def ensure_admin():
    if IS_WINDOWS:
        try:
            import ctypes
            is_admin = ctypes.windll.shell32.IsUserAnAdmin()
        except:
            is_admin = False

        if not is_admin:
            print(f"\n  {_YELL}Administrator privileges required.{_RST}")
            print(f"  {_GRAY}Requesting elevation — please click Yes on the UAC prompt...{_RST}\n")
            try:
                import ctypes
                class SHELLEXECUTEINFO(ctypes.Structure):
                    _fields_ = [
                        ("cbSize",      ctypes.c_ulong),
                        ("fMask",       ctypes.c_ulong),
                        ("hwnd",        ctypes.c_void_p),
                        ("lpVerb",      ctypes.c_wchar_p),
                        ("lpFile",      ctypes.c_wchar_p),
                        ("lpParameters",ctypes.c_wchar_p),
                        ("lpDirectory", ctypes.c_wchar_p),
                        ("nShow",       ctypes.c_int),
                        ("hInstApp",    ctypes.c_void_p),
                        ("lpIDList",    ctypes.c_void_p),
                        ("lpClass",     ctypes.c_wchar_p),
                        ("hkeyClass",   ctypes.c_void_p),
                        ("dwHotKey",    ctypes.c_ulong),
                        ("hIcon",       ctypes.c_void_p),
                        ("hProcess",    ctypes.c_void_p),
                    ]
                params = " ".join(f'"{a}"' for a in sys.argv)
                sei = SHELLEXECUTEINFO()
                sei.cbSize       = ctypes.sizeof(sei)
                sei.fMask        = 0x00000040
                sei.lpVerb       = "runas"
                sei.lpFile       = sys.executable
                sei.lpParameters = params
                sei.nShow        = 1
                if not ctypes.windll.shell32.ShellExecuteExW(ctypes.byref(sei)):
                    raise ctypes.WinError()
                ctypes.windll.kernel32.WaitForSingleObject(sei.hProcess, 0xFFFFFFFF)
                ctypes.windll.kernel32.CloseHandle(sei.hProcess)
                sys.exit(0)
            except Exception as e:
                print(f"  {_RED}Could not auto-elevate: {e}{_RST}")
                print(f"  {_RED}Please right-click and select 'Run as Administrator'.{_RST}")
                input("\n  Press Enter to exit...")
                sys.exit(1)
    else:
        if os.geteuid() != 0:
            print(f"\n  {_YELL}Root privileges required.{_RST}")
            print(f"  {_GRAY}Re-launching with sudo...{_RST}\n")
            try:
                if subprocess.run(["which", "sudo"], stdout=subprocess.DEVNULL,
                                  stderr=subprocess.DEVNULL).returncode != 0:
                    print(f"  {_RED}sudo not found. Please run as root.{_RST}")
                    sys.exit(1)
                result = subprocess.run(["sudo", sys.executable] + sys.argv)
                sys.exit(result.returncode)
            except KeyboardInterrupt:
                print(f"\n  {_RED}Cancelled.{_RST}")
                sys.exit(0)
            except Exception as e:
                print(f"  {_RED}Could not re-launch with sudo: {e}{_RST}")
                print(f"  {_RED}Please run manually: sudo python3 {sys.argv[0]}{_RST}")
                sys.exit(1)

# ══════════════════════════════════════════════════════════════════
# OWNER KEY — prompt on every run, config used as default only
# ══════════════════════════════════════════════════════════════════
def _validate_key_format(key: str) -> bool:
    return bool(re.match(r'^NB-[A-Za-z0-9]{8}$', key.strip()))

def _load_saved_key() -> str:
    """Return previously saved key, or empty string."""
    if os.path.exists(CONFIG_PATH):
        try:
            cfg = json.load(open(CONFIG_PATH))
            key = cfg.get("owner_key", "")
            if _validate_key_format(key):
                return key.strip().upper()
        except:
            pass
    return ""

def _save_key(key: str):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    # Load existing config so we don't overwrite other fields
    cfg = {}
    if os.path.exists(CONFIG_PATH):
        try: cfg = json.load(open(CONFIG_PATH))
        except: pass
    cfg["owner_key"]      = key
    cfg["configured_at"]  = datetime.now(timezone.utc).isoformat()
    cfg["probe_version"]  = PROBE_VERSION
    json.dump(cfg, open(CONFIG_PATH, "w"), indent=2)

def prompt_owner_key(cli_key: str = "") -> str:
    """
    Always prompt for owner key. If a saved key exists, show it as default.
    The operator can press Enter to reuse it, or type a new one.
    Returns a valid key or exits.
    """
    if cli_key and _validate_key_format(cli_key):
        _save_key(cli_key.strip().upper())
        return cli_key.strip().upper()

    saved = _load_saved_key()

    print(f"\n{_BOLD}{_CYAN}  ─── Owner Key ─────────────────────────────────────────{_RST}")
    if saved:
        print(f"  {_GRAY}Last used key: {saved[:3]}{'*'*5}{saved[-1:]}   (press Enter to reuse){_RST}")
        hint = f"[{saved}]: "
    else:
        print(f"  {_GRAY}Enter the NB-XXXXXXXX key from your NextBit shop account.{_RST}")
        hint = "(NB-XXXXXXXX): "

    key = ""
    attempts = 0
    while attempts < 3:
        try:
            raw = input(f"  {_CYAN}Owner key {hint}{_RST}").strip().upper()
        except (EOFError, KeyboardInterrupt):
            print(f"\n  {_RED}Cancelled.{_RST}")
            sys.exit(0)

        if raw == "" and saved:
            key = saved
            break
        if _validate_key_format(raw):
            key = raw
            break

        attempts += 1
        remaining = 3 - attempts
        print(f"  {_RED}Invalid format. Expected NB- followed by 8 alphanumeric characters.{_RST}")
        if remaining > 0:
            print(f"  {_GRAY}({remaining} attempt{'s' if remaining > 1 else ''} remaining){_RST}\n")

    if not key:
        print(f"\n  {_RED}Too many invalid attempts. Exiting.{_RST}")
        sys.exit(1)

    _save_key(key)
    if key != saved:
        print(f"\n  {_GREEN}New key saved.{_RST}")
    return key

# ══════════════════════════════════════════════════════════════════
# VERSION CHECK
# ══════════════════════════════════════════════════════════════════
def check_for_update(owner_key: str):
    if not HAS_REQUESTS:
        return
    try:
        r = requests.get(VERSION_URL, headers={"X-NextBit-Owner": owner_key}, timeout=5)
        if r.status_code != 200:
            return
        data = r.json()
        latest      = data.get("latest_version", PROBE_VERSION)
        download_url = data.get("download_url", "")

        def _vt(v):
            return tuple(int(x) for x in v.split("."))

        if _vt(latest) > _vt(PROBE_VERSION):
            print(f"  {_YELL}┌─ UPDATE AVAILABLE ─────────────────────────────────────┐")
            print(f"  │  Current : v{PROBE_VERSION:<10}  Latest : v{latest:<10}           │")
            if download_url:
                print(f"  │  Download: {download_url:<47}│")
            print(f"  └────────────────────────────────────────────────────────┘{_RST}\n")
    except:
        pass

# ══════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════
def run(cmd, shell=False, timeout=12):
    try:
        r = subprocess.run(cmd, shell=shell, stdout=subprocess.PIPE,
                           stderr=subprocess.DEVNULL, timeout=timeout)
        return r.stdout.decode(errors="replace").strip()
    except:
        return None

def safe(fn, default="N/A"):
    try:
        r = fn()
        return r if r not in (None, "", []) else default
    except:
        return default

def is_na(v):
    return v in (None, "", "N/A", "n/a", "Unknown", "unknown")

def rate(value, excellent, good, poor, lower_is_better=True):
    COLORS = {
        "EXCELLENT": "#00e676",
        "GOOD":      "#29b6f6",
        "POOR":      "#ffa726",
        "VERY POOR": "#ef5350",
        "N/A":       "#78909c",
    }
    try:
        v = float(value)
    except:
        return "N/A", COLORS["N/A"]
    if lower_is_better:
        if v <= excellent: label = "EXCELLENT"
        elif v <= good:    label = "GOOD"
        elif v <= poor:    label = "POOR"
        else:              label = "VERY POOR"
    else:
        if v >= excellent: label = "EXCELLENT"
        elif v >= good:    label = "GOOD"
        elif v >= poor:    label = "POOR"
        else:              label = "VERY POOR"
    return label, COLORS[label]

def get_machine_id():
    if IS_WINDOWS:
        return run('powershell -NoProfile -Command "(Get-ItemProperty -Path HKLM:\\SOFTWARE\\Microsoft\\Cryptography).MachineGuid"', shell=True)
    if IS_LINUX:
        for path in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
            if os.path.exists(path):
                return open(path, "r", encoding="utf-8", errors="ignore").read().strip()
        return None
    if IS_MACOS:
        out = run(["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"]) or ""
        for line in out.splitlines():
            if "IOPlatformUUID" in line:
                parts = line.split('"')
                if len(parts) >= 4:
                    return parts[3].strip()
    return None

def get_network_mac_addresses():
    macs = []
    if HAS_PSUTIL:
        for iface, addr_list in psutil.net_if_addrs().items():
            for addr in addr_list:
                fam = getattr(addr, "family", None)
                if fam == getattr(socket, "AF_PACKET", object()) or fam == getattr(socket, "AF_LINK", object()):
                    mac = getattr(addr, "address", "").strip().upper()
                    if mac and mac != "00:00:00:00:00:00":
                        macs.append(mac)
    if not macs:
        if IS_WINDOWS:
            out = run("getmac /NH /FO CSV", shell=True) or ""
            for line in out.splitlines():
                cols = [c.strip().strip('"') for c in line.split(",")]
                if cols and re.match(r"^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$", cols[0], re.I):
                    macs.append(cols[0].replace("-", ":").upper())
        else:
            out = run(["ip", "link", "show"]) or run(["ifconfig", "-a"]) or ""
            for mac in re.findall(r"([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})", out):
                if mac != "00:00:00:00:00:00":
                    macs.append(mac.upper())
    return sorted(set(macs))

def make_qr_payload(label, values):
    data = {"type": label}
    for k, v in values.items():
        if v not in (None, "", "N/A"):
            data[k] = v
    return json.dumps(data, separators=(",", ":"), sort_keys=True)

def make_qr_with_logo(payload, logo_path=None):
    if not HAS_QRCODE or not payload:
        return None
    try:
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,
                           box_size=10, border=2)
        qr.add_data(payload)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
        if logo_path and os.path.exists(logo_path):
            try:
                logo = Image.open(logo_path).convert('RGBA')
                qr_width, qr_height = qr_img.size
                logo_size = qr_width // 5
                logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
                bg = Image.new('RGB', (logo_size + 20, logo_size + 20), 'white')
                bg.paste(logo, (10, 10), logo)
                offset_x = (qr_width - bg.width) // 2
                offset_y = (qr_height - bg.height) // 2
                qr_img.paste(bg, (offset_x, offset_y))
            except:
                pass
        buf = io.BytesIO()
        qr_img.save(buf, format='PNG')
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"
    except:
        return None

# ══════════════════════════════════════════════════════════════════
# NEW: VIRTUALIZATION DETECTION
# ══════════════════════════════════════════════════════════════════
def detect_virtualization():
    """
    Returns dict: {is_vm: bool, hypervisor: str, method: str}
    """
    hypervisor = "None"
    method     = ""

    # ── Linux: systemd-detect-virt ────────────────────────────────
    if IS_LINUX:
        out = run(["systemd-detect-virt"])
        if out and out.lower() not in ("none", ""):
            return {"is_vm": True, "hypervisor": out.strip(), "method": "systemd-detect-virt"}
        # Check /proc/cpuinfo for hypervisor flag
        try:
            cpuinfo = open("/proc/cpuinfo").read()
            if "hypervisor" in cpuinfo.lower():
                return {"is_vm": True, "hypervisor": "Unknown (CPUID hypervisor bit)", "method": "cpuinfo"}
        except:
            pass
        # Check DMI product name
        try:
            pn = open("/sys/class/dmi/id/product_name").read().strip().lower()
            for kw, name in [("vmware","VMware"),("virtualbox","VirtualBox"),("kvm","KVM"),
                             ("qemu","QEMU"),("xen","Xen"),("hyper-v","Hyper-V"),
                             ("microsoft corporation","Hyper-V")]:
                if kw in pn:
                    return {"is_vm": True, "hypervisor": name, "method": "dmi/product_name"}
        except:
            pass
        # Check manufacturer
        try:
            vendor = open("/sys/class/dmi/id/sys_vendor").read().strip().lower()
            for kw, name in [("vmware","VMware"),("innotek","VirtualBox"),
                             ("microsoft","Hyper-V"),("xen","Xen"),("qemu","QEMU")]:
                if kw in vendor:
                    return {"is_vm": True, "hypervisor": name, "method": "dmi/sys_vendor"}
        except:
            pass

    elif IS_WINDOWS:
        # Check manufacturer field
        mfr = safe(lambda: run("wmic computersystem get manufacturer", shell=True).split("\n")[1].strip(), "").lower()
        model = safe(lambda: run("wmic computersystem get model", shell=True).split("\n")[1].strip(), "").lower()
        for kw, name in [("vmware","VMware"),("virtualbox","VirtualBox"),
                         ("microsoft corporation","Hyper-V"),("xen","Xen"),("qemu","QEMU"),("kvm","KVM")]:
            if kw in mfr or kw in model:
                return {"is_vm": True, "hypervisor": name, "method": "wmic manufacturer/model"}
        # Check OS product type doesn't tell VM, but check registry
        hv = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_ComputerSystem).HypervisorPresent"', shell=True), "")
        if str(hv).lower() == "true":
            return {"is_vm": True, "hypervisor": "Unknown hypervisor", "method": "WMI HypervisorPresent"}

    elif IS_MACOS:
        model = safe(lambda: run(["sysctl", "-n", "hw.model"]), "").lower()
        if "vmware" in model or "virtual" in model:
            return {"is_vm": True, "hypervisor": "VMware/Parallels", "method": "sysctl hw.model"}

    return {"is_vm": False, "hypervisor": "None", "method": "no match"}


# ══════════════════════════════════════════════════════════════════
# NEW: DEVICE CLASSIFICATION
# ══════════════════════════════════════════════════════════════════
def classify_device(system_info: dict, virt_info: dict, battery_info: dict) -> dict:
    """
    Returns: {category: "Laptop"|"Desktop"|"Server"|"VM", chassis_type: str,
              form_factor: str, confidence: "high"|"medium"|"low"}
    """
    chassis_type  = "N/A"
    form_factor   = "N/A"
    category      = "Unknown"
    confidence    = "low"
    notes         = []

    # ── Step 1: VM wins if detected ───────────────────────────────
    if virt_info.get("is_vm"):
        return {
            "category":     "VM",
            "chassis_type": "Virtual Machine",
            "form_factor":  "Virtual",
            "confidence":   "high",
            "notes":        [f"Hypervisor: {virt_info.get('hypervisor')}"],
        }

    # ── Step 2: Chassis type (most authoritative) ─────────────────
    chassis_id = None
    if IS_WINDOWS:
        raw = safe(lambda: run("wmic systemenclosure get chassistypes", shell=True))
        # Extract first numeric value from output
        nums = re.findall(r'\d+', raw or "")
        if nums:
            chassis_id = int(nums[0])
        # Also get product type (1=Workstation, 2=DC, 3=Server)
        product_type = safe(lambda: run("wmic os get producttype", shell=True).split("\n")[1].strip(), "1")
        if product_type in ("2", "3"):
            category   = "Server"
            confidence = "high"
            notes.append(f"OS ProductType={product_type} (Server)")
    elif IS_LINUX:
        try:
            chassis_raw = open("/sys/class/dmi/id/chassis_type").read().strip()
            chassis_id  = int(chassis_raw)
        except:
            pass
    elif IS_MACOS:
        model = safe(lambda: run(["sysctl", "-n", "hw.model"]), "")
        if "MacBook" in model:
            return {"category": "Laptop", "chassis_type": "Notebook", "form_factor": model,
                    "confidence": "high", "notes": ["Apple MacBook identified"]}
        elif "Mac Pro" in model or "Mac mini" in model or "iMac" in model:
            return {"category": "Desktop", "chassis_type": "Desktop", "form_factor": model,
                    "confidence": "high", "notes": ["Apple desktop identified"]}

    # SMBIOS Chassis Type mapping
    CHASSIS_MAP = {
        1:  ("Other",      "Unknown"),
        2:  ("Unknown",    "Unknown"),
        3:  ("Desktop",    "Desktop"),
        4:  ("Low Profile Desktop", "Desktop"),
        5:  ("Pizza Box",  "Desktop"),
        6:  ("Mini Tower", "Desktop"),
        7:  ("Tower",      "Desktop"),
        8:  ("Portable",   "Laptop"),
        9:  ("Laptop",     "Laptop"),
        10: ("Notebook",   "Laptop"),
        11: ("Hand Held",  "Laptop"),
        12: ("Docking Station", "Laptop"),
        13: ("All In One", "Desktop"),
        14: ("Sub Notebook","Laptop"),
        15: ("Space-Saving","Desktop"),
        16: ("Lunch Box",  "Desktop"),
        17: ("Main Server Chassis","Server"),
        18: ("Expansion Chassis","Server"),
        19: ("Sub Chassis","Server"),
        20: ("Bus Expansion Chassis","Server"),
        21: ("Peripheral Chassis","Server"),
        22: ("RAID Chassis","Server"),
        23: ("Rack Mount Chassis","Server"),
        24: ("Sealed-Case PC","Desktop"),
        25: ("Multi-System","Server"),
        26: ("Compact PCI","Server"),
        27: ("Advanced TCA","Server"),
        28: ("Blade",      "Server"),
        29: ("Blade Enclosure","Server"),
        30: ("Tablet",     "Laptop"),
        31: ("Convertible","Laptop"),
        32: ("Detachable", "Laptop"),
        33: ("IoT Gateway","Server"),
        34: ("Embedded PC","Desktop"),
        35: ("Mini PC",    "Desktop"),
        36: ("Stick PC",   "Desktop"),
    }

    if chassis_id and chassis_id in CHASSIS_MAP:
        chassis_type, derived = CHASSIS_MAP[chassis_id]
        form_factor = chassis_type
        if category not in ("Server",):  # don't override OS ProductType
            category   = derived
            confidence = "high"
        notes.append(f"SMBIOS chassis type {chassis_id} ({chassis_type})")

    # ── Step 3: CPU heuristics ────────────────────────────────────
    cpu_name = (system_info.get("cpu") or "").upper()
    if any(x in cpu_name for x in ("XEON", "EPYC", "OPTERON", "ITANIUM")):
        if category != "Server":
            notes.append(f"Server-class CPU detected: {cpu_name[:40]}")
        category   = "Server"
        confidence = max(confidence, "medium") if confidence == "low" else confidence

    # ── Step 4: Battery fallback (if no chassis data) ─────────────
    if confidence == "low":
        if battery_info.get("present"):
            category   = "Laptop"
            confidence = "medium"
            notes.append("Battery detected → Laptop")
        else:
            category   = "Desktop"
            confidence = "low"
            notes.append("No battery → assumed Desktop")

    return {
        "category":     category,
        "chassis_type": chassis_type,
        "form_factor":  form_factor,
        "confidence":   confidence,
        "notes":        notes,
    }


# ══════════════════════════════════════════════════════════════════
# NEW: ECC RAM DETECTION
# ══════════════════════════════════════════════════════════════════
def detect_ecc_ram():
    """Returns {has_ecc: bool, details: str}"""
    if IS_WINDOWS:
        out = safe(lambda: run('powershell -Command "Get-CimInstance Win32_PhysicalMemory | Select-Object -ExpandProperty MemoryType | Select-Object -First 1"', shell=True), "")
        # MemoryType 20 = DDR, 21 = DDR2, etc. ECC is a separate attribute
        ecc_raw = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1).TypeDetail"', shell=True), "")
        # TypeDetail bit 0x0080 = ECC
        try:
            td = int(ecc_raw)
            has_ecc = bool(td & 0x0080)
            return {"has_ecc": has_ecc, "details": f"TypeDetail: {td}"}
        except:
            return {"has_ecc": False, "details": "Could not determine"}
    elif IS_LINUX:
        out = run(["sudo", "dmidecode", "--type", "17"]) or ""
        if "Error Correction Type" in out:
            for line in out.splitlines():
                if "Error Correction Type" in line:
                    ecc_type = line.split(":")[-1].strip()
                    has_ecc  = ecc_type.lower() not in ("none", "unknown", "other")
                    return {"has_ecc": has_ecc, "details": ecc_type}
        return {"has_ecc": False, "details": "dmidecode output unavailable"}
    elif IS_MACOS:
        out = run(["system_profiler", "SPMemoryDataType"]) or ""
        has_ecc = "ecc" in out.lower()
        return {"has_ecc": has_ecc, "details": "ECC detected" if has_ecc else "No ECC detected"}
    return {"has_ecc": False, "details": "N/A"}


# ══════════════════════════════════════════════════════════════════
# NEW: RAID / SAS CONTROLLER DETECTION
# ══════════════════════════════════════════════════════════════════
def detect_raid_controllers():
    """Returns list of detected RAID/SAS controllers."""
    controllers = []
    if IS_WINDOWS:
        out = safe(lambda: run('powershell -Command "Get-CimInstance Win32_SCSIController | Select-Object -ExpandProperty Name"', shell=True), "")
        if out and out != "N/A":
            for line in out.splitlines():
                l = line.strip()
                if l:
                    controllers.append(l)
    elif IS_LINUX:
        lspci = run(["lspci"]) or ""
        for line in lspci.splitlines():
            if any(x in line.upper() for x in ("RAID", "SAS", "SCSI", "MEGARAID", "SMARTARRAY",
                                                "PERC", "LSI", "ADAPTEC", "3WARE", "ARECA")):
                controllers.append(line.strip())
    elif IS_MACOS:
        out = run(["system_profiler", "SPSASDataType"]) or ""
        if out and len(out) > 20:
            controllers.append("SAS/RAID detected (see system_profiler SPSASDataType)")
    return controllers if controllers else []


# ══════════════════════════════════════════════════════════════════
# GATEWAY SUBMISSION
# ══════════════════════════════════════════════════════════════════
def _strip_qr(results: dict) -> dict:
    import copy
    clean = copy.deepcopy(results)
    if "system" in clean and "qr" in clean["system"]:
        qr = clean["system"]["qr"]
        for k in list(qr.keys()):
            v = qr[k]
            if isinstance(v, str) and v.startswith("data:image"):
                del qr[k]
    return clean

def submit_to_gateway(results: dict, score: dict, owner_key: str) -> dict:
    if not HAS_REQUESTS:
        raise RuntimeError("requests library not available in this build.")

    payload = _strip_qr(results)
    score_for_server = {k: v for k, v in score.items() if k != "color"}
    payload["score"]         = score_for_server
    payload["probe_version"] = PROBE_VERSION
    payload["os_type"]       = OS_TYPE

    system = payload.get("system", {})
    payload["machine_id"]     = system.get("machine_id")
    payload["serial"]         = system.get("serial")
    payload["manufacturer"]   = system.get("manufacturer")
    payload["model"]          = system.get("model")
    payload["mac_addresses"]  = system.get("mac_addrs")
    payload["device_category"]= results.get("device_classification", {}).get("category", "Unknown")

    headers = {
        "Content-Type":            "application/json",
        "X-NextBit-Owner":         owner_key,
        "X-NextBit-Probe-Version": PROBE_VERSION,
    }

    try:
        r = requests.post(SUBMIT_URL, json=payload, headers=headers, timeout=30)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Cannot reach NextBit server. Check network connection.")
    except requests.exceptions.Timeout:
        raise RuntimeError("Server timed out. The scan was saved locally.")
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response else "?"
        body   = e.response.text[:200] if e.response else ""
        if status == 401:
            raise RuntimeError("Invalid owner key. Re-run the probe and enter a valid NB-XXXXXXXX key.")
        if status == 403:
            raise RuntimeError("Owner key not authorized. Contact NextBit support.")
        raise RuntimeError(f"Server returned HTTP {status}: {body}")


# ══════════════════════════════════════════════════════════════════
# SECTION 1 — SYSTEM INFO
# ══════════════════════════════════════════════════════════════════
def collect_system():
    info = {}
    if IS_WINDOWS:
        info["manufacturer"] = safe(lambda: run("wmic computersystem get manufacturer",   shell=True).split("\n")[1].strip())
        info["model"]        = safe(lambda: run("wmic computersystem get model",          shell=True).split("\n")[1].strip())
        info["serial"]       = safe(lambda: run("wmic bios get serialnumber",             shell=True).split("\n")[1].strip())
        if info.get("serial") in ("N/A", None, "", "To be filled by O.E.M.", "Default string"):
            info["serial"] = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_BIOS).SerialNumber"', shell=True))
        info["bios_version"] = safe(lambda: run("wmic bios get smbiosbiosversion",        shell=True).split("\n")[1].strip())
        info["bios_date"]    = safe(lambda: run('powershell -Command (Get-CimInstance Win32_BIOS).ReleaseDate.ToString("yyyy-MM-dd")', shell=True))
        info["cpu"]          = safe(lambda: run("wmic cpu get name",                      shell=True).split("\n")[1].strip())
        info["cpu_cores"]    = safe(lambda: int(run("wmic cpu get numberofcores",          shell=True).split("\n")[1].strip()))
        info["cpu_threads"]  = safe(lambda: int(run("wmic cpu get numberoflogicalprocessors", shell=True).split("\n")[1].strip()))
        info["cpu_mhz"]      = safe(lambda: int(run("wmic cpu get maxclockspeed",          shell=True).split("\n")[1].strip()))
        info["ram_gb"]       = safe(lambda: round(int(run("wmic computersystem get totalphysicalmemory", shell=True).split("\n")[1].strip()) / 1e9, 1))
        info["os_name"]      = safe(lambda: run("wmic os get caption",                    shell=True).split("\n")[1].strip())
        info["os_build"]     = safe(lambda: run("wmic os get buildnumber",                shell=True).split("\n")[1].strip())
        info["os_arch"]      = safe(lambda: run("wmic os get osarchitecture",             shell=True).split("\n")[1].strip())
        info["install_date"] = safe(lambda: run('powershell -Command (Get-CimInstance Win32_OperatingSystem).InstallDate.ToString("yyyy-MM-dd")', shell=True))
        info["last_boot"]    = safe(lambda: run('powershell -Command (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString("yyyy-MM-dd HH:mm")', shell=True))
        info["cpu_arch"]     = platform.machine()
        # Ethernet presence
        eth_count = safe(lambda: int(run('powershell -Command "(Get-NetAdapter | Where-Object {$_.PhysicalMediaType -eq \'802.3\'}).Count"', shell=True)), 0)
        info["ethernet_adapters"] = eth_count
    elif IS_LINUX:
        info["manufacturer"]      = safe(lambda: open("/sys/class/dmi/id/sys_vendor").read().strip())
        info["model"]             = safe(lambda: open("/sys/class/dmi/id/product_name").read().strip())
        info["serial"]            = safe(lambda: run(["sudo", "dmidecode", "-s", "system-serial-number"]) or open("/sys/class/dmi/id/product_serial").read().strip())
        info["bios_version"]      = safe(lambda: open("/sys/class/dmi/id/bios_version").read().strip())
        info["bios_date"]         = safe(lambda: open("/sys/class/dmi/id/bios_date").read().strip())
        info["cpu"]               = safe(lambda: [l.split(":")[1].strip() for l in open("/proc/cpuinfo") if "model name" in l][0])
        info["cpu_cores"]         = safe(lambda: int(run(["nproc"])))
        info["cpu_threads"]       = safe(lambda: psutil.cpu_count(logical=True) if HAS_PSUTIL else "N/A")
        info["cpu_mhz"]           = safe(lambda: int(float([l.split(":")[1].strip() for l in open("/proc/cpuinfo") if "cpu MHz" in l][0])))
        info["ram_gb"]            = safe(lambda: round(int([l.split()[1] for l in open("/proc/meminfo") if "MemTotal" in l][0]) / 1e6, 1))
        info["os_name"]           = safe(lambda: run(["lsb_release", "-ds"]) or platform.version())
        info["os_build"]          = safe(lambda: platform.release())
        info["os_arch"]           = safe(lambda: platform.machine())
        info["install_date"]      = "N/A"
        info["last_boot"]         = safe(lambda: run(["who", "-b"]))
        info["cpu_arch"]          = platform.machine()
        # Count Ethernet NICs
        try:
            eth_count = len([d for d in os.listdir("/sys/class/net")
                             if os.path.exists(f"/sys/class/net/{d}/device")
                             and not d.startswith("wl")])
        except:
            eth_count = 0
        info["ethernet_adapters"] = eth_count
    elif IS_MACOS:
        info["manufacturer"]      = "Apple"
        info["model"]             = safe(lambda: run(["sysctl", "-n", "hw.model"]))
        info["serial"]            = safe(lambda: [l.split(":")[-1].strip() for l in (run(["ioreg", "-l"]) or "").split("\n") if "IOPlatformSerialNumber" in l][0])
        info["bios_version"]      = "EFI/UEFI"
        info["bios_date"]         = "N/A"
        info["cpu"]               = safe(lambda: run(["sysctl", "-n", "machdep.cpu.brand_string"]))
        info["cpu_cores"]         = safe(lambda: int(run(["sysctl", "-n", "hw.physicalcpu"])))
        info["cpu_threads"]       = safe(lambda: int(run(["sysctl", "-n", "hw.logicalcpu"])))
        info["cpu_mhz"]           = safe(lambda: int(int(run(["sysctl", "-n", "hw.cpufrequency"]) or 0) / 1e6))
        info["ram_gb"]            = safe(lambda: round(int(run(["sysctl", "-n", "hw.memsize"])) / 1e9, 1))
        sp = run(["sw_vers"]) or ""
        info["os_name"]           = safe(lambda: [l.split(":")[-1].strip() for l in sp.split("\n") if "ProductName" in l][0])
        info["os_build"]          = safe(lambda: [l.split(":")[-1].strip() for l in sp.split("\n") if "BuildVersion" in l][0])
        info["os_arch"]           = safe(lambda: platform.machine())
        info["install_date"]      = "N/A"
        info["last_boot"]         = safe(lambda: run(["last", "reboot"]))
        info["cpu_arch"]          = platform.machine()
        info["ethernet_adapters"] = 0  # populated by network section

    if HAS_PSUTIL:
        if is_na(info.get("ram_gb")):
            info["ram_gb"] = round(psutil.virtual_memory().total / 1e9, 1)
        if is_na(info.get("cpu_cores")):
            info["cpu_cores"] = psutil.cpu_count(logical=False)
        if is_na(info.get("cpu_threads")):
            info["cpu_threads"] = psutil.cpu_count(logical=True)

    info["hostname"]   = platform.node()
    info["os_type"]    = OS_TYPE
    info["os_version"] = platform.version()
    info["python"]     = platform.python_version()
    info["mac_addrs"]  = get_network_mac_addresses()
    info["mac_addr"]   = info["mac_addrs"][0] if info["mac_addrs"] else safe(lambda: ":".join(('%012X' % uuid.getnode())[i:i+2] for i in range(0, 12, 2)))
    info["machine_id"] = safe(get_machine_id)

    # QR codes
    qr_main_payload  = make_qr_payload("serial_machine_id",
        {"serial": info.get("serial"), "machine_id": info.get("machine_id")})
    qr_audit_payload = make_qr_payload("serial_machine_id_mac",
        {"serial": info.get("serial"), "machine_id": info.get("machine_id"), "mac_addrs": info.get("mac_addrs")})
    info["qr"] = {
        "serial_machine_id": make_qr_with_logo(qr_main_payload,  LOGO_PATH),
        "audit":             make_qr_with_logo(qr_audit_payload, LOGO_PATH),
    }

    # BIOS age — robust parser: MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY
    bios_age_years  = "N/A"
    bios_age_rating = ("N/A", "#78909c")
    if not is_na(info.get("bios_date")):
        try:
            from datetime import date
            bd_str = info["bios_date"].strip()
            bd = None
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
                try:
                    bd = datetime.strptime(bd_str[:10], fmt).date()
                    break
                except:
                    pass
            if bd is None:
                # fallback: extract numbers
                parts = re.findall(r'\d+', bd_str)
                if len(parts) >= 3:
                    nums = [int(x) for x in parts]
                    # Heuristic: 4-digit number is the year
                    year  = next((n for n in nums if 1990 < n < 2100), None)
                    rest  = [n for n in nums if n != year]
                    if year and len(rest) >= 2:
                        try: bd = date(year, rest[0], rest[1])
                        except:
                            try: bd = date(year, rest[1], rest[0])
                            except: pass

            if bd:
                bios_age_years  = round((date.today() - bd).days / 365.25, 1)
                bios_age_rating = rate(bios_age_years, 1, 2, 4, lower_is_better=True)
        except:
            pass
    info["bios_age_years"]  = bios_age_years
    info["bios_age_rating"] = bios_age_rating
    return info


# ══════════════════════════════════════════════════════════════════
# SECTION 2 — OEM LICENSE
# ══════════════════════════════════════════════════════════════════
def collect_oem():
    if not IS_WINDOWS:
        return {"oem_key": "N/A (Windows only)", "installed_last5": "N/A", "match": "N/A"}
    oem_key   = safe(lambda: run('powershell -Command (Get-CimInstance -Query "SELECT OA3xOriginalProductKey FROM SoftwareLicensingService").OA3xOriginalProductKey', shell=True))
    installed = safe(lambda: run('powershell -Command (Get-CimInstance SoftwareLicensingProduct | Where-Object {$_.PartialProductKey -and $_.Name -like "*Windows*"} | Select-Object -First 1).PartialProductKey', shell=True))
    match = "N/A"
    if not is_na(oem_key) and not is_na(installed):
        match = "MATCH" if oem_key.endswith(installed) else "MISMATCH"
    return {"oem_key": oem_key, "installed_last5": installed, "match": match}


# ══════════════════════════════════════════════════════════════════
# SECTION 3 — CPU THROTTLE
# ══════════════════════════════════════════════════════════════════
def collect_cpu_throttle(duration=10):
    base_mhz = stress_mhz = max_mhz = pct = "N/A"
    if IS_WINDOWS:
        base_mhz = safe(lambda: int(run("wmic cpu get currentclockspeed", shell=True).split("\n")[1].strip()))
        max_mhz  = safe(lambda: int(run("wmic cpu get maxclockspeed",     shell=True).split("\n")[1].strip()))
    elif IS_LINUX:
        base_mhz = safe(lambda: int(float([l.split(":")[1].strip() for l in open("/proc/cpuinfo") if "cpu MHz" in l][0])))
        max_mhz  = safe(lambda: int(int(open("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq").read().strip()) / 1000))
        if is_na(max_mhz): max_mhz = base_mhz
    elif IS_MACOS:
        base_mhz = safe(lambda: int(int(run(["sysctl", "-n", "hw.cpufrequency"]) or 0) / 1e6))
        max_mhz  = safe(lambda: int(int(run(["sysctl", "-n", "hw.cpufrequency_max"]) or 0) / 1e6))
    if HAS_PSUTIL:
        freq = psutil.cpu_freq()
        if freq:
            if is_na(base_mhz): base_mhz = int(freq.current)
            if is_na(max_mhz):  max_mhz  = int(freq.max or freq.current)

    end_time = time.time() + duration
    while time.time() < end_time:
        for i in range(30000): _ = math.sqrt(12345.678 * (i + 1))

    if IS_WINDOWS:
        stress_mhz = safe(lambda: int(run("wmic cpu get currentclockspeed", shell=True).split("\n")[1].strip()))
    elif IS_LINUX:
        stress_mhz = safe(lambda: int(float([l.split(":")[1].strip() for l in open("/proc/cpuinfo") if "cpu MHz" in l][0])))
    elif IS_MACOS and HAS_PSUTIL:
        freq = psutil.cpu_freq()
        stress_mhz = int(freq.current) if freq else "N/A"
    if is_na(stress_mhz) and HAS_PSUTIL:
        freq = psutil.cpu_freq()
        stress_mhz = int(freq.current) if freq else "N/A"

    if not is_na(stress_mhz) and not is_na(max_mhz):
        try: pct = round((int(stress_mhz) / int(max_mhz)) * 100, 1)
        except: pass

    rating = rate(pct, 95, 85, 70, lower_is_better=False) if not is_na(pct) else ("N/A", "#78909c")
    return {
        "base_mhz":   base_mhz,
        "stress_mhz": stress_mhz,
        "max_mhz":    max_mhz,
        "pct":        pct,
        "rating":     rating,
        "warning":    not is_na(pct) and float(pct) < 85,
    }


# ══════════════════════════════════════════════════════════════════
# SECTION 4 — RAM STABILITY + ECC
# ══════════════════════════════════════════════════════════════════
def collect_ram_test():
    errors  = 0
    block_mb = 256
    blocks   = min(4, max(1, int(psutil.virtual_memory().total / 1e9 / 2))) if HAS_PSUTIL else 2
    for _ in range(blocks):
        try:
            size = block_mb * 1024 * 1024
            arr  = bytearray(size)
            rng  = random.Random(42)
            for i in range(0, size, 4096): arr[i] = rng.randint(0, 255)
            rng2 = random.Random(42)
            for i in range(0, size, 4096):
                if arr[i] != rng2.randint(0, 255): errors += 1; break
            del arr
        except:
            errors += 1
    ecc = detect_ecc_ram()
    rating = ("EXCELLENT", "#00e676") if errors == 0 else ("VERY POOR", "#ef5350")
    return {
        "blocks":   blocks,
        "block_mb": block_mb,
        "errors":   errors,
        "result":   "PASS" if errors == 0 else f"ERRORS ({errors})",
        "rating":   rating,
        "ecc":      ecc,
    }


# ══════════════════════════════════════════════════════════════════
# SECTION 5 — BATTERY
# ══════════════════════════════════════════════════════════════════
def collect_battery():
    data = {
        "present": False, "percent": "N/A", "plugged_in": "N/A",
        "design_mwh": "N/A", "full_mwh": "N/A", "wear_pct": "N/A",
        "cycles": "N/A", "chemistry": "N/A", "status": "N/A",
        "rating": ("N/A", "#78909c"), "desc": "",
    }
    if HAS_PSUTIL:
        try:
            b = psutil.sensors_battery()
            if b:
                data["present"]    = True
                data["percent"]    = round(b.percent, 1)
                data["plugged_in"] = b.power_plugged
        except:
            pass

    if IS_WINDOWS:
        import tempfile
        tmp = os.path.join(tempfile.gettempdir(), f"nb_batt_{int(time.time())}.html")
        run(f"powercfg /batteryreport /output {tmp}", shell=True)
        time.sleep(0.8)
        if os.path.exists(tmp):
            try:
                html = open(tmp, encoding="utf-8", errors="replace").read()
                m = re.search(r'DESIGN CAPACITY[\s\S]*?(\d[\d,]+)\s*mWh', html)
                if m: data["design_mwh"] = int(m.group(1).replace(",", ""))
                m = re.search(r'FULL CHARGE CAPACITY[\s\S]*?(\d[\d,]+)\s*mWh', html)
                if m: data["full_mwh"] = int(m.group(1).replace(",", ""))
                m = re.search(r'CYCLE COUNT[\s\S]*?(\d+)', html)
                if m: data["cycles"] = int(m.group(1))
                if not is_na(data["design_mwh"]) and not is_na(data["full_mwh"]):
                    data["wear_pct"] = round(max(0, (1 - data["full_mwh"] / data["design_mwh"]) * 100), 1)
                os.remove(tmp)
            except:
                pass
        chem_map = {3:"Lead Acid",4:"NiCd",5:"NiMH",6:"Li-ion",7:"Zinc air",8:"Li-Polymer"}
        data["chemistry"] = safe(lambda: chem_map.get(int(run("powershell -Command (Get-CimInstance Win32_Battery).Chemistry", shell=True)), "Unknown"))
        data["status"]    = safe(lambda: run("powershell -Command (Get-CimInstance Win32_Battery).Status", shell=True))

    elif IS_LINUX:
        base = "/sys/class/power_supply"
        try:
            for entry in os.listdir(base):
                ep    = f"{base}/{entry}"
                cap_f = f"{ep}/capacity"
                if not os.path.exists(cap_f): continue
                data["present"] = True
                data["percent"] = int(open(cap_f).read().strip())
                status_f = f"{ep}/status"
                if os.path.exists(status_f):
                    st = open(status_f).read().strip()
                    data["plugged_in"] = st in ("Charging", "Full")
                    data["status"]     = st
                e_full_f  = f"{ep}/energy_full";  e_full_d = f"{ep}/energy_full_design"
                c_full_f  = f"{ep}/charge_full";  c_full_d = f"{ep}/charge_full_design"
                volt_f    = f"{ep}/voltage_now"
                if os.path.exists(e_full_f) and os.path.exists(e_full_d):
                    ef  = int(open(e_full_f).read().strip()) // 1000
                    efd = int(open(e_full_d).read().strip()) // 1000
                    data["full_mwh"]   = ef
                    data["design_mwh"] = efd
                    data["wear_pct"]   = round(max(0, (1 - ef/efd) * 100), 1) if efd > 0 else "N/A"
                elif os.path.exists(c_full_f) and os.path.exists(c_full_d) and os.path.exists(volt_f):
                    cf   = int(open(c_full_f).read().strip())
                    cfd  = int(open(c_full_d).read().strip())
                    volt = int(open(volt_f).read().strip()) / 1e6
                    data["full_mwh"]   = round(cf  * volt / 1e3)
                    data["design_mwh"] = round(cfd * volt / 1e3)
                    data["wear_pct"]   = round(max(0, (1 - cf/cfd) * 100), 1) if cfd > 0 else "N/A"
                cy_f = f"{ep}/cycle_count"
                if os.path.exists(cy_f): data["cycles"] = int(open(cy_f).read().strip())
                break
        except:
            pass

    wear   = data["wear_pct"] if not is_na(data["wear_pct"]) else 999
    cycles = data["cycles"]   if not is_na(data["cycles"])   else 999
    try:   wear   = float(wear)
    except: wear  = 999
    try:   cycles = int(cycles)
    except: cycles = 999

    if wear <= 10 and cycles < 300:
        data["rating"] = ("EXCELLENT", "#00e676"); data["desc"] = "Battery in excellent condition."
    elif wear <= 25 and cycles < 500:
        data["rating"] = ("GOOD",      "#29b6f6"); data["desc"] = "Good condition. Normal wear."
    elif wear <= 40 and cycles < 800:
        data["rating"] = ("POOR",      "#ffa726"); data["desc"] = "Significant wear. May need replacement soon."
    elif wear == 999 and not data["present"]:
        data["rating"] = ("N/A",       "#78909c"); data["desc"] = "No battery detected (desktop/server)."
    else:
        data["rating"] = ("VERY POOR", "#ef5350"); data["desc"] = "Battery heavily degraded. Replace immediately."
    return data


# ══════════════════════════════════════════════════════════════════
# SECTION 6 — DISK SMART (all disks)
# ══════════════════════════════════════════════════════════════════
def _find_disk_devices():
    """Returns list of block device paths to probe with smartctl."""
    devices = []
    if IS_LINUX:
        # NVMe first
        for d in sorted(glob.glob("/dev/nvme?n?")) + sorted(glob.glob("/dev/nvme?")):
            if d not in devices: devices.append(d)
        # SATA/SAS
        for d in sorted(glob.glob("/dev/sd?")):
            if d not in devices: devices.append(d)
        # Fallback
        if not devices:
            for d in ["/dev/sda", "/dev/nvme0n1", "/dev/hda"]:
                if os.path.exists(d): devices.append(d)
    elif IS_MACOS:
        devices = ["/dev/disk0", "/dev/disk1"]
    return devices[:6]  # cap at 6 devices


def collect_disks():
    disks = []
    smart_all = []  # per-disk SMART data
    smart = {
        "power_on_hours": "N/A", "wear": "N/A", "read_errors": "N/A",
        "write_errors": "N/A", "reallocated": "N/A",
        "power_rating": ("N/A", "#78909c"), "wear_rating": ("N/A", "#78909c"),
    }

    if HAS_PSUTIL:
        for p in psutil.disk_partitions(all=False):
            try:
                u = psutil.disk_usage(p.mountpoint)
                disks.append({
                    "device":     p.device,
                    "mountpoint": p.mountpoint,
                    "fstype":     p.fstype,
                    "total_gb":   round(u.total/1e9, 1),
                    "used_gb":    round(u.used/1e9,  1),
                    "free_gb":    round(u.free/1e9,  1),
                    "used_pct":   round(u.percent, 1),
                })
            except:
                continue

    if IS_WINDOWS:
        smart["power_on_hours"] = safe(lambda: run("powershell -Command (Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -First 1).PowerOnHours", shell=True))
        smart["wear"]           = safe(lambda: run("powershell -Command (Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -First 1).Wear", shell=True))
        smart["read_errors"]    = safe(lambda: run("powershell -Command (Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -First 1).ReadErrorsTotal", shell=True))
        smart["write_errors"]   = safe(lambda: run("powershell -Command (Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -First 1).WriteErrorsTotal", shell=True))
        # Try per-disk if multiple physical disks
        pd_out = safe(lambda: run("powershell -Command (Get-PhysicalDisk | Get-StorageReliabilityCounter | Select-Object -Property PowerOnHours,Wear,ReadErrorsTotal | ConvertTo-Json)", shell=True), "")
        if pd_out and pd_out != "N/A":
            try:
                pds = json.loads(pd_out)
                if isinstance(pds, dict): pds = [pds]
                for i, pd in enumerate(pds):
                    smart_all.append({
                        "device":          f"PhysicalDisk{i}",
                        "power_on_hours":  pd.get("PowerOnHours", "N/A"),
                        "wear":            pd.get("Wear", "N/A"),
                        "read_errors":     pd.get("ReadErrorsTotal", "N/A"),
                    })
            except:
                pass

    elif IS_LINUX or IS_MACOS:
        devices = _find_disk_devices()
        for dev in devices:
            sc = run(["sudo", "smartctl", "-A", dev], timeout=15)
            if not sc:
                continue
            disk_smart = {"device": dev, "power_on_hours": "N/A", "wear": "N/A",
                          "read_errors": "N/A", "reallocated": "N/A"}
            for line in sc.splitlines():
                up = line.upper()
                if "POWER_ON_HOURS" in up or "POWER ON HOURS" in up:
                    # Try raw value at end, then after colon
                    try:
                        v = int(line.split()[-1].replace(",", ""))
                        disk_smart["power_on_hours"] = v
                        if is_na(smart["power_on_hours"]): smart["power_on_hours"] = v
                    except: pass
                if "REALLOCATED_SECTOR" in up or "REALLOCATED SECTOR" in up:
                    try:
                        v = int(line.split()[-1])
                        disk_smart["reallocated"] = v
                        if is_na(smart["reallocated"]): smart["reallocated"] = v
                    except: pass
                if any(x in up for x in ("REPORTED_UNCORRECT","CURRENT_PENDING","OFFLINE_UNCORRECTABLE")):
                    try:
                        v = int(line.split()[-1])
                        disk_smart["read_errors"] = v
                        if is_na(smart["read_errors"]): smart["read_errors"] = v
                    except: pass
                if any(x in up for x in ("WEAR_LEVELING_COUNT","MEDIA_WEAROUT_INDICATOR","SSD_LIFE_LEFT","PERCENT_LIFETIME_REMAIN")):
                    try:
                        val = int(line.split()[3])  # VALUE column
                        wear_pct = round(100 - val, 1)
                        disk_smart["wear"] = wear_pct
                        if is_na(smart["wear"]): smart["wear"] = wear_pct
                    except: pass
            smart_all.append(disk_smart)

    if not is_na(smart["power_on_hours"]):
        smart["power_rating"] = rate(smart["power_on_hours"], 1000, 5000, 10000, lower_is_better=True)
    if not is_na(smart["wear"]):
        smart["wear_rating"] = rate(smart["wear"], 10, 30, 60, lower_is_better=True)
    elif not is_na(smart["reallocated"]):
        smart["wear_rating"] = rate(smart["reallocated"], 0, 5, 50, lower_is_better=True)

    return {"disks": disks, "smart": smart, "smart_all": smart_all}


# ══════════════════════════════════════════════════════════════════
# SECTION 7 — GPU
# ══════════════════════════════════════════════════════════════════
def collect_gpu():
    gpus = []; driver_date = "N/A"; crashes = 0; vram = "N/A"
    if IS_WINDOWS:
        names = safe(lambda: run("wmic path win32_videocontroller get name", shell=True))
        if names: gpus = [l.strip() for l in names.split("\n")[1:] if l.strip()]
        driver_date = safe(lambda: run('powershell -Command (Get-CimInstance Win32_VideoController | Select-Object -First 1).DriverDate.ToString("yyyy-MM-dd")', shell=True))
        vram_raw = safe(lambda: run("wmic path win32_videocontroller get adapterram", shell=True).split("\n")[1].strip())
        if not is_na(vram_raw):
            try: vram = f"{round(int(vram_raw)/1e9,1)} GB"
            except: pass
        try:
            ev = run('powershell -Command "Get-WinEvent -FilterHashtable @{LogName=\'System\';Level=1,2,3;StartTime=(Get-Date).AddDays(-30)} -MaxEvents 200 -ErrorAction SilentlyContinue | Where-Object {$_.Message -match \'display|nvlddmkm|atikmdag|igfx|gpu|dxgkrnl\'} | Measure-Object | Select-Object -ExpandProperty Count"', shell=True)
            if ev and ev.isdigit(): crashes = int(ev)
        except: pass
    elif IS_LINUX:
        lspci = run(["lspci"]) or ""
        gpus  = [l for l in lspci.split("\n") if any(x in l for x in ("VGA","3D","Display","GPU"))]
        if not gpus: gpus = ["Intel Integrated (lspci unavailable)"]
        # Try nvidia-smi for VRAM
        nsmi = run(["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"])
        if nsmi:
            try: vram = f"{round(int(nsmi.strip())/1024, 1)} GB"
            except: pass
    elif IS_MACOS:
        sp   = run(["system_profiler", "SPDisplaysDataType"]) or ""
        gpus = [l.strip() for l in sp.split("\n") if "Chipset" in l or "GPU" in l]

    gpu_name     = " / ".join(gpus) if gpus else "Unknown"
    is_dedicated = any(x in gpu_name.upper() for x in ("NVIDIA","AMD","RADEON","GEFORCE","RTX","GTX","QUADRO","ARC"))
    score = 0
    if not is_na(driver_date):
        try:
            from datetime import date
            bd = None
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
                try: bd = datetime.strptime(driver_date[:10], fmt).date(); break
                except: pass
            if bd:
                age_days = (date.today() - bd).days
                if age_days > 730:  score += 1
                if age_days > 1095: score += 1
        except: pass
    if crashes > 5: score += 2
    elif crashes > 0: score += 1

    if score <= 0:   gpu_rating = ("GOOD",      "#00e676"); gpu_desc = "GPU appears in good condition."
    elif score <= 2: gpu_rating = ("WARNING",   "#ffa726"); gpu_desc = "GPU shows some wear or outdated drivers."
    else:            gpu_rating = ("CONCERNING","#ef5350"); gpu_desc = "GPU may have issues — check drivers and crash logs."
    return {
        "gpus": gpus, "gpu_name": gpu_name, "is_dedicated": is_dedicated,
        "driver_date": driver_date, "vram": vram, "crashes": crashes,
        "rating": gpu_rating, "desc": gpu_desc,
    }


# ══════════════════════════════════════════════════════════════════
# SECTION 8 — DISPLAY
# ══════════════════════════════════════════════════════════════════
def collect_display():
    info = {"manufacturer":"N/A","model":"N/A","connection":"N/A",
            "resolution":"N/A","refresh_hz":"N/A"}
    if IS_WINDOWS:
        info["model"]      = safe(lambda: run('powershell -Command "-join ((Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorID | Select-Object -First 1).UserFriendlyName | ForEach-Object {if($_ -gt 0){[char]$_}})"', shell=True))
        info["resolution"] = safe(lambda: run('powershell -Command "$v=Get-CimInstance Win32_VideoController|Select-Object -First 1;\'$($v.CurrentHorizontalResolution) x $($v.CurrentVerticalResolution)\'"', shell=True))
        info["refresh_hz"] = safe(lambda: run("powershell -Command (Get-CimInstance Win32_VideoController|Select-Object -First 1).CurrentRefreshRate", shell=True))
    elif IS_LINUX:
        xr = run(["xrandr", "--current"])
        if xr:
            for line in xr.split("\n"):
                if " connected" in line:
                    m = re.search(r'(\d+x\d+)\+', line)
                    if m: info["resolution"] = m.group(1)
                    info["model"] = line.split()[0]
    elif IS_MACOS:
        sp = run(["system_profiler", "SPDisplaysDataType"]) or ""
        for line in sp.split("\n"):
            if "Resolution" in line: info["resolution"] = line.split(":")[-1].strip()
    return info


# ══════════════════════════════════════════════════════════════════
# SECTION 9 — TEMPERATURE
# ══════════════════════════════════════════════════════════════════
def collect_temperature():
    temps = {}
    if HAS_PSUTIL:
        try:
            for key, entries in psutil.sensors_temperatures().items():
                for e in entries:
                    temps[e.label or key] = e.current
        except:
            pass
    if IS_WINDOWS and not temps:
        raw = safe(lambda: run('powershell -Command "(Get-CimInstance -Namespace root\\WMI -ClassName MSAcpi_ThermalZoneTemperature | Select-Object -First 1).CurrentTemperature"', shell=True))
        if not is_na(raw):
            try: temps["CPU"] = round((int(raw)/10) - 273.15, 1)
            except: pass
    elif IS_LINUX and not temps:
        for f in ["/sys/class/thermal/thermal_zone0/temp", "/sys/class/hwmon/hwmon0/temp1_input"]:
            if os.path.exists(f):
                try: temps["CPU"] = round(int(open(f).read().strip()) / 1000, 1)
                except: pass
    if not temps:
        return {"temps": {}, "max_temp": "N/A", "rating": ("N/A", "#78909c")}
    max_t = max(temps.values())
    return {"temps": temps, "max_temp": max_t, "rating": rate(max_t, 45, 65, 85, lower_is_better=True)}


# ══════════════════════════════════════════════════════════════════
# SECTION 10 — NETWORK
# ══════════════════════════════════════════════════════════════════
def collect_network():
    wifi_name = wifi_signal = ethernet = "N/A"
    ifaces = []; internet = False; ping_ms = "N/A"
    if HAS_PSUTIL:
        try:
            for name, addrs in psutil.net_if_addrs().items():
                for addr in addrs:
                    if addr.family == socket.AF_INET and not addr.address.startswith("127."):
                        ifaces.append({"interface": name, "ip": addr.address, "netmask": addr.netmask})
        except:
            pass
    if IS_WINDOWS:
        wifi_name   = safe(lambda: [l.split(":")[-1].strip() for l in (run("netsh wlan show interfaces", shell=True) or "").split("\n") if "SSID" in l and "BSSID" not in l][0])
        wifi_signal = safe(lambda: [l.split(":")[-1].strip() for l in (run("netsh wlan show interfaces", shell=True) or "").split("\n") if "Signal" in l][0])
        # Ethernet status
        eth_out = safe(lambda: run('powershell -Command "Get-NetAdapter | Where-Object {$_.PhysicalMediaType -eq \'802.3\' -and $_.Status -eq \'Up\'} | Select-Object -First 1 -ExpandProperty Name"', shell=True), "")
        ethernet = eth_out if not is_na(eth_out) else "Not connected"
    elif IS_LINUX:
        wifi_name = safe(lambda: run(["iwgetid", "-r"]))
        try:
            m = re.search(r'Signal level=(-\d+)', run(["iwconfig"]) or "")
            if m: wifi_signal = m.group(1) + " dBm"
        except:
            pass
        # Ethernet: look for carrier-on wired interfaces
        try:
            for iface in os.listdir("/sys/class/net"):
                carrier_f = f"/sys/class/net/{iface}/carrier"
                type_f    = f"/sys/class/net/{iface}/type"
                if iface.startswith("e") and os.path.exists(carrier_f):
                    if open(carrier_f).read().strip() == "1":
                        ethernet = iface
                        break
        except:
            pass
    elif IS_MACOS:
        wifi_info = run(["/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport", "-I"])
        if wifi_info:
            for line in wifi_info.split("\n"):
                if " SSID:" in line:     wifi_name   = line.split(":")[-1].strip()
                if "agrCtlRSSI" in line: wifi_signal = line.split(":")[-1].strip() + " dBm"
    try:
        start = time.time()
        s = socket.create_connection(("8.8.8.8", 53), timeout=3)
        s.close()
        internet = True
        ping_ms  = round((time.time() - start) * 1000, 1)
    except:
        pass
    return {
        "wifi_name": wifi_name, "wifi_signal": wifi_signal, "ethernet": ethernet,
        "ifaces": ifaces, "internet": internet, "ping_ms": ping_ms,
        "mac": safe(lambda: ":".join(('%012X' % uuid.getnode())[i:i+2] for i in range(0, 12, 2))),
    }


# ══════════════════════════════════════════════════════════════════
# SECTION 11 — PERIPHERALS
# ══════════════════════════════════════════════════════════════════
def collect_peripherals():
    data = {"webcam":"N/A","bluetooth":"N/A","audio":"N/A",
            "keyboard":"N/A","touchpad":"N/A","usb_count":"N/A","fan":"N/A"}
    if IS_WINDOWS:
        data["webcam"]    = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_PnPEntity | Where-Object {$_.PNPClass -eq \'Camera\'} | Select-Object -First 1).Name"', shell=True))
        data["bluetooth"] = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_PnPEntity | Where-Object {$_.PNPClass -eq \'Bluetooth\'} | Select-Object -First 1).Name"', shell=True))
        data["audio"]     = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_SoundDevice | Select-Object -First 1).Name"', shell=True))
        data["keyboard"]  = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_Keyboard | Select-Object -First 1).Description"', shell=True))
        data["usb_count"] = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_USBController | Measure-Object).Count"', shell=True))
    elif IS_LINUX:
        lsusb = run(["lsusb"]) or ""
        data["webcam"]    = "Detected" if any(x in lsusb.lower() for x in ("camera","webcam","video")) else "Not detected"
        data["bluetooth"] = "Detected" if "bluetooth" in lsusb.lower() or os.path.exists("/sys/class/bluetooth") else "Not detected"
        data["audio"]     = safe(lambda: run(["aplay", "-l"]))
        data["keyboard"]  = safe(lambda: run(["xinput", "--list"]))
        data["usb_count"] = len([l for l in lsusb.split("\n") if l.strip()])
        fan_files = []
        try:
            for root, dirs, files in os.walk("/sys/class/hwmon"):
                for f in files:
                    if f.startswith("fan") and f.endswith("_input"): fan_files.append(os.path.join(root, f))
        except:
            pass
        if fan_files:
            try: data["fan"] = f"{int(open(fan_files[0]).read().strip())} RPM"
            except: data["fan"] = "Detected (no RPM)"
        else:
            data["fan"] = "Not detected via sysfs"
    elif IS_MACOS:
        sp = run(["system_profiler", "SPUSBDataType"]) or ""
        data["webcam"]    = "Detected" if "camera" in sp.lower() or "facetime" in sp.lower() else "Check manually"
        data["bluetooth"] = safe(lambda: [l.strip() for l in (run(["system_profiler","SPBluetoothDataType"]) or "").split("\n") if "State" in l][0])
        data["usb_count"] = len(re.findall(r'Product ID:', sp))
    return data


# ══════════════════════════════════════════════════════════════════
# SECTION 12 — OS & SECURITY
# ══════════════════════════════════════════════════════════════════
def collect_security():
    data = {"activated":"N/A","antivirus":"N/A","firewall":"N/A",
            "tpm":"N/A","secure_boot":"N/A","bitlocker":"N/A"}
    if IS_WINDOWS:
        data["activated"]   = safe(lambda: "Activated" if "1" == run('powershell -Command "(Get-CimInstance SoftwareLicensingProduct | Where-Object {$_.PartialProductKey -and $_.Name -like \'*Windows*\'} | Select-Object -First 1).LicenseStatus"', shell=True) else "Not Activated")
        data["antivirus"]   = safe(lambda: "Defender Active" if "True" == run('powershell -Command "(Get-MpComputerStatus).RealTimeProtectionEnabled"', shell=True) else "Check manually")
        data["firewall"]    = safe(lambda: "Enabled" if run('powershell -Command "(Get-NetFirewallProfile | Where-Object {$_.Enabled}).Name"', shell=True) else "Disabled")
        data["tpm"]         = safe(lambda: run('powershell -Command "(Get-CimInstance -Namespace root\\cimv2\\security\\microsofttpm -ClassName Win32_Tpm).SpecVersion"', shell=True))
        data["secure_boot"] = safe(lambda: "Enabled" if "True" == run('powershell -Command "Confirm-SecureBootUEFI"', shell=True) else "Disabled")
        data["bitlocker"]   = safe(lambda: run('powershell -Command "(Get-BitLockerVolume -MountPoint C:).ProtectionStatus"', shell=True))
    elif IS_LINUX:
        data["firewall"]    = safe(lambda: "Active" if "active" in (run(["sudo","ufw","status"]) or "").lower() else "Inactive")
        data["secure_boot"] = safe(lambda: "Enabled" if "enabled" in (run(["mokutil","--sb-state"]) or "").lower() else "Disabled/N/A")
        data["tpm"]         = "Detected" if os.path.exists("/dev/tpm0") or os.path.exists("/dev/tpmrm0") else "Not found"
        data["antivirus"]   = safe(lambda: "ClamAV" if run(["which","clamscan"]) else "None detected")
    elif IS_MACOS:
        data["firewall"]    = safe(lambda: "Enabled" if "1" in (run(["defaults","read","/Library/Preferences/com.apple.alf","globalstate"]) or "") else "Disabled")
        data["tpm"]         = "Secure Enclave (T2/M-series)"
        data["secure_boot"] = "Supported (check Security Utility)"
    return data


# ══════════════════════════════════════════════════════════════════
# SECTION 13 — PERFORMANCE
# ══════════════════════════════════════════════════════════════════
def collect_performance():
    data = {
        "process_count":  "N/A",
        "cpu_pct":        "N/A",
        "mem_pct":        "N/A",
        "startup_count":  "N/A",
        "startup_rating": ("N/A","#78909c"),
        "top_procs":      [],
        "disk_read_mbs":  "N/A",
        "disk_write_mbs": "N/A",
    }
    if HAS_PSUTIL:
        try:
            data["process_count"] = len(psutil.pids())
            data["cpu_pct"]       = psutil.cpu_percent(interval=2)
            data["mem_pct"]       = psutil.virtual_memory().percent
            procs = []
            for p in psutil.process_iter(["name","memory_info","pid"]):
                try: procs.append((p.info["name"], round(p.info["memory_info"].rss/1e6,1)))
                except: pass
            data["top_procs"] = sorted(procs, key=lambda x: x[1], reverse=True)[:5]
            try:
                io1 = psutil.disk_io_counters()
                time.sleep(1)
                io2 = psutil.disk_io_counters()
                if io1 and io2:
                    data["disk_read_mbs"]  = round((io2.read_bytes  - io1.read_bytes)  / 1e6, 1)
                    data["disk_write_mbs"] = round((io2.write_bytes - io1.write_bytes) / 1e6, 1)
            except:
                pass
        except:
            pass

    if IS_WINDOWS:
        sc = safe(lambda: run('powershell -Command "(Get-CimInstance Win32_StartupCommand | Measure-Object).Count"', shell=True))
        try:
            data["startup_count"]  = int(sc)
            data["startup_rating"] = rate(int(sc), 10, 25, 50, lower_is_better=True)
        except:
            pass
    elif IS_LINUX:
        sc = safe(lambda: run(["systemctl","list-unit-files","--state=enabled","--no-pager"]))
        if sc:
            data["startup_count"]  = len([l for l in sc.split("\n") if "enabled" in l])
            data["startup_rating"] = rate(data["startup_count"], 20, 40, 80, lower_is_better=True)
    return data


# ══════════════════════════════════════════════════════════════════
# SECTION 14 — EVENT LOG
# ══════════════════════════════════════════════════════════════════
def collect_events():
    count = 0; events = []
    if IS_WINDOWS:
        out = safe(lambda: run('powershell -Command "Get-WinEvent -FilterHashtable @{LogName=\'System\';Level=1,2;StartTime=(Get-Date).AddHours(-48)} -MaxEvents 20 -ErrorAction SilentlyContinue | Select-Object TimeCreated,Id,Message | ConvertTo-Json"', shell=True))
        if out and out != "N/A":
            try:
                evts = json.loads(out)
                if isinstance(evts, dict): evts = [evts]
                count  = len(evts)
                events = [{"time": e.get("TimeCreated",""), "id": e.get("Id",""), "msg": (e.get("Message","")[:120]+"...")} for e in evts[:5]]
            except:
                pass
    elif IS_LINUX:
        out = run(["journalctl","-p","err","-n","20","--no-pager","--since","48 hours ago"]) or ""
        events_raw = [l for l in out.split("\n") if l.strip()]
        count  = len(events_raw)
        events = [{"msg": l[:120]} for l in events_raw[:5]]
    elif IS_MACOS:
        out = run(["log","show","--predicate","messageType == 16","--last","48h","--info"]) or ""
        count = len([l for l in out.split("\n") if l.strip()])
    return {"count": count, "events": events, "rating": rate(count, 0, 3, 10, lower_is_better=True)}


# ══════════════════════════════════════════════════════════════════
# SCORING ENGINE  (with category breakdown)
# ══════════════════════════════════════════════════════════════════
def compute_score(results):
    checks = []

    def add(name, passed, detail, weight=1, missing=False, category="hardware"):
        checks.append({
            "name":     name,
            "passed":   passed,
            "detail":   detail,
            "weight":   weight,
            "missing":  missing,
            "category": category,
        })

    s    = results.get("system",               {})
    oem  = results.get("oem",                  {})
    cpu  = results.get("cpu_throttle",          {})
    ram  = results.get("ram_test",             {})
    bat  = results.get("battery",              {})
    dsk  = results.get("disks",               {})
    gpu  = results.get("gpu",                 {})
    tmp  = results.get("temperature",          {})
    net  = results.get("network",             {})
    sec  = results.get("security",            {})
    evt  = results.get("events",              {})
    per  = results.get("performance",         {})
    virt = results.get("virtualization",      {})
    dc   = results.get("device_classification",{})

    # ── BIOS Age ──────────────────────────────────────────────────
    by = s.get("bios_age_years","N/A")
    if is_na(by):
        add("BIOS Age", False, "Could not read BIOS date", weight=1, missing=True, category="hardware")
    else:
        add("BIOS Age", float(by) < 4, f"{by} years", weight=1, category="hardware")

    # ── OEM Key ───────────────────────────────────────────────────
    add("OEM Key Match", oem.get("match") in ("MATCH","N/A"),
        oem.get("match","N/A"), weight=2, category="software")

    # ── CPU Throttle ──────────────────────────────────────────────
    pct = cpu.get("pct","N/A")
    if is_na(pct):
        add("CPU Throttle", False, "Could not measure — run as admin", weight=2, missing=True, category="hardware")
    else:
        add("CPU Throttle", float(pct) >= 70, f"Held {pct}% of max clock", weight=2, category="hardware")

    # ── RAM Stability ─────────────────────────────────────────────
    add("RAM Stability", ram.get("errors",0) == 0, ram.get("result","N/A"), weight=2, category="hardware")

    # ── Battery Wear ──────────────────────────────────────────────
    # Skip battery check for servers and desktops
    cat = dc.get("category","Unknown")
    if cat in ("Server","VM"):
        add("Battery", True, f"N/A ({cat} — battery not expected)", weight=1, category="hardware")
    else:
        wear = bat.get("wear_pct","N/A")
        if is_na(wear):
            if bat.get("present", False):
                add("Battery Wear", False, "Battery present but data unreadable", weight=3, missing=True, category="hardware")
            else:
                add("Battery Wear", True, "No battery (desktop)", weight=3, category="hardware")
        else:
            add("Battery Wear", float(wear) < 30,
                f"Wear {wear}% | Cycles {bat.get('cycles','N/A')}", weight=3, category="hardware")

    # ── Disk Power-On Hours ───────────────────────────────────────
    smart = dsk.get("smart",{})
    poh   = smart.get("power_on_hours","N/A")
    if is_na(poh):
        add("Disk Power-On", False, "SMART unreadable — install smartmontools / run as admin", weight=3, missing=True, category="hardware")
    else:
        add("Disk Power-On", int(poh) < 10000,
            f"{poh} hrs — {smart.get('power_rating',('N/A',''))[0]}", weight=3, category="hardware")

    # ── Disk Wear ─────────────────────────────────────────────────
    w = smart.get("wear","N/A")
    if is_na(w):
        add("Disk Wear", False, "Wear data unreadable — run as admin", weight=3, missing=True, category="hardware")
    else:
        add("Disk Wear", float(w) < 30,
            f"Wear {w}% | Read err {smart.get('read_errors','N/A')}", weight=3, category="hardware")

    # ── GPU Condition ─────────────────────────────────────────────
    gpu_rating = gpu.get("rating",("N/A",""))[0]
    add("GPU Condition", gpu_rating in ("GOOD","N/A"),
        f"{gpu_rating} — Crashes {gpu.get('crashes',0)}", weight=2, category="hardware")

    # ── Temperature ───────────────────────────────────────────────
    mt = tmp.get("max_temp","N/A")
    if is_na(mt):
        add("Temperature", False, "Sensors unreadable — run as admin", weight=1, missing=True, category="hardware")
    else:
        add("Temperature", float(mt) < 85, f"{mt}°C", weight=1, category="hardware")

    # ── Internet ──────────────────────────────────────────────────
    add("Internet", net.get("internet",False),
        f"Ping {net.get('ping_ms','N/A')} ms", weight=1, category="software")

    # ── OS Activation ─────────────────────────────────────────────
    add("OS Activation", sec.get("activated") in ("Activated","N/A"),
        sec.get("activated","N/A"), weight=2, category="security")

    # ── Antivirus ─────────────────────────────────────────────────
    add("Antivirus", sec.get("antivirus") not in ("None detected","N/A"),
        sec.get("antivirus","N/A"), weight=1, category="security")

    # ── Firewall ──────────────────────────────────────────────────
    add("Firewall", sec.get("firewall","") in ("Enabled","Active"),
        sec.get("firewall","N/A"), weight=1, category="security")

    # ── System Errors ─────────────────────────────────────────────
    cnt = evt.get("count",0)
    add("System Errors", cnt == 0, f"{cnt} critical errors (48h)", weight=2, category="software")

    # ── Machine Speed ─────────────────────────────────────────────
    cpu_pct = per.get("cpu_pct","N/A")
    mem_pct = per.get("mem_pct","N/A")
    if not is_na(cpu_pct) and not is_na(mem_pct):
        speed_ok = float(cpu_pct) < 80 and float(mem_pct) < 85
        add("Machine Load", speed_ok,
            f"CPU {cpu_pct}% | RAM {mem_pct}% at scan time", weight=2, category="software")
    else:
        add("Machine Load", False, "Could not measure load", weight=2, missing=True, category="software")

    # ── Scoring ───────────────────────────────────────────────────
    total_w   = sum(c["weight"] for c in checks)
    earned_w  = sum(c["weight"] for c in checks if c["passed"] and not c["missing"])
    missing_w = sum(c["weight"] for c in checks if c["missing"])
    na_pct    = round((missing_w / total_w) * 100) if total_w else 0
    score_pct = round((earned_w / total_w) * 100) if total_w else 0

    if na_pct >= 50:  score_pct = min(score_pct, 40)
    elif na_pct >= 30: score_pct = min(score_pct, 55)
    elif na_pct >= 15: score_pct = min(score_pct, 70)

    if   score_pct >= 85: overall = "EXCELLENT"; color = "#00e676"
    elif score_pct >= 70: overall = "GOOD";      color = "#29b6f6"
    elif score_pct >= 50: overall = "POOR";      color = "#ffa726"
    else:                 overall = "VERY POOR"; color = "#ef5350"

    # Per-category scores
    cat_scores = {}
    for cat in ("hardware","software","security"):
        cc = [c for c in checks if c["category"] == cat]
        tw = sum(c["weight"] for c in cc)
        ew = sum(c["weight"] for c in cc if c["passed"] and not c["missing"])
        cat_scores[cat] = round((ew/tw)*100) if tw else 0

    return {
        "checks":      checks,
        "earned":      earned_w,
        "total":       total_w,
        "pct":         score_pct,
        "overall":     overall,
        "color":       color,
        "na_pct":      na_pct,
        "cat_scores":  cat_scores,
    }


# ══════════════════════════════════════════════════════════════════
# HTML REPORT (v4 — adds VM banner, device category, category bars,
#              multi-disk SMART table, ECC badge, RAID section)
# ══════════════════════════════════════════════════════════════════
def generate_html_report(results, score, device_id=None, scan_id=None):
    ts    = results.get("timestamp","")
    sys_i = results.get("system",{})
    bat   = results.get("battery",{})
    gpu   = results.get("gpu",{})
    dsk   = results.get("disks",{})
    cpu_t = results.get("cpu_throttle",{})
    ram_t = results.get("ram_test",{})
    net   = results.get("network",{})
    sec   = results.get("security",{})
    per   = results.get("peripherals",{})
    tmp   = results.get("temperature",{})
    evt   = results.get("events",{})
    oem   = results.get("oem",{})
    perf  = results.get("performance",{})
    virt  = results.get("virtualization",{})
    dc    = results.get("device_classification",{})
    raid  = results.get("raid_controllers",[])
    ecc   = ram_t.get("ecc",{})

    qr_main  = sys_i.get("qr",{}).get("serial_machine_id") or ""
    qr_audit = sys_i.get("qr",{}).get("audit") or ""
    qr_main_html  = f'<img src="{qr_main}"  style="width:100%;max-width:220px;display:block;margin:0 auto" />'  if qr_main  else '<p style="color:#78909c;font-size:12px">QR unavailable</p>'
    qr_audit_html = f'<img src="{qr_audit}" style="width:100%;max-width:220px;display:block;margin:0 auto" />' if qr_audit else '<p style="color:#78909c;font-size:12px">QR unavailable</p>'

    ol  = score["overall"]
    oc  = score.get("color","#78909c")
    bl, bc = bat.get("rating",("N/A","#78909c"))
    gl, gc = gpu.get("rating",("N/A","#78909c"))
    dl, dc_color = dsk.get("smart",{}).get("power_rating",("N/A","#78909c"))
    cl, cc = cpu_t.get("rating",("N/A","#78909c"))
    rl, rc = ram_t.get("rating",("N/A","#78909c"))
    passed = sum(1 for c in score["checks"] if c["passed"])
    failed = len(score["checks"]) - passed
    na_pct = score.get("na_pct",0)
    cat_sc = score.get("cat_scores",{})

    # VM warning banner
    vm_banner = ""
    if virt.get("is_vm"):
        vm_banner = f"""
<div style="background:#ffa72618;border:1px solid #ffa72640;border-radius:12px;padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
  <span style="font-size:24px">⚠</span>
  <div>
    <div style="font-weight:700;color:#ffa726">Virtual Machine Detected</div>
    <div style="font-size:12px;color:#78909c;margin-top:2px">Hypervisor: {virt.get('hypervisor','Unknown')} · Hardware readings may reflect host, not VM. SMART/battery checks are not meaningful inside VMs.</div>
  </div>
</div>"""

    # Device category badge color
    cat_colors = {"Laptop":"#00d4b4","Desktop":"#29b6f6","Server":"#ffa726","VM":"#ef5350","Unknown":"#78909c"}
    cat_color  = cat_colors.get(dc.get("category","Unknown"),"#78909c")
    cat_icon   = {"Laptop":"💻","Desktop":"🖥️","Server":"🖧","VM":"☁","Unknown":"??"}.get(dc.get("category","Unknown"),"??")

    # Data-missing warning
    na_warning = ""
    if na_pct > 0:
        na_warning = f'<div style="background:#ffa72618;border:1px solid #ffa72640;border-radius:10px;padding:10px 16px;margin-bottom:12px;font-size:12px;color:#ffa726">⚠ {na_pct}% of data could not be read — score is capped. Run as Administrator/sudo for full results.</div>'

    # Previously scanned banner
    last_seen   = results.get("_last_seen","")
    scan_count  = results.get("_scan_count","")
    device_banner = ""
    if device_id:
        is_new    = results.get("_is_new_device",False)
        tag_color = "#00e676" if is_new else "#29b6f6"
        tag_label = "NEW DEVICE REGISTERED" if is_new else "PREVIOUSLY SCANNED DEVICE"
        prev_info = ""
        if not is_new and last_seen:
            prev_info = f"<div style='font-size:11px;color:#78909c;margin-top:4px'>Last scanned: {last_seen}" + (f" · Total scans: {scan_count}" if scan_count else "") + "</div>"
        device_banner = f"""
<div style="background:{tag_color}12;border:1px solid {tag_color}40;border-radius:12px;padding:16px 24px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
  <div>
    <div style="font-family:monospace;font-size:11px;color:#78909c;letter-spacing:1px">DEVICE ID</div>
    <div style="font-family:monospace;font-size:20px;font-weight:700;color:{tag_color}">{device_id}</div>
    {"<div style='font-family:monospace;font-size:11px;color:#78909c;margin-top:4px'>SCAN ID: " + scan_id + "</div>" if scan_id else ""}
    {prev_info}
  </div>
  <span style="background:{tag_color}20;color:{tag_color};border:1px solid {tag_color}50;padding:6px 16px;border-radius:20px;font-family:monospace;font-size:11px;font-weight:700">{tag_label}</span>
</div>"""

    # Check rows
    check_rows = "".join(
        f'<tr>'
        f'<td style="color:{"#00e676" if c["passed"] else "#ef5350" if not c.get("missing") else "#ffa726"};font-weight:bold">{"✔" if c["passed"] else "⚠" if c.get("missing") else "✘"}</td>'
        f'<td>{c["name"]}</td><td>×{c["weight"]}</td>'
        f'<td><span style="font-size:9px;background:#ffffff0a;border-radius:4px;padding:2px 6px;color:#78909c">{c.get("category","").upper()}</span></td>'
        f'<td>{c["detail"]}</td>'
        f'</tr>'
        for c in score["checks"]
    )

    disk_rows = "".join(
        f'<tr><td>{d.get("device","")}</td><td>{d.get("mountpoint","")}</td>'
        f'<td>{d.get("total_gb","")}GB</td><td>{d.get("free_gb","")}GB</td>'
        f'<td style="color:{"#ef5350" if d.get("used_pct",0)>90 else "#ffa726" if d.get("used_pct",0)>75 else "#00e676"}">'
        f'{d.get("used_pct","")}%</td></tr>'
        for d in dsk.get("disks",[])
        if not d.get("device","").startswith("/dev/loop")
    )

    # Multi-disk SMART table
    smart_rows = ""
    if dsk.get("smart_all"):
        smart_rows = "<br><table><tr><th>Device</th><th>Power-On Hrs</th><th>Wear %</th><th>Read Errors</th><th>Reallocated</th></tr>"
        for sd in dsk.get("smart_all",[]):
            poh  = sd.get("power_on_hours","N/A")
            wear = sd.get("wear","N/A")
            re_  = sd.get("read_errors","N/A")
            real = sd.get("reallocated","N/A")
            poh_color  = "#ef5350" if not is_na(poh)  and int(poh)  > 10000 else "#ffa726" if not is_na(poh)  and int(poh)  > 5000 else "#00e676"
            wear_color = "#ef5350" if not is_na(wear) and float(wear) > 60   else "#ffa726" if not is_na(wear) and float(wear) > 30 else "#00e676"
            smart_rows += f'<tr><td style="font-family:monospace">{sd.get("device","")}</td><td style="color:{poh_color}">{poh}</td><td style="color:{wear_color}">{wear}</td><td>{re_}</td><td>{real}</td></tr>'
        smart_rows += "</table>"

    temp_rows = "".join(
        f'<tr><td>{lbl}</td><td style="color:{"#ef5350" if v>85 else "#ffa726" if v>65 else "#00e676"}">{v}°C</td></tr>'
        for lbl, v in tmp.get("temps",{}).items()
    )
    batt_gauge = max(0, 100 - (float(bat.get("wear_pct",0)) if not is_na(bat.get("wear_pct")) else 0))

    # Category score bars
    hw_pct  = cat_sc.get("hardware", 0)
    sw_pct  = cat_sc.get("software", 0)
    sec_pct = cat_sc.get("security", 0)

    def _bar_color(p):
        if p >= 85: return "#00e676"
        if p >= 70: return "#29b6f6"
        if p >= 50: return "#ffa726"
        return "#ef5350"

    # RAID section
    raid_html = ""
    if raid:
        raid_html = "<div class='card'><h3>RAID / SAS Controllers</h3>"
        for r in raid:
            raid_html += f'<div class="kv"><span class="k">Controller</span><span class="v">{r}</span></div>'
        raid_html += "</div>"

    # ECC badge
    ecc_color = "#00e676" if ecc.get("has_ecc") else "#78909c"
    ecc_label = "ECC RAM ✓" if ecc.get("has_ecc") else "No ECC"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NextBit Probe v4 — {ts}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;600;700&display=swap');
:root{{--bg:#080c14;--panel:#0d1524;--border:rgba(0,212,180,.12);--accent:#00d4b4;--text:#e2e8f0;--muted:#64748b}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;padding:24px}}
.wrap{{max-width:1100px;margin:0 auto}}
.header{{text-align:center;padding:32px 0 24px}}
.header h1{{font-family:'Space Mono',monospace;font-size:clamp(18px,4vw,28px);color:var(--accent);letter-spacing:3px;text-transform:uppercase}}
.header p{{color:var(--muted);margin-top:8px;font-size:13px}}
.hero{{background:linear-gradient(135deg,{oc}18,{oc}08);border:1px solid {oc}40;border-radius:16px;padding:28px;text-align:center;margin-bottom:20px}}
.score-big{{font-family:'Space Mono',monospace;font-size:clamp(32px,6vw,60px);font-weight:700;color:{oc}}}
.score-label{{color:{oc};font-size:16px;font-weight:600;margin-top:6px;text-transform:uppercase;letter-spacing:2px}}
.bar-wrap{{background:rgba(255,255,255,.06);border-radius:8px;height:8px;margin:14px auto;max-width:480px;overflow:hidden}}
.bar{{height:100%;border-radius:8px;background:{oc}}}
.g4{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}}
.g2{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}}
.g3{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}}
.stat{{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center}}
.stat .n{{font-family:'Space Mono',monospace;font-size:20px;font-weight:700;margin-bottom:4px}}
.stat .l{{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:1px}}
.card{{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:14px}}
.card h3{{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--accent);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border)}}
.kv{{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)}}
.kv:last-child{{border-bottom:none}}
.kv .k{{color:var(--muted);font-size:12px}}.kv .v{{font-size:13px;font-weight:600;text-align:right;max-width:65%}}
.gauge-wrap{{background:rgba(255,255,255,.06);border-radius:8px;height:12px;overflow:hidden;margin:8px 0}}
.gauge{{height:100%;border-radius:8px}}
.badge{{display:inline-block;padding:5px 16px;border-radius:20px;font-family:'Space Mono',monospace;font-weight:700;font-size:12px;letter-spacing:1px}}
.cat-bar-row{{display:flex;align-items:center;gap:10px;margin:6px 0}}
.cat-bar-label{{font-size:11px;color:var(--muted);width:70px;text-transform:uppercase;letter-spacing:1px}}
.cat-bar-outer{{flex:1;background:rgba(255,255,255,.06);border-radius:6px;height:8px;overflow:hidden}}
.cat-bar-inner{{height:100%;border-radius:6px}}
.cat-bar-pct{{font-size:11px;font-family:'Space Mono',monospace;width:36px;text-align:right}}
table{{width:100%;border-collapse:collapse;font-size:12px}}
th{{background:rgba(0,212,180,.08);color:var(--accent);padding:7px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;font-family:'Space Mono',monospace}}
td{{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.04)}}
tr:last-child td{{border-bottom:none}}
.qr-grid{{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}}
.qr-box{{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px;text-align:center}}
.footer{{text-align:center;color:var(--muted);font-size:11px;margin-top:36px;font-family:'Space Mono',monospace}}
@media(max-width:700px){{.g4,.g2,.g3,.qr-grid{{grid-template-columns:1fr}}}}
</style>
</head>
<body><div class="wrap">
<div class="header">
  <h1>⬡ NextBit Probe</h1>
  <p>Hardware Diagnostic Report &nbsp;·&nbsp; {ts} &nbsp;·&nbsp; {sys_i.get('hostname','')} &nbsp;·&nbsp; {OS_TYPE} &nbsp;·&nbsp; v{PROBE_VERSION}</p>
</div>
{device_banner}
{vm_banner}
{na_warning}

<!-- HERO SCORE -->
<div class="hero">
  <div style="display:flex;justify-content:center;gap:16px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
    <span class="badge" style="background:{cat_color}20;color:{cat_color};border:1px solid {cat_color}50;font-size:14px">{cat_icon} {dc.get('category','Unknown')}</span>
    <span class="badge" style="background:{ecc_color}15;color:{ecc_color};border:1px solid {ecc_color}40;font-size:11px">{ecc_label}</span>
    {'<span class="badge" style="background:#ffa72615;color:#ffa726;border:1px solid #ffa72640;font-size:11px">🖧 RAID Detected</span>' if raid else ''}
  </div>
  <div class="score-big">{score['pct']}%</div>
  <div class="score-label">{ol}</div>
  <div class="bar-wrap"><div class="bar" style="width:{score['pct']}%"></div></div>
  <p style="color:var(--muted);font-size:13px;margin-top:6px">Score {score['earned']}/{score['total']} &nbsp;·&nbsp; {passed} passed &nbsp;·&nbsp; {failed} failed</p>
  <!-- Category breakdown bars -->
  <div style="max-width:380px;margin:16px auto 0;text-align:left">
    <div class="cat-bar-row"><span class="cat-bar-label">Hardware</span><div class="cat-bar-outer"><div class="cat-bar-inner" style="width:{hw_pct}%;background:{_bar_color(hw_pct)}"></div></div><span class="cat-bar-pct" style="color:{_bar_color(hw_pct)}">{hw_pct}%</span></div>
    <div class="cat-bar-row"><span class="cat-bar-label">Software</span><div class="cat-bar-outer"><div class="cat-bar-inner" style="width:{sw_pct}%;background:{_bar_color(sw_pct)}"></div></div><span class="cat-bar-pct" style="color:{_bar_color(sw_pct)}">{sw_pct}%</span></div>
    <div class="cat-bar-row"><span class="cat-bar-label">Security</span><div class="cat-bar-outer"><div class="cat-bar-inner" style="width:{sec_pct}%;background:{_bar_color(sec_pct)}"></div></div><span class="cat-bar-pct" style="color:{_bar_color(sec_pct)}">{sec_pct}%</span></div>
  </div>
</div>

<div class="g4">
  <div class="stat"><div class="n" style="color:{bc}">{bl}</div><div class="l">Battery</div></div>
  <div class="stat"><div class="n" style="color:{gc}">{gl}</div><div class="l">GPU</div></div>
  <div class="stat"><div class="n" style="color:{dl if dl else '#78909c'}">{dl}</div><div class="l">Disk Hours</div></div>
  <div class="stat"><div class="n" style="color:{cc}">{cl}</div><div class="l">CPU Throttle</div></div>
</div>

<div class="g2">
<div>
  <div class="card">
    <h3>System</h3>
    <div class="kv"><span class="k">Manufacturer / Model</span><span class="v">{sys_i.get('manufacturer','')} {sys_i.get('model','')}</span></div>
    <div class="kv"><span class="k">Serial Number</span><span class="v" style="font-family:monospace">{sys_i.get('serial','')}</span></div>
    <div class="kv"><span class="k">Machine ID</span><span class="v" style="font-family:monospace;font-size:11px">{sys_i.get('machine_id','')}</span></div>
    <div class="kv"><span class="k">Device Category</span><span class="v"><span class="badge" style="background:{cat_color}18;color:{cat_color};border:1px solid {cat_color}40;padding:3px 10px;font-size:11px">{cat_icon} {dc.get('category','Unknown')}</span></span></div>
    <div class="kv"><span class="k">Chassis / Form Factor</span><span class="v">{dc.get('chassis_type','N/A')} / {dc.get('form_factor','N/A')}</span></div>
    <div class="kv"><span class="k">CPU</span><span class="v">{sys_i.get('cpu','')}</span></div>
    <div class="kv"><span class="k">CPU Architecture</span><span class="v">{sys_i.get('cpu_arch','N/A')}</span></div>
    <div class="kv"><span class="k">Cores / Threads</span><span class="v">{sys_i.get('cpu_cores','')} / {sys_i.get('cpu_threads','')}</span></div>
    <div class="kv"><span class="k">RAM</span><span class="v">{sys_i.get('ram_gb','')} GB &nbsp;<span style="font-size:10px;color:{ecc_color}">{ecc_label}</span></span></div>
    <div class="kv"><span class="k">OS</span><span class="v">{sys_i.get('os_name','')} ({sys_i.get('os_arch','')})</span></div>
    <div class="kv"><span class="k">MAC Addresses</span><span class="v" style="font-family:monospace;font-size:11px">{', '.join(sys_i.get('mac_addrs',[]))}</span></div>
    {'<div class="kv"><span class="k">Ethernet Adapters</span><span class="v">' + str(sys_i.get('ethernet_adapters','N/A')) + '</span></div>' if not is_na(sys_i.get('ethernet_adapters')) else ''}
  </div>
  <div class="card">
    <h3>BIOS</h3>
    <div class="kv"><span class="k">Date</span><span class="v">{sys_i.get('bios_date','')}</span></div>
    <div class="kv"><span class="k">Version</span><span class="v">{sys_i.get('bios_version','')}</span></div>
    <div class="kv"><span class="k">Age</span><span class="v" style="color:{sys_i.get('bios_age_rating',('','#78909c'))[1]}">{sys_i.get('bios_age_years','')} yrs — {sys_i.get('bios_age_rating',('N/A',''))[0]}</span></div>
    <div class="kv"><span class="k">Last Boot</span><span class="v">{sys_i.get('last_boot','')}</span></div>
    {'<div class="kv"><span class="k">Virtualization</span><span class="v" style="color:#ffa726">VM (' + virt.get("hypervisor","") + ')</span></div>' if virt.get("is_vm") else '<div class="kv"><span class="k">Virtualization</span><span class="v" style="color:#00e676">Bare Metal</span></div>'}
  </div>
  <div class="card">
    <h3>Audit QR Codes</h3>
    <div class="qr-grid">
      <div class="qr-box"><div style="font-size:11px;color:var(--muted);margin-bottom:8px">Serial + Machine ID</div>{qr_main_html}</div>
      <div class="qr-box"><div style="font-size:11px;color:var(--muted);margin-bottom:8px">Serial + Machine ID + MACs</div>{qr_audit_html}</div>
    </div>
  </div>
</div>
<div>
  <div class="card">
    <h3>Battery Health</h3>
    <div style="text-align:center;margin:4px 0 10px"><span class="badge" style="background:{bc}18;color:{bc};border:1px solid {bc}40">{bl}</span></div>
    <p style="color:var(--muted);font-size:12px;text-align:center;margin-bottom:10px">{bat.get('desc','')}</p>
    <div class="gauge-wrap"><div class="gauge" style="width:{batt_gauge:.0f}%;background:{bc}"></div></div>
    <div class="kv"><span class="k">Wear</span><span class="v">{bat.get('wear_pct','')}%</span></div>
    <div class="kv"><span class="k">Cycles</span><span class="v">{bat.get('cycles','')}</span></div>
    <div class="kv"><span class="k">Design / Full Cap</span><span class="v">{bat.get('design_mwh','')} / {bat.get('full_mwh','')} mWh</span></div>
    <div class="kv"><span class="k">Charge</span><span class="v">{bat.get('percent','')}%</span></div>
    <div class="kv"><span class="k">Chemistry</span><span class="v">{bat.get('chemistry','')}</span></div>
  </div>
  <div class="card">
    <h3>GPU</h3>
    <div style="text-align:center;margin:4px 0 8px"><span class="badge" style="background:{gc}18;color:{gc};border:1px solid {gc}40">{gl}</span></div>
    <p style="color:var(--muted);font-size:12px;text-align:center;margin-bottom:8px">{gpu.get('desc','')}</p>
    <div class="kv"><span class="k">GPU</span><span class="v">{gpu.get('gpu_name','')[:60]}</span></div>
    <div class="kv"><span class="k">Type</span><span class="v">{"Dedicated" if gpu.get('is_dedicated') else "Integrated"}</span></div>
    <div class="kv"><span class="k">VRAM</span><span class="v">{gpu.get('vram','')}</span></div>
    <div class="kv"><span class="k">Driver Date</span><span class="v">{gpu.get('driver_date','')}</span></div>
    <div class="kv"><span class="k">Crashes (30d)</span><span class="v" style="color:{'#ef5350' if gpu.get('crashes',0)>3 else '#ffa726' if gpu.get('crashes',0)>0 else '#00e676'}">{gpu.get('crashes',0)}</span></div>
  </div>
  <div class="card">
    <h3>OS &amp; Security</h3>
    <div class="kv"><span class="k">Activation</span><span class="v" style="color:{'#00e676' if sec.get('activated')=='Activated' else '#ffa726'}">{sec.get('activated','')}</span></div>
    <div class="kv"><span class="k">Antivirus</span><span class="v">{sec.get('antivirus','')}</span></div>
    <div class="kv"><span class="k">Firewall</span><span class="v">{sec.get('firewall','')}</span></div>
    <div class="kv"><span class="k">TPM</span><span class="v">{sec.get('tpm','')}</span></div>
    <div class="kv"><span class="k">Secure Boot</span><span class="v">{sec.get('secure_boot','')}</span></div>
  </div>
  <div class="card">
    <h3>Machine Performance</h3>
    <div class="kv"><span class="k">CPU Load at Scan</span><span class="v" style="color:{'#ef5350' if not is_na(perf.get('cpu_pct')) and float(perf.get('cpu_pct',0))>80 else '#00e676'}">{perf.get('cpu_pct','N/A')}%</span></div>
    <div class="kv"><span class="k">RAM Used at Scan</span><span class="v" style="color:{'#ef5350' if not is_na(perf.get('mem_pct')) and float(perf.get('mem_pct',0))>85 else '#00e676'}">{perf.get('mem_pct','N/A')}%</span></div>
    <div class="kv"><span class="k">Running Processes</span><span class="v">{perf.get('process_count','N/A')}</span></div>
    <div class="kv"><span class="k">Startup Items</span><span class="v">{perf.get('startup_count','N/A')}</span></div>
    <div class="kv"><span class="k">Disk Read / Write</span><span class="v">{perf.get('disk_read_mbs','N/A')} / {perf.get('disk_write_mbs','N/A')} MB/s</span></div>
  </div>
</div>
</div>

<div class="g2">
<div class="card">
  <h3>CPU Throttle Test</h3>
  <div style="text-align:center;margin:4px 0 8px"><span class="badge" style="background:{cc}18;color:{cc};border:1px solid {cc}40">{cl}</span></div>
  <div class="kv"><span class="k">Base / Stress / Max</span><span class="v">{cpu_t.get('base_mhz','')} / {cpu_t.get('stress_mhz','')} / {cpu_t.get('max_mhz','')} MHz</span></div>
  <div class="kv"><span class="k">Maintained</span><span class="v" style="color:{cc}">{cpu_t.get('pct','')}%</span></div>
  {'<p style="color:#ffa726;font-size:12px;margin-top:8px">⚠ CPU thermal issues detected — check thermal paste / cooling</p>' if cpu_t.get('warning') else ''}
</div>
<div class="card">
  <h3>RAM Stability</h3>
  <div style="text-align:center;margin:4px 0 8px"><span class="badge" style="background:{rc}18;color:{rc};border:1px solid {rc}40">{rl}</span></div>
  <div class="kv"><span class="k">Result</span><span class="v" style="color:{rc}">{ram_t.get('result','')}</span></div>
  <div class="kv"><span class="k">Blocks Tested</span><span class="v">{ram_t.get('blocks','')} × {ram_t.get('block_mb','')} MB</span></div>
  <div class="kv"><span class="k">Errors</span><span class="v">{ram_t.get('errors',0)}</span></div>
  <div class="kv"><span class="k">ECC</span><span class="v" style="color:{ecc_color}">{ecc.get('details','N/A')}</span></div>
</div>
</div>

<div class="card">
  <h3>Disk SMART</h3>
  <div class="g3" style="margin-bottom:14px">
    <div class="stat"><div class="n" style="color:{dl if dl else '#78909c'}">{dl}</div><div class="l">Power-On Hours</div></div>
    <div class="stat"><div class="n" style="color:{dsk.get('smart',{}).get('wear_rating',('N/A','#78909c'))[1]}">{dsk.get('smart',{}).get('wear_rating',('N/A',''))[0]}</div><div class="l">Disk Wear</div></div>
    <div class="stat"><div class="n" style="color:var(--muted)">{dsk.get('smart',{}).get('power_on_hours','N/A')}</div><div class="l">Hours on Clock</div></div>
  </div>
  <div class="kv"><span class="k">Reallocated Sectors</span><span class="v">{dsk.get('smart',{}).get('reallocated','N/A')}</span></div>
  <div class="kv"><span class="k">Read / Write Errors</span><span class="v">{dsk.get('smart',{}).get('read_errors','N/A')} / {dsk.get('smart',{}).get('write_errors','N/A')}</span></div>
  {smart_rows}
  <br><table><tr><th>Device</th><th>Mount</th><th>Total</th><th>Free</th><th>Used</th></tr>{disk_rows}</table>
</div>

{raid_html}

<div class="g2">
<div class="card">
  <h3>Temperature</h3>
  {"<table><tr><th>Sensor</th><th>Temp</th></tr>" + temp_rows + "</table>" if temp_rows else '<p style="color:var(--muted);font-size:12px">No sensors accessible (run as admin/sudo)</p>'}
</div>
<div class="card">
  <h3>Network</h3>
  <div class="kv"><span class="k">Wi-Fi SSID</span><span class="v">{net.get('wifi_name','')}</span></div>
  <div class="kv"><span class="k">Signal</span><span class="v">{net.get('wifi_signal','')}</span></div>
  <div class="kv"><span class="k">Ethernet</span><span class="v">{net.get('ethernet','N/A')}</span></div>
  <div class="kv"><span class="k">Internet</span><span class="v" style="color:{'#00e676' if net.get('internet') else '#ef5350'}">{"Connected" if net.get('internet') else "No connection"}</span></div>
  <div class="kv"><span class="k">Ping (8.8.8.8)</span><span class="v">{net.get('ping_ms','')} ms</span></div>
</div>
</div>

<div class="card">
  <h3>Peripherals</h3>
  <div class="g2" style="margin:0">
    <div>
      <div class="kv"><span class="k">Webcam</span><span class="v">{per.get('webcam','')}</span></div>
      <div class="kv"><span class="k">Bluetooth</span><span class="v">{per.get('bluetooth','')}</span></div>
      <div class="kv"><span class="k">Audio</span><span class="v">{str(per.get('audio',''))[:60]}</span></div>
    </div>
    <div>
      <div class="kv"><span class="k">Keyboard</span><span class="v">{str(per.get('keyboard',''))[:60]}</span></div>
      <div class="kv"><span class="k">USB Controllers</span><span class="v">{per.get('usb_count','')}</span></div>
      <div class="kv"><span class="k">Fan</span><span class="v">{per.get('fan','')}</span></div>
    </div>
  </div>
</div>

<div class="card">
  <h3>OEM License</h3>
  <div class="kv"><span class="k">OEM Key in BIOS</span><span class="v">{"Embedded" if oem.get("oem_key") not in ("N/A","Not embedded",None) else oem.get("oem_key","")}</span></div>
  <div class="kv"><span class="k">Installed (last 5)</span><span class="v">{oem.get('installed_last5','')}</span></div>
  <div class="kv"><span class="k">Match</span><span class="v" style="color:{'#00e676' if oem.get('match')=='MATCH' else '#ef5350' if oem.get('match')=='MISMATCH' else '#78909c'}">{oem.get('match','')}</span></div>
</div>

<div class="card">
  <h3>Check Results</h3>
  <p style="font-size:11px;color:var(--muted);margin-bottom:8px">✔ Pass &nbsp; ✘ Fail &nbsp; ⚠ Data missing (run as admin/sudo)</p>
  <table><tr><th>Status</th><th>Check</th><th>Weight</th><th>Category</th><th>Detail</th></tr>{check_rows}</table>
</div>

<div class="footer">
  <p>NextBit Probe v{PROBE_VERSION} · XcognVis · {ts}</p>
  {"<p style='margin-top:4px'>Device ID: " + device_id + " · Scan ID: " + (scan_id or "—") + "</p>" if device_id else ""}
  <p style="margin-top:4px;color:#ffffff18">OS: {OS_TYPE} · Arch: {sys_i.get('cpu_arch','?')} · Python {sys_i.get('python','?')}</p>
</div>
</div></body></html>"""


# ══════════════════════════════════════════════════════════════════
# PROGRESS BAR
# ══════════════════════════════════════════════════════════════════
def step(n, total, label):
    pct = int(n / total * 100)
    bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
    print(f"\r{_CYAN}[{bar}] {pct:3d}%{_RST}  {label:<48}", end="", flush=True)

def done_line(): print()


# ══════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════
def main():
    args = parse_args()
    ensure_admin()

    global REPORTS_DIR
    if args.output_dir:
        REPORTS_DIR = args.output_dir

    print(f"\n{_BOLD}{_CYAN}")
    print("  ╔══════════════════════════════════════════════╗")
    print(f"  ║   NEXTBIT PROBE  ·  v{PROBE_VERSION}                 ║")
    print("  ║   XcognVis / NextBit Platform                ║")
    print("  ╚══════════════════════════════════════════════╝")
    print(f"{_RST}")

    # ── 1. Owner key (every run, with saved default) ───────────────
    owner_key = prompt_owner_key(cli_key=args.key or "")
    print(f"  {_GREEN}Owner key:{_RST} {owner_key[:3]}{'*' * 5}{owner_key[-1:]}\n")

    # ── 2. Version check ──────────────────────────────────────────
    print(f"  {_GRAY}Checking for updates...{_RST}", end="", flush=True)
    check_for_update(owner_key)
    print(f"\r  {_GRAY}{'Update check done.':48}{_RST}")

    # ── 3. Run diagnostics ────────────────────────────────────────
    TOTAL = 17  # 14 original + 3 new (virt, device class, RAID/ECC folded into existing)
    print()
    results = {}
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    results["timestamp"] = ts.replace("_", " ")

    step(1,  TOTAL, "Collecting system info...")
    results["system"]          = collect_system();         done_line()
    step(2,  TOTAL, "Detecting virtualization...")
    results["virtualization"]  = detect_virtualization();  done_line()
    step(3,  TOTAL, "Checking OEM license key...")
    results["oem"]             = collect_oem();            done_line()
    step(4,  TOTAL, "CPU throttle stress test (10s)...")
    results["cpu_throttle"]    = collect_cpu_throttle();   done_line()
    step(5,  TOTAL, "RAM stability + ECC detection...")
    results["ram_test"]        = collect_ram_test();       done_line()
    step(6,  TOTAL, "Battery health analysis...")
    results["battery"]         = collect_battery();        done_line()

    # Device classification needs system + virt + battery
    step(7,  TOTAL, "Classifying device type...")
    results["device_classification"] = classify_device(
        results["system"], results["virtualization"], results["battery"]
    )
    done_line()

    step(8,  TOTAL, "Disk SMART data (all disks)...")
    results["disks"]           = collect_disks();          done_line()
    step(9,  TOTAL, "RAID / SAS controllers...")
    results["raid_controllers"]= detect_raid_controllers(); done_line()
    step(10, TOTAL, "GPU condition check...")
    results["gpu"]             = collect_gpu();            done_line()
    step(11, TOTAL, "Display info...")
    results["display"]         = collect_display();        done_line()
    step(12, TOTAL, "Temperature sensors...")
    results["temperature"]     = collect_temperature();    done_line()
    step(13, TOTAL, "Network scan...")
    results["network"]         = collect_network();        done_line()
    step(14, TOTAL, "Peripherals...")
    results["peripherals"]     = collect_peripherals();    done_line()
    step(15, TOTAL, "OS & security audit...")
    results["security"]        = collect_security();       done_line()
    step(16, TOTAL, "Performance snapshot...")
    results["performance"]     = collect_performance();    done_line()
    step(17, TOTAL, "Event log scan...")
    results["events"]          = collect_events();         done_line()

    # ── 4. Score ──────────────────────────────────────────────────
    score  = compute_score(results)
    ol     = score["overall"]
    oc     = score["color"]
    na_pct = score.get("na_pct",0)
    cat_sc = score.get("cat_scores",{})

    # ── 5. Submit to gateway ──────────────────────────────────────
    device_id = scan_id = None
    print(f"\n  {_CYAN}Submitting to NextBit server ({SUBMIT_URL})...{_RST}", end="", flush=True)
    try:
        response       = submit_to_gateway(results, score, owner_key)
        device_id      = response.get("device_id")
        scan_id        = response.get("scan_id")
        is_new_device  = response.get("is_new_device", False)
        last_seen      = response.get("last_seen", "")
        scan_count     = response.get("scan_count", "")
        results["_is_new_device"] = is_new_device
        results["_last_seen"]     = last_seen
        results["_scan_count"]    = scan_count

        if is_new_device:
            tag = f"{_GREEN}NEW DEVICE REGISTERED — {device_id}{_RST}"
        else:
            prev = f"  {_GRAY}Last scanned: {last_seen}" + (f" · Total scans: {scan_count}" if scan_count else "") + f"{_RST}"
            tag  = f"{_CYAN}PREVIOUSLY SCANNED — {device_id}{_RST}"

        print(f"\r  ✓ {tag}")
        if not is_new_device and last_seen:
            print(f"  {_GRAY}Last scanned: {last_seen}" + (f" · Total scans: {scan_count}" if scan_count else "") + f"{_RST}")
        if scan_id:
            print(f"  {_GRAY}Scan ID: {scan_id}{_RST}")
    except RuntimeError as e:
        print(f"\r  {_YELL}⚠ Could not submit: {e}{_RST}")
        print(f"  {_GRAY}Scan saved locally only.{_RST}")
    except Exception as e:
        print(f"\r  {_RED}Unexpected error: {type(e).__name__}: {e}{_RST}")
        print(f"  {_GRAY}Scan saved locally only.{_RST}")

    # ── 6. Save local reports ─────────────────────────────────────
    os.makedirs(REPORTS_DIR, exist_ok=True)
    html_path = os.path.join(REPORTS_DIR, f"nextbit_report_{ts}.html")
    json_path = os.path.join(REPORTS_DIR, f"nextbit_data_{ts}.json")
    open(html_path, "w", encoding="utf-8").write(
        generate_html_report(results, score, device_id=device_id, scan_id=scan_id)
    )
    json.dump(results, open(json_path, "w", encoding="utf-8"), indent=2, default=str)

    # ── 7. Console summary ────────────────────────────────────────
    color_map = {"EXCELLENT":_GREEN,"GOOD":_CYAN,"POOR":_YELL,"VERY POOR":_RED,"N/A":_GRAY}
    c      = color_map.get(ol,_GRAY)
    passed = sum(1 for ch in score["checks"] if ch["passed"])
    failed = len(score["checks"]) - passed
    dc_cat = results.get("device_classification",{}).get("category","Unknown")
    virt_s = f"{_YELL}VM ({results.get('virtualization',{}).get('hypervisor','')}){_RST}" if results.get("virtualization",{}).get("is_vm") else f"{_GREEN}Bare Metal{_RST}"

    print(f"\n{_BOLD}  ┌────────────────────────────────────────────────────────┐")
    print(f"  │  RESULT: {c}{ol:<14}{_RST}{_BOLD}  SCORE: {score['pct']}% ({score['earned']}/{score['total']})      │")
    print(f"  │  Device: {dc_cat:<16}  {virt_s}{_BOLD}               │")
    if na_pct > 0:
        print(f"  │  {_YELL}⚠ {na_pct}% data missing — run as admin for full scan{_RST}{_BOLD}    │")
    print(f"  └────────────────────────────────────────────────────────┘{_RST}\n")

    # Category breakdown
    for cat, label in [("hardware","Hardware"),("software","Software"),("security","Security")]:
        pct = cat_sc.get(cat,0)
        bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
        col = _GREEN if pct >= 85 else _CYAN if pct >= 70 else _YELL if pct >= 50 else _RED
        print(f"  {_GRAY}{label:<10}{_RST} [{col}{bar}{_RST}] {col}{pct}%{_RST}")
    print()

    for ch in score["checks"]:
        if ch.get("missing"):
            icon = f"{_YELL}⚠{_RST}"
        elif ch["passed"]:
            icon = f"{_GREEN}✔{_RST}"
        else:
            icon = f"{_RED}✘{_RST}"
        cat_tag = f"{_GRAY}[{ch.get('category','')[:3].upper()}]{_RST}"
        print(f"  {icon}  {ch['name']:<24}{_GRAY}×{ch['weight']}{_RST}  {cat_tag}  {ch['detail']}")

    print(f"\n  {_GRAY}Battery: {results['battery']['rating'][0]}  |  GPU: {results['gpu']['rating'][0]}  |  Disk: {results['disks']['smart']['power_rating'][0]}{_RST}")
    if results.get("raid_controllers"):
        print(f"  {_YELL}RAID/SAS: {len(results['raid_controllers'])} controller(s) detected{_RST}")
    ecc_i = results.get("ram_test",{}).get("ecc",{})
    if ecc_i.get("has_ecc"):
        print(f"  {_GREEN}ECC RAM detected — {ecc_i.get('details','')}{_RST}")
    print(f"\n  {_CYAN}HTML report:{_RST} {html_path}")
    print(f"  {_CYAN}JSON data  :{_RST} {json_path}")
    if device_id:
        print(f"  {_CYAN}Device ID  :{_RST} {device_id}")

    # ── 8. Open HTML in browser ───────────────────────────────────
    if not args.no_browser:
        try:
            import webbrowser
            webbrowser.open(f"file://{os.path.abspath(html_path)}")
        except:
            pass

    print(f"\n  {_GRAY}Done. Press Enter to exit.{_RST}")
    try: input()
    except: pass


if __name__ == "__main__":
    main()