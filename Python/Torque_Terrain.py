'''
Torque_Terrain.py

Copyright (c) 2003 - 2005 Stuart James Urquhart(jamesu at gmail.com)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
'''

import sys, array
from array import *
import DtsPython.Torque_Util
from DtsPython.Torque_Util import *

# Python Script to load Torque .ter files

class TerrainBlock:
	# Constants
	BlockSize = int(256)
	BlockShift = int(8)
	LightmapSize = int(512)
	LightmapShift = int(9)
	ChunkSquareWidth = int(64)
	ChunkSize = int(4)
	ChunkDownShift = int(2)
	ChunkShift = BlockShift - ChunkDownShift
	BlockSquareWidth = int(256)
	SquareMaxPoints = int(1024)
	BlockMask = int(255)
	GridMapSize = 0x15555
	FlagMapWidth = int(128) #< Flags that map is for 2x2 squares.
	FlagMapMask = int(127)
	MaxMipLevel = int(6)
	NumBaseTextures = int(16)
	MaterialGroups = int(8)
	MaxEmptyRunPairs = int(100)
	
class TerrainMaterial:
	# Constants
	Plain          = 0
	Rotate         = 1
	FlipX          = 2
	FlipXRotate    = 3
	FlipY          = 4
	FlipYRotate    = 5
	FlipXY         = 6
	FlipXYRotate   = 7
	RotateMask     = 7
	Empty          = 8
	#define BIT(x) (1 << (x))
	Modified       = 1 << 7 #BIT(7)
	# Must not clobber TerrainFile::MATERIAL_GROUP_MASK bits!
	PersistMask    = 1 << 7 #BIT(7)
	# Stuff we Save
	flags = int(0) # U8
	index = int(0) # U8
	def __init__(self, fs=-1):
		if fs != -1:
			self.flags, self.index = struct.unpack('<BB', fs.read(calcsize('<BB')))
		else:
			self.flags = int(0)
			self.index = int(0)
	def write(self):
		return struct.pack('<BB', flags, index)

