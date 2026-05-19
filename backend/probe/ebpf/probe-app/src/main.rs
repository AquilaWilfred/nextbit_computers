use std::{
    collections::HashMap,
    net::Ipv4Addr,
    sync::{Arc, Mutex},
    time::Duration,
};

use aya::{
    include_loaded_ebpf,
    maps::{perf::AsyncPerfEventArray, HashMap as BpfHashMap},
    programs::{TracePoint, Xdp, XdpFlags},
    Ebpf,
};
use aya_log::EbpfLogger;
use clap::Parser;
use log::{info, warn};
use serde::{Deserialize, Serialize};
use tokio::{signal, time};

// ─────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────

#[derive(Parser)]
#[command(name = "nextbit-probe", about = "NextBit network probe agent")]
struct Args {
    /// Network interface to attach XDP program to (e.g. eth0, wlan0)
    #[arg(short, long, default_value = "eth0")]
    iface: String,

    /// Capture duration in seconds
    #[arg(short, long, default_value_t = 30)]
    duration: u64,

    /// Gateway URL to ship the report to
    #[arg(short, long, default_value = "http://localhost:8080/api/probe/network")]
    gateway: String,

    /// Device ID (from hardware scan)
    #[arg(long)]
    device_id: String,
}

// ─────────────────────────────────────────────────────────────
// Event types (mirror the eBPF repr(C) structs)
// ─────────────────────────────────────────────────────────────

#[repr(C)]
#[derive(Clone, Copy)]
struct ConnectEvent {
    pid:      u32,
    uid:      u32,
    src_addr: u32,
    dst_addr: u32,
    dst_port: u16,
    src_port: u16,
    comm:     [u8; 16],
}

#[repr(C)]
#[derive(Clone, Copy)]
struct FlowKey {
    src_addr: u32,
    dst_addr: u32,
    dst_port: u16,
    _pad:     u16,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct FlowStats {
    packets: u64,
    bytes:   u64,
}

unsafe impl aya::Pod for ConnectEvent {}
unsafe impl aya::Pod for FlowKey {}
unsafe impl aya::Pod for FlowStats {}

// ─────────────────────────────────────────────────────────────
// Report types — serialised to JSON and shipped to gateway
// ─────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct NetworkReport {
    device_id:        String,
    capture_duration: u64,
    connections:      Vec<ConnectionRecord>,
    flows:            Vec<FlowRecord>,
    threat_hits:      Vec<ThreatHit>,
    summary:          CaptureSummary,
}

#[derive(Serialize)]
struct ConnectionRecord {
    pid:      u32,
    process:  String,
    dst_ip:   String,
    dst_port: u16,
}

#[derive(Serialize)]
struct FlowRecord {
    src_ip:   String,
    dst_ip:   String,
    dst_port: u16,
    packets:  u64,
    bytes:    u64,
}

#[derive(Serialize)]
struct ThreatHit {
    dst_ip:   String,
    dst_port: u16,
    process:  String,
    reason:   String,
}

#[derive(Serialize)]
struct CaptureSummary {
    total_connections:  usize,
    total_flows:        usize,
    total_bytes:        u64,
    threat_hit_count:   usize,
    unique_destinations: usize,
}

// ─────────────────────────────────────────────────────────────
// Known malicious / suspicious CIDR ranges (static blocklist)
// Expand this or replace with a dynamic feed from the gateway.
// ─────────────────────────────────────────────────────────────

const BLOCKLIST_CIDRS: &[&str] = &[
    // Common C2 infrastructure ranges (examples — replace with real threat intel)
    "185.220.0.0/16",   // Tor exit nodes / C2 overlap
    "198.96.0.0/16",
    "45.142.212.0/24",
    // RFC 5737 test ranges are NOT included — private RFC1918 is normal traffic
];

