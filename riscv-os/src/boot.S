/*
 * Entry stub. Runs in S-mode; OpenSBI passes hartid in a0 and DTB pointer in a1.
 * Park every hart except hart 0, set up sp, zero .bss, jump to kernel_main.
 */
    .section .text.boot, "ax"
    .globl _start
    .type  _start, @function
_start:
    /* Park non-boot harts */
    bnez    a0, park

    /* Set up stack (16-byte aligned by linker) */
    la      sp, __stack_top

    /* Zero .bss */
    la      t0, __bss_start
    la      t1, __bss_end
1:  bgeu    t0, t1, 2f
    sd      zero, 0(t0)
    addi    t0, t0, 8
    j       1b
2:

    /* a0 = hartid, a1 = dtb — forward to kernel_main(hartid, dtb) */
    call    kernel_main

    /* If kernel_main returns, fall through to park */
park:
    wfi
    j       park
    .size   _start, . - _start
