use aya_build::cargo_metadata;

fn main() {
    // Tell Cargo to rerun this script if the eBPF source changes
    println!("cargo:rerun-if-changed=../probe-ebpf/src/main.rs");

    // Compile the eBPF kernel program to a BPF object file.
    // The resulting .o is embedded into the userspace binary via include_bytes!
    aya_build::build_ebpf(
        cargo_metadata().unwrap(),
        &[aya_build::Ebpf {
            name:   "probe-ebpf",
            source: "../probe-ebpf",
        }],
    )
    .unwrap();
}