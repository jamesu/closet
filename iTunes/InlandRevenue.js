// Copyright (C) 2005, James S Urquhart (jamesu at gmail.com). All Rights Reserved.

// Create interface objects
var	iTunesApp = WScript.CreateObject("iTunes.Application");
var	mainLibrary = iTunesApp.LibraryPlaylist;
var	mainLibrarySource = iTunesApp.LibrarySource;
var	wshShell = WScript.CreateObject("WScript.Shell");

// Track info
var	tracks = mainLibrary.Tracks;
var	numTracks = tracks.Count;
var	numTracksRenamed = 0;
var	i;

function removeSpaces(input)
{
	// Remove spaces at beginning and end
	var beginIdx = 0;

	// From beginning
	if (input.charAt(0) == " ") {
		while ((input.charAt(beginIdx) == " ") && (beginIdx < input.length))
		{
			beginIdx += 1;
		}
	}

	// Must be empty
	if (beginIdx == input.length) {
		return "";
	}

	var endIdx = input.length-1;
	// Then end
	if (input.charAt(endIdx) == " ") {
		while ((input.charAt(endIdx) == " ") && (endIdx != 0))
		{
			//WScript.Echo(input.charAt(endIdx) + ":" + endIdx);
			endIdx -= 1;
		}
		endIdx += 1;
	} else {
		return input.substring(beginIdx);	
	}
	endIdx += beginIdx+1;

	var subStr = input.substring(beginIdx, endIdx);
	//WScript.Echo("Str: '"+input+"', Begin:"+beginIdx+", End: " + endIdx + ", SubStr:'"+subStr+"'");	
	return subStr;
}

// FIXME take a -v parameter eventually
var verbose = false;

// Flip or not?
var flipResult = false;
var result = wshShell.Popup("Do you wish to rename by forename,surname rather than surname,forename?",  0, "Cash incentive", 36);
if (result == 6) {
	flipResult = true;
} else if (result == 7) {
	flipResult = false;
}

// Make track list
var	trackArray = new Array();

for (i = 1; i <= numTracks; i++)
{
	var	currTrack = tracks.Item(i);
	var	artist = currTrack.Artist;
	
	// If artist contains ",", put him on
	if (artist.indexOf(",") != -1)
	{
		// Add to the track list
		trackArray.push(currTrack);
	}
}

for (var trackIdx in trackArray)
{
	track = trackArray[trackIdx];
	// We need to look at the "Artist" and extract the parts...
	var trackArtist = track.Artist;
	var sepIdx = trackArtist.indexOf(",");

	// Now onto the good part. We also need to eliminate leading or trailing spaces
	var firstPart = trackArtist.substring(0, sepIdx);
	var secondPart = trackArtist.substring(sepIdx+1);

	var firstFiltered = removeSpaces(firstPart);
	var secondFiltered = removeSpaces(secondPart);

	if (firstFiltered && secondFiltered) {
		var nameStr;
		if (flipResult) {
			nameStr = "Forename: '"+firstFiltered+"', Surname: '"+secondFiltered+"'";
		} else {
			nameStr = "Forename: '"+secondFiltered+"', Surname: '"+firstFiltered+"'";
		}

		var result = wshShell.Popup("Tax Evasion detected! Do you wish to reveal the true name of the evader?\n"+nameStr+" Address: '"+track.Name+"'",  0, "Inland Revenue", 35);
		if (result == 6) { // Yes
			if (flipResult)
				track.Artist = firstFiltered + " " + secondFiltered;
			else
				track.Artist = secondFiltered + " " + firstFiltered;
			numTracksRenamed += 1;
		}
		else if (result == 7) { // No, so pester more
			continue;
		}
		else if (result == 2) { // Cancel
			break;
		}
	}
}

if (numTracksRenamed == 0)
{
	WScript.Echo("No tracks renamed!");
}
else
{
	WScript.Echo(numTracksRenamed + " tracks renamed.");
}

