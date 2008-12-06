package noneko;
/*
hiscumm
-----------
 * Copyright (c) 2005, The haXe Project Contributors
 * Copyright (c) 2008 James S Urquhart (jamesu at gmail.com)
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE HAXE PROJECT CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE HAXE PROJECT CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
 * DAMAGE.
*/

import noneko.Input;
import noneko.Output;

class IOTools
{	
	// Input
	
	public static inline function readFullBytes(io_in: Input, s : String, pos : Int, len : Int) : Void
	{
		while( len > 0 ) {
			var k = io_in.readBytes(s,pos,len);
			pos += k;
			len -= k;
		}
	}
	
	public static inline function readInt24(io_in: Input) : Int
	{
		var ch1 = io_in.readChar();
		var ch2 = io_in.readChar();
		var ch3 = io_in.readChar();
		var n = ch1 | (ch2 << 8) | (ch3 << 16);
		if( ch3 & 128 != 0 )
			return n - (1 << 24);
		else
			return n;
	}
	
	public static inline function readLine(io_in: Input) : String
	{
		var buf = new StringBuf();
		var last : Int;
		var s;
		try {
			while( (last = io_in.readChar()) != 10 )
				buf.addChar( last );
			s = buf.toString();
			if( s.charCodeAt(s.length-1) == 13 ) s = s.substr(0,-1);
		} catch( e : Dynamic ) {
			s = buf.toString();
			// TODO: fix for noneko
			//if( s.length == 0 )
			//	neko.Lib.rethrow(e);
		}
		return s;
	}
	
	public static inline function readUInt24(io_in: Input) : Int
	{
		var ch1 = io_in.readChar();
		var ch2 = io_in.readChar();
		var ch3 = io_in.readChar();
		return ch1 | (ch2 << 8) | (ch3 << 16);
	}
	
	public static inline function readUInt24B(io_in: Input) : Int
	{
		var ch1 = io_in.readChar();
		var ch2 = io_in.readChar();
		var ch3 = io_in.readChar();
		return ch3 | (ch2 << 8) | (ch1 << 16);
	}
	
	public static inline function readUntil(io_in: Input, end : Int) : String
	{
		var buf = new StringBuf();
		var last : Int;
		while( (last = io_in.readChar()) != end )
			buf.addChar( last );
		return buf.toString();
	}
	
	// Output
	
	public static inline function write(io_out: Output, s : String) : Void
	{
		var l = s.length;
		var p = 0;
		while( l > 0 ) {
			var k = 0;//io_out.writeBytes(s,p,l);
			if( k == 0 ) throw Error.Blocked;
			p += k;
			l -= k;
		}
	}
	
	public static inline function writeFullBytes(io_out: Output, s : String, pos : Int, len : Int) : Void
	{
		while( len > 0 ) {
			var k = 0;//io_out.writeBytes(s,pos,len);
			pos += k;
			len -= k;
		}
	}
	
	public static inline function writeInt24(io_out: Output, x : Int) : Void
	{
		if( x < 0 || x > 0xFFFFFF ) throw Error.Overflow;
		io_out.writeChar(x & 0xFF);
		io_out.writeChar((x >> 8) & 0xFF);
		io_out.writeChar(x >> 16);
	}
	
	public static inline function writeUInt24(io_out: Output, x : Int) : Void
	{
		if( x < -0x800000 || x > 0x7FFFFF ) throw Error.Overflow;
		if( x < 0 )
			io_out.writeUInt24(0x1000000 + x);
		else
			io_out.writeUInt24(x);
	}
	
	public static inline function writeUInt24B(io_out: Output, x : Int) : Void
	{
		if( x < 0 || x > 0xFFFFFF ) throw Error.Overflow;
		io_out.writeChar(x >> 16);
		io_out.writeChar((x >> 8) & 0xFF);
		io_out.writeChar(x & 0xFF);
	}
}