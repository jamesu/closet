'''
Copyright (C) 2008, James S Urquhart (jamesu at gmail.com)
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of the <ORGANIZATION> nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
'''

try:
	from array import *
except ImportError:
	def array(ty, tem):
		return tem

try:
	import appuifw
	noappui = False
except ImportError:
	noappui = True

def testhook(self, addr, new_value):
	if new_value == None:
		print "Read from testhook"
		return self.memory[addr]
	else:
		print "Write to testhook (%x)" % new_value
		return new_value

stop_on_brk = True

class CPU6502:
	STATUSFLAG_CARRY = 0x1
	STATUSFLAG_ZERO = 0x2
	STATUSFLAG_INT_DISABLE = 0x4
	STATUSFLAG_DEC = 0x8
	STATUSFLAG_BRK = 0x10
	STATUSFLAG_OVR = 0x20
	STATUSFLAG_NEG = 0x40
	
	INVALID = lambda c: c.err("Invalid op! @ " + str(c.PC))
	
	def __init__(self):
		self.memory = array('B', [0]*(0xFFFF+1))
		self.memory_ptr = 0
		self.mem_hooks = {0x200: testhook}
		
		# Registers
		self.PC = 0
		self.SP = 0x1FF
		self.A = 0
		self.X = 0
		self.Y = 0
		
		self.STATUS = 0
		self.stopped = False
	
	def err(self, st):
		logit(st)
	
	def load(self, mem, addr):
		c = addr
		for b in mem:
			self.memory[c] = b
			c += 1
	
	def read_byte(self):
		val = self.memory[self.PC]
		
		logit("[%x] #$%x" % (self.PC, val))
		self.PC += 1
		return val
		
	def read_short(self):
		val = (self.memory[self.PC] | self.memory[self.PC+1] << 8)
		
		logit("[%x] #W$%x" % (self.PC, val))
		self.PC += 2
		return val
	
	def push_byte(self, value):
		if self.SP >= 0x100:
			self.SP -= 1
			self.memory[self.SP] = value & 0xFF
			
			logit("PUSH BYTE %x" % self.memory[self.SP])
		else:
			self.err("Stack full!")
	
	def push_short(self, value):
		self.push_byte((value >> 8) & 0xFF)
		self.push_byte(value & 0xFF)
	
	def pop_byte(self):
		if self.SP < 0x1FF:
			self.SP += 1
			return self.memory[self.SP-1]
		else:
			self.err("Stack empty!")
			return -1
	
	def pop_short(self):
		return (self.pop_byte() | (self.pop_byte() << 8))
	
	def interrupt(self, op, status=0x0):
		if self.PC & 0x4: return False
		
		self.push_byte(self.STATUS)
		self.push_short(self.PC)
		self.STATUS |= status | 0x4
		self.PC = op
	
	def brk(self):
		self.PC += 1
		self.interrupt(self.mem_short(0xFFFE), 0x10)
		
	def interrupt_return(self):
		self.PC = self.pop_short()
		self.STATUS = self.pop_byte()
	
	def mem_byte(self, addr):
		self.memory_ptr = addr
		
		logit("mem[%x] == %x" % (addr, self.memory[addr]))
		
		if self.mem_hooks.has_key(addr):
			self.memory[addr] = self.mem_hooks[addr](self, addr, None)
		
		return self.memory[addr]
	
	def mem_short(self, addr):
		value = (self.mem_byte(addr) |  self.mem_byte(addr+1) << 8)
		logit("mem[%x] == W%x" % (addr, value))
		
		self.memory_ptr = addr
		return value
	
	def mem_set_byte(self, addr, value):
		self.memory[addr] = value & 0xFF
		self.memory_ptr = addr
		
		if self.mem_hooks.has_key(addr):
			self.memory[addr] = self.mem_hooks[addr](self, addr, value)
		
		logit("mem[%x] = %x" % (addr, value))
	
	def mem_set_short(self, addr, value):
		self.mem_set_byte(addr, value)
		self.mem_set_byte(addr+1, value >> 8)
		self.memory_ptr = addr
	
	def set_sp(self, value):
		self.sp = value & 0xFF
	
	def set_reg_cmp(self, reg, value):
		# Set C if reg >= M
		if reg >= value:
			self.STATUS |= 0x1
		else:
			self.STATUS &= 0xFE
		
		# Set Z if reg = M
		if reg == value:
			self.STATUS |= 0x2
		else:
			self.STATUS &= 0xFD
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
	def set_vzn(self, value, addr):
		# Set V and N to bits 6 and 7 of addr
		self.status = (self.status & 0x3F) | (self.memory[addr] & 0xC0)
		
		# Set Z if value & A == 0
		if value == 0:
			self.STATUS |= 0x02
		else:
			self.STATUS &= 0xFD
	
	def set_a_zn(self, value):
		# Set Z if value == 0
		if value:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
		self.A = value & 0xFF
	
	def set_a_pzn(self, value):
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | ((self.A >> 7) & 0x1)
		
		# Set Z if value == 0
		if value:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
		self.A = value & 0xFF
	
	def set_a_pzn_r(self, value):
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | (self.A & 0x1)
		
		# Set Z if value == 0
		if value:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
		self.A = value & 0xFF

	def set_ac_pzn(self, value):
		c = self.STATUS & 0x1
		
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | ((self.A >> 7) & 0x1)
		
		self.A = (value & 0xFF) | c
		
		# Set Z if value == 0
		if self.A:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if self.A & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
	
	def set_ac_pzn_r(self, value):
		c = self.STATUS & 0x1
		
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | (self.A & 0x1)
		
		if c:
			self.A = (value & 0xFF) | 0x80
		else:
			self.A = (value & 0xFF)
		
		# Set Z if value == 0
		if self.A:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if self.A & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
	def set_a_adc(self, value):
		pass
	
	def set_a_dec(self, value):
		pass
	
	def set_x_zn(self, value):
		# Set Z if value == 0
		if value:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
		self.X = value & 0xFF
	
	def set_y_zn(self, value):
		# Set Z if value == 0
		if value:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
		self.Y = value & 0xFF
	
	def set_mem_zn(self, value, addr):
		# Set Z if value == 0
		if value:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
		self.mem_set_byte(addr, value)
	
	
	def set_mem_pzn_r(self, value, addr):
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | (self.memory[addr] & 0x1)
		
		# Set Z if value == 0
		if value:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
		self.mem_set_byte(addr, value)
	
	def set_mem_pzn(self, value, addr):
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | ((self.memory[addr] >> 7) & 0x1)
		
		# Set Z if value == 0
		if value:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if value & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
		
		self.mem_set_byte(addr, value)
	
	def set_memc_pzn(self, value, addr):
		c = self.STATUS & 0x1
		
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | ((self.memory[addr] >> 7) & 0x1)
		
		calc = value | c
		self.mem_set_byte(addr, calc)
		
		# Set Z if value == 0
		if calc:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if calc & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
	
	def set_memc_pzn_r(self, value, addr):
		c = self.STATUS & 0x1
		
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | (self.memory[addr] & 0x1)
		
		if c:
			calc = value | 0x80
		else:
			calc = value
		
		self.mem_set_byte(addr, calc)
		
		# Set Z if value == 0
		if calc:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if calc & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
	
	def set_memc_pzn_shl(self, addr):
		c = self.STATUS & 0x1
		old = self.memory[addr] & self.A
		
		# Set P to old bit 7
		self.STATUS = (self.STATUS & 0xFE) | ((old >> 7) & 0x1)
		
		calc = (old << 1) | c
		self.mem_set_byte(addr, calc)
		
		# Set Z if value == 0
		if calc:
			self.STATUS &= 0xFD
		else:
			self.STATUS |= 0x02
		
		# Set N if bit 7 set
		if calc & 0x80:
			self.STATUS |= 0x80
		else:
			self.STATUS &= 0x7F
	
	def set_status(self, value):
		self.STATUS = value
		
	def set_status_bits(self, value):
		self.STATUS |= value
	
	def clear_status(self, value):
		self.STATUS &= value
	
	def jump_br(self, value, cond):
		if cond:
			if value > 0x7F:
				self.PC -= (0x100 - value)
			else:
				self.PC += value
	
	def jump_sr(self, value):
		self.push_short(self.PC-1)
		
		logit("JUMP SUBROUTINE $%x (prev $%x)" % (value, self.PC))
		
		self.PC = value
	
	def jump(self, value):
		self.PC = value
		
		logit("JUMP TO $%x" % (value))
	
	def nop(self):
		pass
		
	def reset(self):
		self.PC = 0x600
	
	def stop(self):
		self.stopped = True
	
	def run(self, nops):
		c = 0
		self.stopped = False
		while 1:
			op = self.memory[self.PC]
			logit("[%x] @%x" % (self.PC, op))
			self.PC += 1
			
			CPU6502.opcode_table[op](self)
			c += 1
			
			if c == nops or self.stopped:
				return
	
	opcode_table = [
		lambda c: c.brk() ,# BRK
		lambda c: c.set_a_zn(c.A | c.mem_short((c.read_byte() + c.X) & 0xFF)), # ORA indx
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A | c.mem_byte(c.read_byte())),  # ORA zp
		lambda c: c.set_mem_pzn(c.mem_byte(c.read_byte()) << 1, c.memory_ptr), # ASL zp
		INVALID,
		lambda c: c.push_byte(c.STATUS),   # PHP @ 0x8
		lambda c: c.set_a_zn(c.A | c.read_byte()), # ORA imm
		lambda c: c.set_a_pzn(c.A << 1), #ASL impl
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A | c.mem_byte( c.read_short() )), # ORA abs
		lambda c: c.set_mem_pzn(c.mem_byte(c.read_short()) << 1, c.memory_ptr), # ASL abs
		INVALID,
		lambda c: c.jump_br(c.read_byte(), (c.STATUS & 0x80 == 0)), # BPL @ 0x10                    
		lambda c: c.set_a_zn(c.A | c.mem_byte(c.mem_short(c.read_byte()) + c.Y)), # ORA indy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A | c.mem_byte((c.read_byte() + c.X) & 0xFF)), # ORA zpx
		lambda c: c.set_mem_pzn(c.A | c.mem_byte((c.read_byte() + c.X) & 0xFF), c.memory_ptr), # ASL zpx
		INVALID,
		lambda c: c.clear_status(0xFE), # CLC @ 0x18
		lambda c: c.set_a_zn(c.A | c.mem_byte(c.read_short() + c.Y)), # ORA absy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A | c.mem_byte(c.read_short() + c.X)), # ORA absx
		lambda c: c.set_mem_pzn(c.mem_byte(c.read_short() + c.X) << 1, c.memory_ptr), # ASL absx
		INVALID,
		lambda c: c.jump_sr(c.read_short()) , # JSR abs @ 0x20
		lambda c: c.set_a_zn(c.A & c.mem_short((c.read_byte() + c.X) & 0xFF)), # AND indx
		INVALID,
		INVALID,
		lambda c: c.set_vzn(c.A & c.mem_byte(c.read_byte()), c.memory_ptr), # BIT zp
		lambda c: c.set_mem_zn(c.A & c.mem_byte(c.read_byte()), c.memory_ptr), # AND zp
		lambda c: c.set_memc_pzn_shl(c.read_byte()), # ROL zp
		INVALID,
		lambda c: c.set_status(c.pop_byte()), # PLP @ 0x28
		lambda c: c.set_a_zn(c.A & c.read_byte()), # AND imm
		lambda c: c.set_ac_pzn(c.A << 1), # ROL impl
		INVALID,
		lambda c: c.set_vzn(c.A & c.mem_byte(c.read_short()), c.memory_ptr), # BIT abs
		lambda c: c.set_a_zn(c.A & c.mem_byte(c.read_short())), # AND abs
		lambda c: c.set_memc_pzn(c.mem_byte(c.read_short()) << 1, c.memory_ptr), # ROL abs
		INVALID,
		lambda c: c.jump_br(c.read_byte(), (c.STATUS & 0x80)), # BMI @ 0x30
		lambda c: c.set_a_zn(c.A & c.mem_byte(c.mem_short(c.read_byte()) + c.Y)), # AND indy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A & c.mem_short((c.read_byte() + c.X) & 0xFF)), # AND indx [SHOULD BE zpx?]
		lambda c: c.set_memc_pzn(c.mem_byte((c.read_byte() + c.X) & 0xFF) << 1, c.memory_ptr), # ROL zpx
		INVALID,
		lambda c: c.set_status_bits(0x1), # SEC @ 0x38
		lambda c: c.set_a_zn(c.A & c.mem_byte(c.read_short() + c.Y)), # AND absy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A & c.mem_byte(c.read_short() + c.X)), # AND absx
		lambda c: c.set_memc_pzn(c.mem_byte(c.read_short() + c.X) << 1, c.memory_ptr), # ROL absx
		INVALID,
		lambda c: c.interrupt_return(), # RTI @ 0x40
		lambda c: c.set_a_zn(c.A ^ c.mem_byte(c.mem_short(((c.read_byte() + c.X) & 0xFF)))), # EOR indx
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A ^ c.mem_byte(c.read_byte())), # EOR zp
		lambda c: c.set_mem_pzn_r(c.mem_byte(c.read_byte()) >> 1, c.memory_ptr), # LSR zp
		INVALID,
		lambda c: c.push_byte(c.A), # PHA @ 0x48
		lambda c: c.set_a_zn(c.A ^ c.read_byte()), # EOR imm
		lambda c: c.set_a_pzn_r(c.A >> 1, c.memory_ptr), # LSR impl
		INVALID,
		lambda c: c.jump(c.read_short()), # JMP abs
		lambda c: c.set_a_zn(c.A ^ c.mem_byte(c.read_short())), # EOR abs
		lambda c: c.set_mem_pzn_r(c.mem_byte(c.read_short()) >> 1, c.memory_ptr), # LSR abs
		INVALID,
		lambda c: c.jump_br(c.read_byte(), (c.STATUS & 0x40 == 0)), # BVC @ 0x50
		lambda c: c.set_a_zn(c.A ^ c.mem_byte(c.mem_short(c.read_byte()) + c.Y)), # EOR indy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A ^ c.mem_byte((c.read_byte() + c.X) & 0xFF)), # EOR zpx
		lambda c: c.set_mem_pzn_r(c.mem_byte((c.read_byte() + c.X) & 0xFF) >> 1, c.memory_ptr), # LSR zpx
		INVALID,
		lambda c: c.clear_status(0xFB), # CLI @ 0x58
		lambda c: c.set_a_zn(c.A ^ c.mem_byte(c.read_short + c.Y)), # EOR absy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_zn(c.A ^ c.mem_byte(c.read_short() + c.X)), # EOR absx
		lambda c: c.set_mem_pzn_r(c.mem_byte(c.read_short() + c.X) >> 1, c.memory_ptr), # LSR absx
		INVALID,
		lambda c: c.jump(c.pop_short()+1), # RTS @ 0x60
		lambda c: c.set_a_adc(c.mem_byte(c.mem_short((c.read_byte() + c.X) & 0xFF))), # ADC indx
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_adc(c.mem_byte(c.read_byte())), # ADC zp
		lambda c: c.set_memc_pzn_r(c.mem_byte(c.read_byte()) >> 1, c.memory_ptr), # ROR zp
		INVALID,
		lambda c: c.set_a_zn(c.pop_byte()), # PLA @ 0x68
		lambda c: c.set_a_adc(c.read_byte()), # ADC imm
		lambda c: c.set_ac_pzn_r(c.mem_byte(c.read_byte()) >> 1), # ROR a
		INVALID,
		lambda c: c.jump(c.mem_short(c.read_short())), # JMP indir
		lambda c: c.set_a_adc(c.mem_byte(c.read_short())), # ADC abs
		lambda c: c.set_memc_pzn_r(c.mem_byte(c.read_short()) >> 1, c.memory_ptr), # ROR abs
		INVALID,
		lambda c: c.jump_br(c.read_byte(), (c.STATUS & 0x40)), # BVS @ 0x70
		lambda c: c.set_a_adc(c.mem_byte(c.mem_short(c.read_byte()) + c.Y)), # ADC iny
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_adc(c.mem_byte((c.read_byte() + c.X) & 0xFF)), # ADC zpx
		lambda c: c.set_memc_pzn_r(c.mem_byte(c.read_byte()) >> 1, c.memory_ptr), # ROR zpx
		INVALID,
		lambda c: c.set_status_bits(0x4), # SEI @ 0x78
		lambda c: c.set_a_adc(c.mem_byte(c.read_short() + c.Y)), # ADC absy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_adc(c.mem_byte(c.read_short() + c.X)), # ADC absx
		lambda c: c.set_memc_pzn(c.mem_byte(c.read_short() + c.X) >> 1, c.memory_ptr), # ROR absx
		INVALID,
		INVALID,   # @ 0x80
		lambda c: c.mem_set_byte(c.mem_short((c.read_byte() + c.X) & 0xFF), c.A), # STA indx
		INVALID,
		INVALID,
		lambda c: c.mem_set_byte(c.read_byte(), c.Y), # STY zp
		lambda c: c.mem_set_byte(c.read_byte(), c.A), # STA zp
		lambda c: c.mem_set_byte(c.read_byte(), c.X), # STX zp
		INVALID,
		lambda c: c.set_y_zn(c.Y - 1), # DEY @ 0x88
		INVALID,
		lambda c: c.set_a_zn(c.X), # TXA
		INVALID,
		lambda c: c.mem_set_byte(c.read_short(), c.Y), # STY abs
		lambda c: c.mem_set_byte(c.read_short(), c.A), # STA abs
		lambda c: c.mem_set_byte(c.read_short(), c.X), # STX abs
		INVALID,
		lambda c: c.jump_br(c.read_byte(), (c.STATUS & 0x1 == 0)), # BCC @ 0x90
		lambda c: c.mem_set_byte(c.mem_short(c.read_byte()) + c.Y, c.A), # STA indy
		INVALID,
		INVALID,
		lambda c: c.mem_set_byte(c.mem_byte((c.read_byte() + c.X) & 0xFF), c.Y), # STY zpx
		lambda c: c.mem_set_byte(c.mem_byte((c.read_byte() + c.X) & 0xFF), c.A), # STA zpx
		lambda c: c.mem_set_byte(c.mem_byte((c.read_byte() + c.Y) & 0xFF), c.X), # STX zpy
		INVALID,
		lambda c: c.set_a_zn(c.Y), # TYA @ 0x98
		lambda c: c.mem_set_byte(c.read_short() + c.Y, c.A), # STA absy
		lambda c: c.set_sp(c.X), # TXS
		INVALID,
		INVALID,
		lambda c: c.mem_set_byte(c.read_short() + c.X, c.A), # STA absx
		INVALID,
		INVALID,
		lambda c: c.set_y_zn(c.read_byte()), # LDY imm @ 0xA0
		lambda c: c.set_a_zn(c.mem_byte((c.read_byte() + c.X) & 0xFF)), # LDA indx
		lambda c: c.set_x_zn(c.read_byte()), # LDX imm
		INVALID,
		lambda c: c.set_y_zn(c.mem_byte(c.read_byte())), # LDY zp
		lambda c: c.set_a_zn(c.mem_byte(c.read_byte())), # LDA zp
		lambda c: c.set_x_zn(c.mem_byte(c.read_byte())), # LDX zp
		INVALID,
		lambda c: c.set_y_zn(c.A), # TAY @ 0xA8
		lambda c: c.set_a_zn(c.read_byte()), # LDA imm
		lambda c: c.set_x_zn(c.A), # TAX
		INVALID,
		lambda c: c.set_y_zn(c.mem_byte(c.read_short())), # LDY abs
		lambda c: c.set_a_zn(c.mem_byte(c.read_short())), # LDA abs
		lambda c: c.set_x_zn(c.mem_byte(c.read_short())), # LDX abs
		INVALID,
		lambda c: c.jump_br(c.read_byte(), (c.STATUS & 0x1)), # BCS @ 0xB0
		lambda c: c.set_a_zn(c.mem_byte(c.mem_short(c.read_byte()) + c.Y)), # LDA indy
		INVALID,
		INVALID,
		lambda c: c.set_y_zn(c.mem_byte((c.read_byte() + c.X) & 0xFF)), # LDY zpx
		lambda c: c.set_a_zn(c.mem_byte((c.read_byte() + c.X) & 0xFF)), # LDA zpx
		lambda c: c.set_x_zn(c.mem_byte((c.read_byte() + c.Y) & 0xFF)), # LDX zpy
		INVALID,
		lambda c: c.clear_status(0xBF), # CLV @ 0xB8
		lambda c: c.set_a_zn(c.mem_byte(c.read_short() + c.Y)), # LDA absy
		lambda c: c.set_x_zn(c.SP), # TSX
		INVALID,
		lambda c: c.set_y_zn(c.mem_byte(c.read_short() + c.X)), # LDY absx
		lambda c: c.set_a_zn(c.mem_byte(c.read_short() + c.X)), # LDA absx
		lambda c: c.set_x_zn(c.mem_byte(c.read_short() + c.Y)), # LDX absy
		INVALID,
		lambda c: c.set_reg_cmp(c.Y, c.read_byte()), # CPY imm @ 0xC0
		lambda c: c.set_reg_cmp(c.A, c.mem_byte(c.mem_short(c.read_byte()) + c.Y)), # CMP indy [should be indx?]
		INVALID,
		INVALID,
		lambda c: c.set_reg_cmp(c.Y, c.mem_byte(c.read_byte())), # CPY zp
		lambda c: c.set_reg_cmp(c.A, c.mem_byte(c.read_byte())), # CMP zp
		lambda c: c.set_mem_zn(c.mem_byte(c.read_byte())-1, c.memory_ptr), # DEC zp
		INVALID,
		lambda c: c.set_y_zn(c.Y + 1), # INY @ 0xC8
		lambda c: c.set_reg_cmp(c.A, c.read_byte()), # CMP imm
		lambda c: c.set_x_zn(c.X - 1), # DEX
		INVALID,
		lambda c: c.set_reg_cmp(c.Y, c.mem_byte(c.read_short())), # CPY abs
		lambda c: c.set_reg_cmp(c.A, c.mem_byte(c.read_short())), # CMP abs
		lambda c: c.set_mem_zn(c.mem_byte(c.read_short())-1, c.memory_ptr), # DEC abs
		INVALID,
		lambda c: c.jump_br(c.read_byte(), (c.STATUS & 0x2 == 0)), # BNE @ 0xD0
		lambda c: c.set_reg_cmp(c.A, c.mem_byte(c.mem_short(c.read_byte()) + c.Y)), # CMP indy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_reg_cmp(c.A, c.mem_byte((c.read_byte() + c.X) & 0xFF)), # CMP zpx
		lambda c: c.set_mem_zn(c.mem_byte((c.read_byte() + c.X) & 0xFF)-1, c.memory_ptr), # DEC zpx
		INVALID,
		lambda c: c.clear_status(0xF7), # CLD @ 0xD8
		lambda c: c.set_reg_cmp(c.A, c.mem_byte(c.read_short() + c.Y)), # CMP absy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_reg_cmp(c.A, c.mem_byte(c.read_short() + c.X)), # CMP absx
		lambda c: c.set_mem_zn(c.mem_byte(c.read_short() + c.X)-1, c.memory_ptr), # DEC absx
		INVALID,
		lambda c: c.set_reg_cmp(c.X, c.read_byte()), # CPX imm @ 0xE0
		lambda c: c.set_a_sbc(c.mem_byte(c.mem_short((c.read_byte() + c.X) & 0xFF))), # SBC indx
		INVALID,
		INVALID,
		lambda c: c.set_reg_cmp(c.X, c.mem_byte(c.read_byte())), # CPX zp
		lambda c: c.set_a_sbc(c.mem_byte(c.read_byte())), # SBC zp
		lambda c: c.set_mem_zn(c.mem_byte(c.read_byte())+1, c.memory_ptr), # INC zp
		INVALID,
		lambda c: c.set_x_zn(c.X + 1), # INX @ 0xE8
		lambda c: c.set_a_sbc(c.read_byte()), # SBC imm
		lambda c: c.nop(), # NOP
		INVALID,
		lambda c: c.set_reg_cmp(c.X, c.mem_byte(c.read_short())), # CPX ABS
		lambda c: c.set_a_sbc(c.mem_byte(c.read_short())), # SBC ABS
		lambda c: c.set_mem_zn(c.mem_byte(c.read_short())+1, c.memory_ptr), # INC abs
		INVALID,
		lambda c: c.jump_br(c.read_byte(), (c.STATUS & 0x2)), # BEQ @ 0xF0
		lambda c: c.set_a_sbc(c.mem_byte(c.mem_short(c.read_byte()) + c.Y)), # SBC indy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_sbc(c.mem_byte((c.read_byte() + c.X) & 0xFF)), # SBC zpx
		lambda c: c.set_mem_zn(c.mem_byte((c.read_byte() + c.X) & 0xFF)+1, c.memory_ptr), # INC zpx
		INVALID,
		lambda c: c.set_status_bits(0x8), # SED @ 0xF8
		lambda c: c.set_a_sbc(c.mem_byte(c.read_short() + c.Y)), # SBC absy
		INVALID,
		INVALID,
		INVALID,
		lambda c: c.set_a_sbc(c.mem_byte(c.read_short() + c.X)), # SBC absx
		lambda c: c.set_mem_zn(c.mem_byte(c.read_short() + c.X)+1, c.memory_ptr), # INC absx
		INVALID    # @ 0xFF
]


