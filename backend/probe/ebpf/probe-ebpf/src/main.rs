#![no_std]
#![no_main]

use aya_ebpf::{
    bindings::xdp_action,
    macros::{map, tracepoint, xdp},
    maps::{HashMap, PerfEventArray},
    programs::{TracePointContext, XdpContext},
};
use aya_log_ebpf::info;

// ─────────────────────────────────────────────────────────────
// Shared event types (must be repr(C) for BPF map compatibility)
// ─────────────────────────────────────────────────────────────

/// Emitted to userspace on every TCP connect attempt.
#[repr(C)]
pub struct ConnectEvent {
    pub pid:       u32,
    pub uid:       u32,
    pub src_addr:  u32,   // IPv4 in network byte order
    pub dst_addr:  u32,
    pub dst_port:  u16,
    pub src_port:  u16,
    pub comm:      [u8; 16], // process name (task_comm_len = 16)
}

/// Per-NIC traffic counters, keyed by (src_ip, dst_ip, dst_port).
#[repr(C)]
#[derive(Copy, Clone)]
pub struct FlowKey {
    pub src_addr: u32,
    pub dst_addr: u32,
    pub dst_port: u16,
    pub _pad:     u16,
}

#[repr(C)]
#[derive(Copy, Clone, Default)]
pub struct FlowStats {
    pub packets: u64,
    pub bytes:   u64,
}

// ─────────────────────────────────────────────────────────────
// eBPF Maps
// ─────────────────────────────────────────────────────────────

/// Perf ring-buffer: kernel pushes ConnectEvents, userspace reads them.
#[map]
static mut CONNECT_EVENTS: PerfEventArray<ConnectEvent> =
    PerfEventArray::new(0);

/// Flow table: accumulates packet/byte counts per flow.
#[map]
static mut FLOW_TABLE: HashMap<FlowKey, FlowStats> =
    HashMap::with_max_entries(8192, 0);

// ─────────────────────────────────────────────────────────────
// Tracepoint: sys_enter_connect
//
// Fires on every connect(2) syscall — captures TCP connections
// including the calling process name (comm) and destination.
// ─────────────────────────────────────────────────────────────
#[tracepoint]
pub fn sys_enter_connect(ctx: TracePointContext) -> u32 {
    match try_sys_enter_connect(&ctx) {
        Ok(ret) => ret,
        Err(_)  => 0,
    }
}

fn try_sys_enter_connect(ctx: &TracePointContext) -> Result<u32, i64> {
    // sys_enter_connect tracepoint format:
    //   offset 16 = fd (u64)
    //   offset 24 = uservaddr ptr (u64) → sockaddr_in
    //   offset 32 = addrlen (u64)
    //
    // We read the sockaddr_in from userspace via the pointer at offset 24.
    let sockaddr_ptr: u64 = unsafe { ctx.read_at(24)? };

    // sockaddr_in layout: sa_family(2) + sin_port(2) + sin_addr(4)
    let sa_family: u16 = unsafe {
        aya_ebpf::helpers::bpf_probe_read_user(sockaddr_ptr as *const u16)?
    };

    // Only handle AF_INET (2) for now — skip IPv6, unix sockets, etc.
    if sa_family != 2 {
        return Ok(0);
    }

    let dst_port: u16 = unsafe {
        aya_ebpf::helpers::bpf_probe_read_user((sockaddr_ptr + 2) as *const u16)?
    };
    let dst_addr: u32 = unsafe {
        aya_ebpf::helpers::bpf_probe_read_user((sockaddr_ptr + 4) as *const u32)?
    };

    let pid = (aya_ebpf::helpers::bpf_get_current_pid_tgid() >> 32) as u32;
    let uid = (aya_ebpf::helpers::bpf_get_current_uid_gid() & 0xFFFF_FFFF) as u32;

    let mut comm = [0u8; 16];
    let _ = aya_ebpf::helpers::bpf_get_current_comm(&mut comm);

    let event = ConnectEvent {
        pid,
        uid,
        src_addr: 0, // filled in userspace from /proc if needed
        dst_addr,
        dst_port: u16::from_be(dst_port),
        src_port: 0,
        comm,
    };

    unsafe {
        CONNECT_EVENTS.output(ctx, &event, 0);
    }

    info!(ctx, "connect pid={} dst={:i}:{}", pid, dst_addr, u16::from_be(dst_port));

    Ok(0)
}

// ─────────────────────────────────────────────────────────────
// XDP: count ingress packets and bytes per flow
//
// Attached to the NIC. Passes all traffic through (XDP_PASS)
// while accumulating flow stats in FLOW_TABLE.
// ─────────────────────────────────────────────────────────────
#[xdp]
pub fn xdp_flow_counter(ctx: XdpContext) -> u32 {
    match try_xdp_flow_counter(&ctx) {
        Ok(ret) => ret,
        Err(_)  => xdp_action::XDP_PASS,
    }
}

fn try_xdp_flow_counter(ctx: &XdpContext) -> Result<u32, ()> {
    use core::mem;

    let data     = ctx.data();
    let data_end = ctx.data_end();

    // Ethernet header = 14 bytes
    if data + 14 > data_end {
        return Ok(xdp_action::XDP_PASS);
    }

    // EtherType is at offset 12 (2 bytes, big-endian)
    let ethertype = u16::from_be(unsafe {
        *((data + 12) as *const u16)
    });

    // Only handle IPv4 (0x0800)
    if ethertype != 0x0800 {
        return Ok(xdp_action::XDP_PASS);
    }

    // IPv4 header starts at offset 14
    // IHL is lower nibble of first byte → header length in 32-bit words
    let ihl_byte = unsafe { *((data + 14) as *const u8) };
    let ihl = ((ihl_byte & 0x0F) as usize) * 4;

    if data + 14 + ihl > data_end {
        return Ok(xdp_action::XDP_PASS);
    }

    let protocol = unsafe { *((data + 23) as *const u8) }; // IP proto field

    // Only TCP (6) and UDP (17)
    if protocol != 6 && protocol != 17 {
        return Ok(xdp_action::XDP_PASS);
    }

    let src_addr = u32::from_be(unsafe {
        *((data + 26) as *const u32)
    });
    let dst_addr = u32::from_be(unsafe {
        *((data + 30) as *const u32)
    });

    // TCP/UDP dst port is at offset 2 into the transport header
    let transport_start = data + 14 + ihl;
    if transport_start + 4 > data_end {
        return Ok(xdp_action::XDP_PASS);
    }

    let dst_port = u16::from_be(unsafe {
        *((transport_start + 2) as *const u16)
    });

    let key = FlowKey { src_addr, dst_addr, dst_port, _pad: 0 };
    let pkt_len = (data_end - data) as u64;

    unsafe {
        if let Some(stats) = FLOW_TABLE.get_ptr_mut(&key) {
            (*stats).packets += 1;
            (*stats).bytes   += pkt_len;
        } else {
            let _ = FLOW_TABLE.insert(
                &key,
                &FlowStats { packets: 1, bytes: pkt_len },
                0,
            );
        }
    }

    Ok(xdp_action::XDP_PASS)
}

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}