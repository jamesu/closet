#!/usr/bin/python
'''
Copyright (C) 2004, Stuart James Urquhart (jamesu at gmail.com). All Rights Reserved.

*Reaching the MaterialList in a .dts*

NOTES: 
	If you want to detect which materials are actually used in the shape, you'll have to read the Dts Stream. Refer to the torque source, or the DTSPython sdk for more details.
	Data is specified in order.
	Be careful when reading in shapes with a version lower than 24. e.g. shapes with a version lower than 19 have a differently stored dts stream. Other versions may have differently stored sequence data (though i think it is the same in all versions > 19).

The Header (size = 4*U16) :
	version = U16 (dts = version & 0xFF, exporter = version >> 16)
	totalSize = U16
	offset16 = U16
	offset8 = U16
	
Allocated32 = offset16
Allocated16 = (offset8-offset16) * 2
Allocated8 = (totalSize - offset8) * 4

DTS Stream Size = Allocated32*4 + Allocated16*2 + Allocated8

Skip past the DTS Stream (size = Dts Stream Size), onto the Sequence list.

* Sequence List *
numSequences = U32
for sequence in Sequences:
	Skip 4*15 bytes.
	You will then reach a list of 8 IntegerSet's.

	for each integerSet:
		numInts = U32 (ignore this)
		sz = U32
		Skip sz*4 bytes

We have now reached the MaterialList.

* Material List *

version = U8 (should be 1)
number of Names = S32
for each Name:
	size = U8
	data = U8[size]

This is all you will have to read to get the MaterialNames.
If you want to get to the end of the file, read in 6*4 bytes.

* Python Code *
'''

import sys, array, struct
from array import *
from struct import *

def little_endian():
    return ord(array("i",[1]).tostring()[0])

def getMaterialNames(filename):
	try:
		fs = open(filename, "rb")
	except:
		print "Error: Could not open file %s" % filename
		return None
	
	# Read in File
	hdr = array('i')
	hdr.fromfile(fs, 4)
	# Need to swap header bytes for mac
	if not little_endian():
		hdr.byteswap()
	ver = 0
	ver, totalSize, offset16, offset8 = long(hdr[0]), long(hdr[1]), long(hdr[2]), long(hdr[3])
		
	exporterVersion = ver >> 16
	ver &= 0xFF
   
	# This method might not work for versions < 22
	if ver < 22:
		print "Error: File Version is %d, can only read in version 22 or higher!" % ver
		return None
	
	stream_size = (offset16*4) + ((offset8 - offset16) * 2 * 2) + ((totalSize - offset8) * 4)
	# read in stream_size
	fs.seek(fs.tell() + stream_size)

	# Reached sequence list
	numSequences = struct.unpack('<i', fs.read(calcsize('<i')))[0] #S32
	print "Sequences : %d" % numSequences
	for seq in range(0, numSequences):
		fs.seek(fs.tell() + (4*15))
		for i in range(0, 8):
			sz = struct.unpack('<ii', fs.read(calcsize('<ii')))[1]
			fs.seek(fs.tell() + (sz*4))
	
	# Reached material list
	ver = struct.unpack('<b', fs.read(calcsize('<b')))[0] #U8
	if ver != 1:
		print "Error: incorrect version, or corrupt MaterialList (%d)" % ver
		return None
	
	materials = []
	sz = struct.unpack('<i', fs.read(calcsize('<i')))[0] #S32
	# Read strings, adding a material for each one
	for cnt in range(0, sz):
		st = array('c') 
		# Read in string..
		ss = struct.unpack('<b', fs.read(calcsize('<b')))[0] #U8
		st.fromfile(fs, ss)
		materials.append(st.tostring())
	
	fs.close()
	return materials

if __name__ == "__main__":
	if len(sys.argv) >= 2:
		for arg in sys.argv[1:]:
			names = getMaterialNames(arg)
			if names == None:
				print "Error: Failed to get list of material Names"
			else:
				print "Shape : %s" % arg
				print "Materials : %d" % len(names)
				for i in range(0, len(names)):
					print "%d : %s" % (i, names[i])
	

