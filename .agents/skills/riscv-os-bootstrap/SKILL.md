---
name: riscv-os-bootstrap
description: Use when bootstrapping a from-scratch RISC-V operating system kernel — writing the linker script, boot assembly, kernel entry, UART driver, and running under QEMU. Triggers on "RISC-V OS", "riscv kernel", "bare-metal riscv", "qemu-system-riscv", "build my own OS", "hifive/virt kernel".
---

# RISC-V OS Bootstrap

Bring up a minimal bare-metal kernel for `qemu-system-riscv64 -machine virt` (rv64gc), printable over UART. Default target: rv64gc, `virt` machine, S-mode kernel launched by OpenSBI (QEMU's default firmware).

## When to use
- User wants to write a RISC-V OS/kernel from scratch (Zig, C, or Rust).
- User asks to bring up boot code, linker script, UART, or a QEMU run loop.
- User mentions `qemu-system-riscv64`, `virt` machine, OpenSBI, `-kernel`, or "bare metal riscv".

## Target assumptions
- Machine: `qemu-system-riscv64 -machine virt -bios default -nographic`.
- Firmware: OpenSBI (QEMU default) jumps to the kernel in **S-mode** at `0x80200000`. Use SBI calls for console, not raw MMIO, unless the user explicitly wants M-mode.
- If M-mode is required (no SBI): entry is `0x80000000` and the NS16550A UART lives at `0x10000000`.

Confirm the mode with the user before writing boot code — S-mode + SBI and M-mode + MMIO diverge from the first instruction.

## Workflow

1. **Pick toolchain**. Zig (`zig build-exe -target riscv64-freestanding-none -mcpu=baseline_rv64`) is the shortest path — no separate cross-compiler install. LLVM clang (`--target=riscv64 -march=rv64gc -mabi=lp64d -mno-relax -ffreestanding -nostdlib`) or `riscv64-unknown-elf-gcc` also work. `-mno-relax` avoids linker relaxation surprises with hand-written asm.

2. **Write the linker script** (`linker.ld`). Place `.text` at the load address (`0x80200000` for S-mode/SBI, `0x80000000` for M-mode), keep `.text.boot` first, then `.rodata`, `.data`, `.bss`. Define `__bss_start`, `__bss_end`, and `__stack_top` symbols. **Success:** `llvm-objdump -h kernel.elf` shows `.text` at the expected VMA and a non-empty `.text.boot` at offset 0.

3. **Write the entry stub** (`boot.S` or a `naked` Zig/Rust function in `.text.boot`).
   - Park all harts except hart 0: read `mhartid` (M-mode) or use the `a0` argument OpenSBI passes (S-mode hartid) — non-zero harts `wfi` in a loop.
   - Set `sp = __stack_top`.
   - Zero `.bss` between `__bss_start` and `__bss_end`.
   - `j kernel_main` (or `call` if far).

   **Why hart parking:** QEMU virt starts multiple harts simultaneously; without parking they all race into `kernel_main` and corrupt the single stack.

4. **Kernel main + console**. In S-mode, print via SBI legacy `sbi_console_putchar` (EID `0x01`) or the DBCN extension (EID `0x4442434E`, FID 0): load args in `a0..a7`, `ecall`. In M-mode, poke the NS16550A THR at `0x10000000` after checking LSR bit 5 at `0x10000005`. Wrap in a `puts`/`kprintf` helper before doing anything else — you cannot debug what you cannot print.

5. **Run under QEMU**.
   ```
   qemu-system-riscv64 -machine virt -bios default -nographic -kernel kernel.elf
   ```
   Exit with `Ctrl-A x`. Add `-smp 4` once hart parking is in. Add `-s -S` to wait for GDB on `:1234`.
   **Success:** the UART string from `kernel_main` appears on the terminal.

6. **Iterate**. Add trap vector (`stvec`), timer interrupts (SBI `set_timer`), paging (`satp` Sv39), then a scheduler. Each of these is its own step — don't stack them into the first boot.

## Conventions

- Keep boot code in `.text.boot` and force it first in the linker script; a stray `.text` reordering silently breaks entry.
- Align `__stack_top` to 16 bytes — the RISC-V calling convention requires 16-byte SP alignment on function entry, and misalignment corrupts spills without warning.
- Prefer SBI over raw MMIO on the `virt` machine. It keeps the kernel portable to real hardware that boots via OpenSBI.
- Build with `-ffreestanding -nostdlib -fno-stack-protector`. Link with `-static -nostartfiles -T linker.ld`.
- Zig: mark the entry function `export fn _start() linksection(".text.boot") callconv(.Naked) void`.

## Debugging

- `qemu-system-riscv64 ... -s -S`, then `riscv64-elf-gdb kernel.elf -ex 'target remote :1234' -ex 'b _start'`.
- Add `-d int,mmu,guest_errors -D qemu.log` to catch traps QEMU would otherwise silently loop on.
- No UART output usually means: wrong load address, `.bss` not zeroed (SBI call struct is garbage), or all harts spinning in the entry (missing hart-park).

## Edge cases

- **`-bios none`**: skips OpenSBI, so entry is `0x80000000` in M-mode and SBI calls will `ecall`-trap. Switch the linker script and console path together.
- **rv32**: target `riscv32-freestanding-none`, load address `0x80400000` on `virt`, `-machine virt` still works but pick `qemu-system-riscv32`.
- **Position independence**: don't enable PIE. The kernel runs at a fixed physical address before paging; PIE relocations at load time are not applied by QEMU's `-kernel` loader.
