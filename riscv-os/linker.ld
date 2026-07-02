/* Linker script for rv64gc S-mode kernel launched by OpenSBI on qemu virt. */
OUTPUT_ARCH(riscv)
ENTRY(_start)

SECTIONS
{
    /* OpenSBI hands control to the kernel at 0x80200000 in S-mode. */
    . = 0x80200000;

    .text : ALIGN(4K) {
        KEEP(*(.text.boot))
        *(.text .text.*)
    }

    .rodata : ALIGN(4K) {
        *(.rodata .rodata.*)
    }

    .data : ALIGN(4K) {
        *(.data .data.*)
    }

    .bss : ALIGN(4K) {
        __bss_start = .;
        *(.bss .bss.* COMMON)
        . = ALIGN(16);
        __bss_end = .;
    }

    . = ALIGN(16);
    . += 64K;                  /* 64 KiB boot stack for hart 0 */
    __stack_top = .;

    /DISCARD/ : { *(.eh_frame) *(.note .note.*) *(.comment) }
}
