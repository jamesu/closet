package hiscumm;
/*
hiscumm
-----------

Portions derived from code Copyright (C) 2004-2006 Alban Bedel

*/

#if flash9
typedef ByteArray = flash.utils.ByteArray;
typedef Bitmap = flash.display.Bitmap;
typedef BitmapData = flash.display.BitmapData;
typedef Rectangle = flash.geom.Rectangle;
typedef Point = flash.geom.Point;
typedef Int32 = noneko.Int32;
typedef MemoryIO = utils.FlashByteIO;
typedef ResourceIO = utils.FlashByteIO;
typedef Input = noneko.Input;
typedef Output = noneko.Output;
#elseif neko
typedef ByteArray = noflash.ByteArray;
typedef Bitmap = noflash.Bitmap;
typedef BitmapData = noflash.BitmapData;
typedef Rectangle = noflash.Rectangle;
typedef Point = noflash.Point;
typedef Int32 = neko.Int32;
typedef MemoryIO = utils.NekoByteIO; 
typedef ResourceIO = neko.io.FileInput;
typedef Input = neko.io.Input;
typedef Output = neko.io.Output;
#elseif js
typedef ByteArray = noflash.ByteArray;
typedef Bitmap = justjs.Bitmap;
typedef BitmapData = justjs.BitmapData;
typedef Rectangle = noflash.Rectangle;
typedef Point = noflash.Point;
typedef Int32 = noneko.Int32;
typedef MemoryIO = utils.JSByteIO;
typedef ResourceIO = utils.JSByteIO;
typedef Input = noneko.Input;
typedef Output = noneko.Output;
#end