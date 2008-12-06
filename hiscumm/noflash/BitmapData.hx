package noflash;
/*
hiscumm
-----------

*/

typedef MemoryIO = utils.NekoByteIO;
import noflash.ByteArray;
import noflash.Rectangle;
import noflash.Point;

/*
	BitmapData
	
	This class is a clone of flash9's BitmapData
*/

class BitmapData
{
	public var width: Int;
	public var height: Int;
	
	public var rect: Rectangle;
	
	public function new(width: Int, height: Int, param: Bool, flags: Int) : Void
	{
	}
	
	public function dispose()
	{
	}
	
	public function lock()
	{
	}
	
	public function unlock()
	{
	}
	
	public function setPixels(rect: Rectangle, colors: MemoryIO)
	{
	}
	
	public function copyPixels(bmap: BitmapData, rect: Rectangle, dest: Point, alpha: BitmapData, alphaPoint: Point, merge: Bool)
	{
	}
	
	public function fillRect(rect: Rectangle, color: Int)
	{
	}
	
	public function paletteMap(bmap: BitmapData, rect: Rectangle, point: Point, zeros: Array<Int>, zeros2: Array<Int>, list:Array<Int>, Void)
	{
	}

}
