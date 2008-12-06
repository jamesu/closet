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
import utils.JSByteIO;

class JSTest
{
	public static var resources: Array<ResourceIO>;
	public static var engine: SPUTM;
	
	static function main() {
		trace("Preloading resources");
		resources = new Array<ResourceIO>();
		
		// Either load directly if possible, or from javascript data
		if (!(untyped __js__("hiscumm_script_load")))
		{
			resources.push(JSByteIO.fromURL("SCUMMC.000"));
			resources.push(JSByteIO.fromURL("SCUMMC.001"));
		}
		else
		{
			// Grab from scumm_000_data & scumm_001_data in JavaScript
			resources.push(new JSByteIO(untyped __js__("scumm_000_data")));
			resources.push(new JSByteIO(untyped __js__("scumm_001_data")));
		}
		
		trace("Resources loaded");
		
		engine = new SPUTM(resources);
		
		trace("Engine init");
		engine.run();
	}
}
