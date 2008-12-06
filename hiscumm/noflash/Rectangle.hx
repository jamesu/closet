package noflash;
/*
hiscumm
-----------

*/

/*
	Rectangle
	
	This class is a clone of flash9's Rectangle
*/

class Rectangle
{
	public var x: Int;
	public var y: Int;
	public var width: Int;
	public var height: Int;
	
	public function new(x: Int, y: Int, w: Int, h: Int) : Void
	{
		this.x = x;
		this.y = y;
		this.width = w;
		this.height = h;
	}
	
	public function intersection(other: Rectangle)
	{
		var dx = x;
		var dy = y;
		var dw = width;
		var dh = height;
		
		if (dx < other.x)
		{
			width -= (other.x-dx);
			dx = other.x;
		}
		if (dy < other.y)
		{
			height -= (other.y-dy);
			dy = other.y;
		}
		if (dx >= other.x+other.width)
		{
			width -= (other.x+other.width-dx);
			dx = other.x+other.width;
		}
		if (dy > other.y+other.height)
		{
			height -= (other.y+other.height-dy);
			dy = other.y+other.height;
		}
		
		if (dx + dw > other.x+other.width)
		{
			width = (other.x+other.width)-dx;
		}
		if (dx + dh > other.x+other.height)
		{
			height = (other.y+other.height)-dy;
		}
		
		return new Rectangle(dx, dy, dw, dh);
	}
	
	public function clone() : Rectangle
	{
		return new Rectangle(x, y, width, height);
	}

}
