# Minimal RISC-V S-mode kernel for qemu-system-riscv64 -machine virt.
#
# Toolchain: LLVM clang + ld.lld (works on macOS/Linux without a cross-gcc).
# Swap to riscv64-unknown-elf-{gcc,ld} by overriding CC/LD if preferred.

CC      ?= clang
LD      ?= ld.lld
OBJCOPY ?= llvm-objcopy

TARGET_FLAGS := --target=riscv64 -march=rv64gc -mabi=lp64d -mno-relax
CFLAGS  := $(TARGET_FLAGS) -ffreestanding -nostdlib -fno-stack-protector \
           -fno-builtin -mcmodel=medany -O2 -Wall -Wextra -g
ASFLAGS := $(TARGET_FLAGS) -x assembler-with-cpp
LDFLAGS := -nostdlib -static -T linker.ld

BUILD := build
OBJS  := $(BUILD)/boot.o $(BUILD)/kernel.o

all: $(BUILD)/kernel.elf

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/boot.o: src/boot.S | $(BUILD)
	$(CC) $(ASFLAGS) -c $< -o $@

$(BUILD)/kernel.o: src/kernel.c src/sbi.h | $(BUILD)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD)/kernel.elf: $(OBJS) linker.ld
	$(LD) $(LDFLAGS) $(OBJS) -o $@

run: $(BUILD)/kernel.elf
	qemu-system-riscv64 -machine virt -bios default -nographic \
	    -smp 1 -m 128M -kernel $<

debug: $(BUILD)/kernel.elf
	qemu-system-riscv64 -machine virt -bios default -nographic \
	    -smp 1 -m 128M -kernel $< -s -S

trace: $(BUILD)/kernel.elf
	qemu-system-riscv64 -machine virt -bios default -nographic \
	    -smp 1 -m 128M -kernel $< -d int,mmu,guest_errors -D qemu.log

clean:
	rm -rf $(BUILD) qemu.log

.PHONY: all run debug trace clean
