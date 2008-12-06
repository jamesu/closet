package hiscumm;

/*
test
-----------
Copyright (C) 2007 - 2008 James S Urquhart (jamesu at gmail.com)This program is free software; you can redistribute it and/ormodify it under the terms of the GNU General Public Licenseas published by the Free Software Foundation; either version 2of the License, or (at your option) any later version.This program is distributed in the hope that it will be useful,but WITHOUT ANY WARRANTY; without even the implied warranty ofMERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See theGNU General Public License for more details.You should have received a copy of the GNU General Public Licensealong with this program; if not, write to the Free SoftwareFoundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
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

