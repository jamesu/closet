package noneko;
/*
hiscumm
-----------


*/

interface Output
{
	public function close() : Void;
	
	public function flush() : Void;
	
	public function prepare(nbytes : Int) : Void;
	
	public function write(s : String) : Void;
	
	public function writeBytes(s : String, p : Int, len : Int) : Int;
	
	public function writeChar(c : Int) : Void;
	
	public function writeDouble(c : Float) : Void;
	
	public function writeDoubleB(c : Float) : Void;
	
	public function writeFloat(c : Float) : Void;
	
	public function writeFloatB(c : Float) : Void;
	
	public function writeFullBytes(s : String, pos : Int, len : Int) : Void;
	
	public function writeInput(i : Input, ?bufsize : Int) : Void;
	
	public function writeInt16(x : Int) : Void;
	
	public function writeInt24(x : Int) : Void;
	
	public function writeInt32(x : Int) : Void;
	
	public function writeInt8(c : Int) : Void;
	
	public function writeUInt16(x : Int) : Void;
	
	public function writeUInt16B(x : Int) : Void;
	
	public function writeUInt24(x : Int) : Void;
	
	public function writeUInt24B(x : Int) : Void;
	
	public function writeUInt32(x : Int) : Void;
	
	public function writeUInt32B(x : Int) : Void;
}