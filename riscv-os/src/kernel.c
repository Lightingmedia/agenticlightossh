/*
 * kernel_main — first C code after the boot stub.
 * Prints a banner over the SBI console, then halts cleanly.
 */
#include <stdint.h>
#include "sbi.h"

static void kputs(const char *s)
{
    while (*s) sbi_console_putchar(*s++);
}

static void kput_hex(uint64_t v)
{
    static const char hex[] = "0123456789abcdef";
    kputs("0x");
    for (int i = 60; i >= 0; i -= 4)
        sbi_console_putchar(hex[(v >> i) & 0xF]);
}

void kernel_main(unsigned long hartid, unsigned long dtb)
{
    kputs("\n");
    kputs("======================================\n");
    kputs(" LightOS RISC-V kernel — hello, world\n");
    kputs("======================================\n");
    kputs(" boot hart : "); kput_hex(hartid); kputs("\n");
    kputs(" dtb addr  : "); kput_hex(dtb);    kputs("\n");
    kputs(" mode      : S-mode (OpenSBI)\n");
    kputs(" next step : trap vector + timer irq\n");
    kputs("\nshutting down via SBI SRST...\n");

    sbi_shutdown();

    /* If SRST is unsupported, spin. */
    for (;;) __asm__ volatile ("wfi");
}
