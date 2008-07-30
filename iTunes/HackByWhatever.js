// Copyright (C) 2005, James S Urquhart (jamesu at gmail.com). All Rights Reserved.

// Create interface objects
var	iTunesApp = WScript.CreateObject("iTunes.Application");
var	mainLibrary = iTunesApp.LibraryPlaylist;
var	mainLibrarySource = iTunesApp.LibrarySource;

// Track info
var	tracks = mainLibrary.Tracks;
var	numTracks = tracks.Count;
var     numTracksCreated = 0;
var	i;

// FIXME take a -v parameter eventually
var verbose = false;

// first, make an array indexed by album name
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

for (var track in artistList)
{
	// We need to look at the "Title" and extract the parts...
	WScript.Echo("NOALBUM: Track: " + track.Title);
}

/*
for (var albumNameKey in albumArray)
{
	var albumPlayList;
	var trackArray = albumArray[albumNameKey];

	if (verbose)
		WScript.Echo("Creating playlist " + albumNameKey);
	
	numPlaylistsCreated++;
	
	albumPlaylist = iTunesApp.CreatePlaylist(albumNameKey);
	
	for (var trackIndex in trackArray)
	{
		var		currTrack = trackArray[trackIndex];
		
		if (verbose)
			WScript.Echo("   Adding " + currTrack.Name);
		
		albumPlaylist.AddTrack(currTrack);
	}
}*/

if (numTracksRenamed == 0)
{
	WScript.Echo("No tracks renamed!");
}
else
{
	WScript.Echo(numTrackedRenamed + " tracks renamed.");
}

