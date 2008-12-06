package noneko;
/*
hiscumm
-----------


*/

interface Input
{
	public function close() : Void;
	
	public function read(nbytes : Int) : String;
	
	public function readAll(?bufsize : Int) : String;
	
	public function readBytes(s : String, p : Int, len : Int) : Int;
	
	public function readChar() : Int;
	
	public function readDouble() : Float;
	
	public function readDoubleB() : Float;
	
	public function readFloat() : Float;
	
	public function readFloatB() : Float;
	
	public function readFullBytes(s : String, pos : Int, len : Int) : Void;
	
	public function readInt16() : Int;
	
	public function readInt24() : Int;
	
	public function readInt32() : Int;
	
	public function readInt8() : Int;
	
	public function readLine() : String;
	
	public function readUInt16() : Int;
	
	public function readUInt16B() : Int;
	
	public function readUInt24() : Int;
	
	public function readUInt24B() : Int;
	
	public function readUInt32() : Int;
	
	public function readUInt32B() : Int;
	
	public function readUntil(end : Int) : String;
}