class TerrainFile:
	fs = 0
	strTable = StringTable()	# Non Global StringTable
	version = int(3)		# Char in file (U8)
	HeightMap = array('H')		# U16 == H, size BlockSize * BlockSize
	BaseMaterialMap = array('B')
	MaterialMap = []		# Array of Material, size BlockSquareWidth * BlockSquareWidth 
	MaterialFileName = []		# Lots of Strings
	MaterialAlphaMap = []
	TextureScript = array('B')
	HeightFieldScript = array('B')
	### Constants
	Material_Group_Mask = 0x7
	### End Constants
	def __init__(self, fname, read=0):
		if read==1:
			self.fs = open(fname, 'rb')
		else:
			self.fs = open(fname, "wb")
			self.flood()
	
	def __del__(self):
		if self.fs !=(0 or -1):
			self.fs.close()
		# Clear Heightmap
		for h in self.HeightMap:
			self.HeightMap.pop()
		for g in self.MaterialMap:
			self.MaterialMap.pop()
		for bm in self.BaseMaterialMap:
			self.BaseMaterialMap.pop()
		for mn in self.MaterialFileName:
			self.MaterialFileName.pop()
		for ma in self.MaterialAlphaMap:
			self.MaterialAlphaMap.pop()
		for ts in self.TextureScript:
			self.TextureScript.pop()
		for hf in self.HeightFieldScript:
			self.HeightFieldScript.pop()
	
	def flood(self):
		# Makes a blank terrain with 1 material 
		# HeightMap
		for h in range(0, TerrainBlock().BlockSize * TerrainBlock().BlockSize):
			self.HeightMap.append(0) # This is totally at the bottom
		# Base Material Map
		for m in range(0, TerrainBlock().BlockSquareWidth * TerrainBlock().BlockSquareWidth):
			self.BaseMaterialMap.append(TerrainMaterial.Plain() & self.Material_Group_Mask) 
			# reminder : needs to have group mask
		# Material filenames
		mystr = array('c')
		mystr.fromString("default")
		self.MaterialFileName.append(mystr)
		for m in range(0, TerrainBlock().MaterialGroups-1):
			self.MaterialFileName.append(None)
		self.MaterialAlphaMap.append(array('b'))
		for a in range(0, TerrainBlock().BlockSize * TerrainBlock().BlockSize):
			self.MaterialAlphaMap[0].append(0)
		for count in range(0, TerrainBlock().BlockSize * TerrainBlock().BlockSize):
			self.MaterialMap.append(TerrainMaterial())
		
	def save(self):
		# Note. At the moment, im presuming we don't have to convert anything back (at least here), etc
		# Write the version and heightfield
		self.fs.write(struct.pack('<B', self.version))
		self.HeightMap.tofile(self.fs)
		# Write the material group map, after merging flags
		for count in range(0, TerrainBlock().BlockSquareWidth * TerrainBlock().BlockSquareWidth):
			# We will not apply the mask to the flags since it doesn't seem to work properly yet
			val = self.BaseMaterialMap[count]
			#print "Val was %d" % (val)
			val |= self.BaseMaterialMap[count] & self.Material_Group_Mask
			#print "Val now is %d" % (val)
			self.fs.write(struct.pack('<B', val))
		count = 0
		# Now we have the strings
		for count in range(0, len(self.MaterialFileName)):
			if self.MaterialFileName[count] != None:
				self.fs.write(struct.pack('<B', len(self.MaterialFileName[count])))
				self.MaterialFileName[count].tofile(self.fs)
			else:
				self.fs.write(struct.pack('<B', 0))
		# Material Alpha maps (for mats used)...
		for count in range(0, TerrainBlock().MaterialGroups):
			if self.MaterialFileName[count] != None: # If we have a material here...
				if self.MaterialAlphaMap[count] == None:
					print "Error: Must have a material map here!"
					return None
				self.MaterialAlphaMap[count].tofile(self.fs)
		# TextureScript
		self.fs.write(struct.pack('<I', len(self.TextureScript)))
		self.TextureScript.tofile(self.fs)
		# HeightFieldScript
		self.fs.write(struct.pack('<I', len(self.HeightFieldScript)))
		self.HeightFieldScript.tofile(self.fs)
	
	def read(self):
		ver = struct.unpack('<B', self.fs.read(calcsize('<B')))
		if ver[0] != self.version:
			print "ERROR: Cannot read this version %d terrain!, only %d supported" % (ver[0], 3)
			return -1
		self.HeightMap.fromfile(self.fs, TerrainBlock().BlockSize * TerrainBlock().BlockSize)
		for count in range(0, TerrainBlock().BlockSize * TerrainBlock().BlockSize):
			self.MaterialMap.append(TerrainMaterial())
		# Now Read in Other stuff...
		for count in range(0, TerrainBlock().BlockSize * TerrainBlock().BlockSize):
			# We will not apply the mask to the flags since it doesn't seem to work properly yet
			val = int(0)
			val = struct.unpack('<B', self.fs.read(calcsize('<B')))
			self.BaseMaterialMap.append(val[0] & self.Material_Group_Mask)
			self.MaterialMap[count].flags = val[0] & TerrainMaterial().PersistMask
		# Read the MaterialList Info
		count = 0
		maxMaterials = TerrainBlock().MaterialGroups
		# Example of translated monkey code
		for count in range(0,TerrainBlock().MaterialGroups):
			self.MaterialFileName.append(self.strTable.reads(self.fs))
			if self.MaterialFileName[count] == None:
				maxMaterials -= 1
		# Note : The original code clears out the strings that are blank and maxMaterials stores the # of materials used...
		#         We do not need to do this as reads() returns None anyway
		# >> Good idea, but maxMaterials isn't actually used though!!
		print "Materials used in Terrain : %d" % (maxMaterials)
		for count in range(0, TerrainBlock().MaterialGroups):
			if (self.MaterialFileName[count] != None): # If its None, then they didn't store a material!
				foo = array('B')
				foo.fromfile(self.fs, TerrainBlock().BlockSize * TerrainBlock().BlockSize)
				self.MaterialAlphaMap.append(foo)
		# Version 3+ stuff...
		# Texture Script
		fLen = 0
		fLen = struct.unpack('<I', self.fs.read(calcsize('<I')))
		if fLen > 0:
			self.TextureScript.fromfile(self.fs, fLen[0])
		
		# HeightField Script
		fLen = struct.unpack('<I', self.fs.read(calcsize('<I')))
		if fLen > 0:
			self.HeightFieldScript.fromfile(self.fs, fLen[0])

def Test_Terrain():
	# Testing Code
	
	myTer = TerrainFile("features.ter", 1)
	myTer.read()
	myOtherTer = TerrainFile("clone_features.ter")
	# Copy everything from myTer
	myOtherTer.HeightMap = myTer.HeightMap
	myOtherTer.BaseMaterialMap = myTer.BaseMaterialMap
	myOtherTer.MaterialMap = myTer.MaterialMap
	myOtherTer.MaterialFileName = myTer.MaterialFileName
	myOtherTer.MaterialAlphaMap = myTer.MaterialAlphaMap
	myOtherTer.TextureScript = myTer.TextureScript
	myOtherTer.HeightFieldScript = myTer.HeightFieldScript
	# Now Edit the Terrain
	#pos = 0
	#for x in range(0, 256):
	#	for y in range(0, 256): # Flatten the top
	#		myOtherTer.HeightMap[pos] = ((x*x) + (y))
	#		pos += 1
	# So finally, save!
	myOtherTer.save()
	del myTer
	
if __name__ == "__main__":
	Test_Terrain()
