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
var flipSplit = false;

// Flip or not?
var flipResult = false;
var result = wshShell.Popup("Hello sir. Do you wish to rename by artist,title rather than title,artist?",  0, "Edgar says", 36);
if (result == 6) {
	flipResult = true;
} else if (result == 7) {
	flipResult = false;
}

// Make an array of tracks
var	trackArray = new Array();

for (i = 1; i <= numTracks; i++)
{
	var	currTrack = tracks.Item(i);
	var	artist = currTrack.Artist;
	
	// If no artist
	if ((artist == undefined) || (artist == "") || (artist == "Various Artists"))
	{
		// Add to the track list
		trackArray.push(currTrack);
	}
}

for (var trackIdx in trackArray)
{
	track = trackArray[trackIdx];
	// We need to look at the "Title" and extract the parts...
	var trackName = track.Name;
	var sepIdx = trackName.indexOf("-");
	if (sepIdx < 0)
		continue;

	// Now onto the good part. We also need to eliminate leading or trailing spaces
	var firstPart = trackName.substring(0, sepIdx);
	var secondPart = trackName.substring(sepIdx+1);

	var firstFiltered = removeSpaces(firstPart);
	var secondFiltered = removeSpaces(secondPart);

	if (firstFiltered && secondFiltered) {
		var nameStr;
		if (flipResult) {
			nameStr = "Artist: '"+firstFiltered+"', Title: '"+secondFiltered+"'";
		} else {
			nameStr = "Title: '"+secondFiltered+"', Artist: '"+firstFiltered+"'";
		}

		var result = wshShell.Popup("Found a track without a home. Do you wish to rename this?\n"+nameStr+" ("+trackName+")",  0, "Edgar says", 35);
		if (result == 6) { // Yes
			if (flipResult) {
				track.Artist = firstFiltered;
				track.Name = secondFiltered;
			} else {
				track.Artist = secondFiltered;
				track.Name = firstFiltered;
			}
			numTracksRenamed += 1;
		}
		else if (result == 7) { // No
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

