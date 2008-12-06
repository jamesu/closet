package utils;
/*
hiscumm
-----------


*/

enum Seek
{
	SeekEnd;
	SeekCur;
	SeekBegin;
}

interface Seekable
{	
	function seek(p : Int, pos : Seek) : Void;
	function tell() : Int;
}