fn is_threat(ip: u32) -> Option<&'static str> {
    let addr = Ipv4Addr::from(ip);
    for cidr_str in BLOCKLIST_CIDRS {
        if let Ok(network) = cidr_str.parse::<ipnetwork::Ipv4Network>() {
            if network.contains(addr) {
                return Some(cidr_str);
            }
        }
    }
    None
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    env_logger::init();
    let args = Args::parse();

    // Requires CAP_BPF or root
    check_privileges();

    info!("Loading eBPF programs...");

    // The build.rs compiles probe-ebpf and embeds it here at compile time
    let mut bpf = Ebpf::load(include_loaded_ebpf!("probe-ebpf"))?;

    if let Err(e) = EbpfLogger::init(&mut bpf) {
        warn!("eBPF logger init failed (non-fatal): {}", e);
    }

    // ── Attach tracepoint: sys_enter_connect ──────────────────
    let prog: &mut TracePoint = bpf
        .program_mut("sys_enter_connect")
        .unwrap()
        .try_into()?;
    prog.load()?;
    prog.attach("syscalls", "sys_enter_connect")?;
    info!("Tracepoint sys_enter_connect attached");

    // ── Attach XDP to NIC ─────────────────────────────────────
    let xdp: &mut Xdp = bpf
        .program_mut("xdp_flow_counter")
        .unwrap()
        .try_into()?;
    xdp.load()?;
    xdp.attach(&args.iface, XdpFlags::default())?;
    info!("XDP attached to interface {}", args.iface);

    // ── Read connect events from perf ring-buffer ─────────────
    let connections: Arc<Mutex<Vec<ConnectEvent>>> = Arc::new(Mutex::new(Vec::new()));
    let conn_clone = connections.clone();

    let mut perf_array = AsyncPerfEventArray::try_from(
        bpf.take_map("CONNECT_EVENTS").unwrap()
    )?;

    // Spawn a reader per CPU
    let cpu_count = num_cpus();
    for cpu_id in 0..cpu_count {
        let mut buf = perf_array.open(cpu_id, None)?;
        let conn_ref = conn_clone.clone();

        tokio::spawn(async move {
            let mut bufs = (0..10)
                .map(|_| bytes::BytesMut::with_capacity(1024))
                .collect::<Vec<_>>();

            loop {
                let events = buf.read_events(&mut bufs).await.unwrap();
                for i in 0..events.read {
                    let ptr = bufs[i].as_ptr() as *const ConnectEvent;
                    let event = unsafe { ptr.read_unaligned() };
                    conn_ref.lock().unwrap().push(event);
                }
            }
        });
    }

    // ── Capture window ────────────────────────────────────────
    info!("Capturing for {} seconds... (Ctrl+C to stop early)", args.duration);

    tokio::select! {
        _ = time::sleep(Duration::from_secs(args.duration)) => {
            info!("Capture window complete");
        }
        _ = signal::ctrl_c() => {
            info!("Interrupted — building report");
        }
    }

    // ── Read flow table from BPF map ──────────────────────────
    let flow_map: BpfHashMap<_, FlowKey, FlowStats> =
        BpfHashMap::try_from(bpf.map("FLOW_TABLE").unwrap())?;

    let mut flow_records: Vec<FlowRecord> = Vec::new();
    let mut total_bytes: u64 = 0;
    let mut unique_dsts: std::collections::HashSet<u32> = std::collections::HashSet::new();

    for item in flow_map.iter() {
        if let Ok((key, stats)) = item {
            flow_records.push(FlowRecord {
                src_ip:   Ipv4Addr::from(key.src_addr).to_string(),
                dst_ip:   Ipv4Addr::from(key.dst_addr).to_string(),
                dst_port: key.dst_port,
                packets:  stats.packets,
                bytes:    stats.bytes,
            });
            total_bytes += stats.bytes;
            unique_dsts.insert(key.dst_addr);
        }
    }

    // ── Build connection records + threat hits ─────────────────
    let raw_conns = connections.lock().unwrap().clone();
    let mut connection_records: Vec<ConnectionRecord> = Vec::new();
    let mut threat_hits: Vec<ThreatHit> = Vec::new();

    for ev in &raw_conns {
        let process = comm_to_string(&ev.comm);
        let dst_ip  = Ipv4Addr::from(ev.dst_addr).to_string();

        if let Some(reason) = is_threat(ev.dst_addr) {
            threat_hits.push(ThreatHit {
                dst_ip:   dst_ip.clone(),
                dst_port: ev.dst_port,
                process:  process.clone(),
                reason:   format!("Matched blocklist CIDR: {}", reason),
            });
        }

        connection_records.push(ConnectionRecord {
            pid:      ev.pid,
            process,
            dst_ip,
            dst_port: ev.dst_port,
        });
    }

    // ── Assemble report ───────────────────────────────────────
    let report = NetworkReport {
        device_id:        args.device_id.clone(),
        capture_duration: args.duration,
        summary: CaptureSummary {
            total_connections:   connection_records.len(),
            total_flows:         flow_records.len(),
            total_bytes,
            threat_hit_count:    threat_hits.len(),
            unique_destinations: unique_dsts.len(),
        },
        connections: connection_records,
        flows:        flow_records,
        threat_hits,
    };

    // ── Log summary ───────────────────────────────────────────
    info!("─────────────────────────────────────");
    info!("Capture complete for device {}", args.device_id);
    info!("  Connections : {}", report.summary.total_connections);
    info!("  Flows       : {}", report.summary.total_flows);
    info!("  Bytes seen  : {}", report.summary.total_bytes);
    info!("  Threat hits : {}", report.summary.threat_hit_count);
    info!("  Unique dsts : {}", report.summary.unique_destinations);
    info!("─────────────────────────────────────");

    // ── Ship to gateway ───────────────────────────────────────
    info!("Shipping report to {}", args.gateway);
    let client = reqwest::Client::new();
    let res = client
        .post(&args.gateway)
        .json(&report)
        .send()
        .await?;

    if res.status().is_success() {
        info!("Report accepted by gateway ({})", res.status());
    } else {
        warn!("Gateway returned {}: {}", res.status(), res.text().await?);
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

fn comm_to_string(comm: &[u8; 16]) -> String {
    let end = comm.iter().position(|&b| b == 0).unwrap_or(16);
    String::from_utf8_lossy(&comm[..end]).to_string()
}

fn num_cpus() -> u32 {
    // Read from /sys/devices/system/cpu/possible
    std::fs::read_to_string("/sys/devices/system/cpu/possible")
        .ok()
        .and_then(|s| {
            s.trim()
             .split('-')
             .last()
             .and_then(|n| n.parse::<u32>().ok())
             .map(|n| n + 1)
        })
        .unwrap_or(4)
}

fn check_privileges() {
    // Effective UID 0 = root; otherwise needs CAP_BPF + CAP_NET_ADMIN
    let euid = unsafe { libc::geteuid() };
    if euid != 0 {
        eprintln!(
            "Warning: not running as root. eBPF requires CAP_BPF and CAP_NET_ADMIN.\n\
             Run with: sudo -E ./probe-app  or  setcap cap_bpf,cap_net_admin+eip ./probe-app"
        );
    }
}