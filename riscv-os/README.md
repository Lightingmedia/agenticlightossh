# LightOS RISC-V Kernel

Minimal bare-metal rv64gc kernel for `qemu-system-riscv64 -machine virt`,
booted by OpenSBI in S-mode. Scaffolded via the `riscv-os-bootstrap` skill.

## Layout

```
riscv-os/
├── linker.ld          # Load at 0x80200000, .text.boot first, 64 KiB stack
├── Makefile           # clang + ld.lld build; `make run` boots QEMU
├── scripts/
│   └── run-qemu.sh    # build + boot one-liner
└── src/
    ├── boot.S         # _start: park non-boot harts, set sp, zero .bss, call kernel_main
    ├── sbi.h          # SBI legacy console putchar + SRST shutdown helpers
    └── kernel.c       # kernel_main — prints banner, shuts down via SBI
```

## Prerequisites

- `clang` and `ld.lld` (LLVM ≥ 15) — or override `CC`/`LD` to
  `riscv64-unknown-elf-gcc` / `riscv64-unknown-elf-ld`.
- `qemu-system-riscv64` (QEMU ≥ 7.0 ships a compatible OpenSBI).

macOS: `brew install llvm qemu`
Debian/Ubuntu: `sudo apt install clang lld qemu-system-misc`

## Build & run

```
cd riscv-os
make        # produces build/kernel.elf
make run    # boots under QEMU; exit with Ctrl-A x
```

Expected output:

```
======================================
 LightOS RISC-V kernel — hello, world
======================================
 boot hart : 0x0000000000000000
 dtb addr  : 0x00000000bfe00000
 mode      : S-mode (OpenSBI)
 next step : trap vector + timer irq

shutting down via SBI SRST...
```

## Debugging

`make debug` starts QEMU paused with a GDB stub on `:1234`:

```
riscv64-elf-gdb build/kernel.elf -ex 'target remote :1234' -ex 'b _start'
```

`make trace` logs traps and MMU events to `qemu.log`.

## Next steps

- Install an `stvec` trap vector and handle `ecall` / illegal-instruction.
- Wire SBI `set_timer` (EID `0x00`) for periodic ticks.
- Enable Sv39 paging via `satp` and map a higher-half kernel.
- Bring up a cooperative scheduler, then preemptive.
