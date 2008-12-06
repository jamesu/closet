package hiscumm;

/*
test
-----------

*/

/*
	TEST
*/

import hiscumm.SPUTM;
import hiscumm.Common;

class NekoTest
{
	public static var resources: Array<ResourceIO>;
	public static var engine: SPUTM;
	
	static function main() {
		resources = new Array<ResourceIO>();
		resources.push(neko.io.File.read("SCUMMC.000", true));
		resources.push(neko.io.File.read("SCUMMC.001", true));
		engine = new SPUTM(resources);
		
		trace("Engine init");
		engine.run();
	}
}