if not noappui:
	applog = appuifw.Text()
	applog.set(u"")
	appuifw.app.body = applog


	def logit(value):
		applog.add(u"%s\n" % value)
else:
	def logit(value):
		print value

def test():
	foo = CPU6502()
	
	#foo.load([0xa9, 0x02, 0x8d, 0x00, 0x02, 0x00], foo.PC)
	
	# tests:
	#	- Misc
	#	- tya
	#	- indirect x addressing
	#   - multi threading
	#   - brk test
	foo.load([#0xa9, 0x02, 0x8d, 0x00, 0x02, 0xa9, 0x01, 0xa2, 0x05, 0x8e, 0x00, 0x09, 0x9d, 0x00, 0x02, 0xca, 0xd0, 0xfa],
	          
	          #0xa9, 0x14, 0x85, 0x20, 0xa9, 0x64, 0xa4, 0x20, 0x8c, 0x00, 0x20, 0x98, 0x85, 0x20],
	          
	          #0xa9, 0x01, 0x8d, 0x00, 0x02, 0xa2, 0x30, 0x86, 0x20, 0xa2, 0x00, 0x86, 0x21, 0xa2, 0x21, 0x81, 0xff, 0xa5, 0x30, 0x8d, 0x01, 0x02],
	          
	          #0xa9, 0x10, 0x85, 0x02, 0xa2, 0x10, 0xa9, 0x37, 0x9d, 0x00, 0x40, 0xa9, 0x06, 0x9d, 0x01, 0x40,
	          #0x86, 0x03, 0xa5, 0x03, 0x9d, 0x02, 0x40, 0xa5, 0x03, 0x9d, 0x03, 0x40, 0xca, 0xca, 0xca, 0xca,
	          #0xd0, 0xe4, 0x4c, 0x56, 0x06, 0x68, 0x9d, 0x00, 0x40, 0x68, 0x9d, 0x01, 0x40, 0x60, 0xbd, 0x01,
	          #0x40, 0x48, 0xbd, 0x00, 0x40, 0x48, 0x60, 0xea, 0xbd, 0x03, 0x40, 0xbc, 0x02, 0x40, 0x99, 0x00,
	          #0x02, 0x20, 0x25, 0x06, 0x20, 0x25, 0x06, 0xbd, 0x03, 0x40, 0xbc, 0x02, 0x40, 0x9d, 0x01, 0x02,
	          #0x20, 0x25, 0x06, 0x4c, 0x37, 0x06, 0xa6, 0x02, 0x20, 0x2e, 0x06, 0xca, 0xca, 0xca, 0xca, 0x86,
	          #0x02, 0xd0, 0xf3, 0xa9, 0x10, 0x85, 0x02, 0x4c, 0x56, 0x06],
	          
	          0xa2, 0x00, 0x00, 0xe8, 0xe8, 0x8e, 0x00, 0x02],
	          0x600)
	
	foo.load([0x40], 0x900) # BRK handler
	foo.mem_set_short(0xfffe, 0x900) # BRK handler address
	
	if stop_on_brk:
		CPU6502.opcode_table[0] = lambda c: c.stop()
	
	foo.jump(0x600)
	
	logit("---")
	foo.run(8)
	logit("---")
	
	if not noappui:
		appuifw.query(u"test", "text")
		appuifw.note(u"Screen @ 200 = %d" % (foo.memory[0x200]), "info")

if __name__ == "__main__":
	test()	