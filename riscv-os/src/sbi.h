#ifndef SBI_H
#define SBI_H

#include <stdint.h>

struct sbiret {
    long error;
    long value;
};

/* Legacy console putchar — EID 0x01. Simple and works on every OpenSBI. */
static inline void sbi_console_putchar(int ch)
{
    register long a0 __asm__("a0") = ch;
    register long a7 __asm__("a7") = 0x01;
    __asm__ volatile ("ecall" : "+r"(a0) : "r"(a7) : "memory");
}

/* System reset — EID 0x53525354 ("SRST"), FID 0. type=0 shutdown, reason=0. */
static inline void sbi_shutdown(void)
{
    register long a0 __asm__("a0") = 0;
    register long a1 __asm__("a1") = 0;
    register long a6 __asm__("a6") = 0;
    register long a7 __asm__("a7") = 0x53525354;
    __asm__ volatile ("ecall" : : "r"(a0), "r"(a1), "r"(a6), "r"(a7) : "memory");
}

#endif
