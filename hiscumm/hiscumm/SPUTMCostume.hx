package hiscumm;
/*
hiscumm
-----------

Portions derived from code Copyright (C) 2004-2006 Alban Bedel
*/

import hiscumm.Common;

import hiscumm.SPUTM;
import hiscumm.SPUTMResource;

/*
	SPUTMCostume
	
	This collection of classes handles the loading and processing of actor costumes.
*/

class SPUTMCostume
{
	public var id: Int;
	
	public function new(num: Int)
	{
		id = num;
	}
	
	public function nuke()
	{
	}
}

class SPUTMCostumeFactory extends SPUTMResourceFactory
{
	public function new()
	{
		super();
		
		name = "COSTUME";
	}

	override public function load(idx: Int, reader: ResourceIO) : Dynamic
	{
		// Need to load the costume from the offset
		var chunkID: Int32 = Int32.read(reader, true);
		var chunkSize: Int = Int32.toInt(Int32.read(reader, true));
		
		if (SPUTMResourceChunk.identify(chunkID) != CHUNK_COST)
		{
			trace("Bad costume block (" + ChunkReader.chunkIDToStr(chunkID) + " )");
			return null;
		}
		
		var instance: SPUTMCostume = new SPUTMCostume(idx);
		
		return instance;
	}
}