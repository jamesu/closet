package hiscumm;
/*
hiscumm
-----------

*/

import hiscumm.Common;
#if neko
import neko.io.File;
#else
import utils.Seekable;
#end

/*
	ChunkReader
	
	This class is a utility class which handles the processing of chunks in
	SCUMM resource files.
	
	Example:
		var myReader: ChunkReader = new ChunkReader(my_bytes, -1);
		
		while (myReader.nextChunk())
		{
			trace("CHUNK=" + myReader.chunkName() + " @ " + my_bytes.pos);
		}
*/

class ChunkReader
{
	private var reader: ResourceIO;
	public var chunkID: Int32;
	public var chunkSize: Int;
	public var chunkOffs: Int;

	public function new(bytes: ResourceIO)
	{
		reader = bytes;
		
		reset();
	}

	public function chunkName() : String
	{
		if (Int32.compare(chunkID, Int32.ofInt(0)) == 0)
			return "????";

		return chunkIDToStr(chunkID);
	}
	
	public function reset() : Void
	{
		chunkID = Int32.ofInt(0);
		chunkSize = 0;
		chunkOffs = -1;
	}
	
	public static inline function chunkIDToStr(name: Int32) : String
	{
		return (String.fromCharCode(Int32.toInt(Int32.shr(name, 24))) +
		       String.fromCharCode(Int32.toInt(Int32.and(Int32.shr(name, 16), Int32.ofInt(0xFF)))) +
		       String.fromCharCode(Int32.toInt(Int32.and(Int32.shr(name, 8), Int32.ofInt(0xFF)))) +
		       String.fromCharCode(Int32.toInt(Int32.and(name, Int32.ofInt(0xFF)))));
	}
	
	public function readChunkData() : MemoryIO
	{
		var mem = new MemoryIO();
		mem.prepare(chunkSize);
		
		mem.writeInput(reader);
		
		return mem;
	}

	public function nextChunk() : Bool
	{
		if (chunkOffs >= 0)
			reader.seek(chunkOffs + chunkSize, SeekBegin);
		
		try
		{
			chunkOffs = reader.tell();
			chunkID = Int32.read(reader, true);
			chunkSize = Int32.toInt(Int32.read(reader, true)); // 31 bits should suffice...
		}
		catch (e: Dynamic)
		{
			return false;
		}

		return true;
	}
}
