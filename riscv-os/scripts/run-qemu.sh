#!/usr/bin/env bash
# Convenience wrapper: build then boot the kernel under QEMU.
# Exit QEMU with Ctrl-A x.
set -euo pipefail
cd "$(dirname "$0")/.."
make
exec qemu-system-riscv64 -machine virt -bios default -nographic \
    -smp 1 -m 128M -kernel build/kernel.elf
