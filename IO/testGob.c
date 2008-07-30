// Copyright (C) 2006, James S Urquhart (jamesu at gmail.com). All Rights Reserved.

#include <stdio.h>

typedef  unsigned int uint32;
typedef char byte;

inline uint32 endianSwap(const uint32 in_swap)
{
   return (uint32)(((in_swap >> 24) & 0x000000ff) |
              ((in_swap >>  8) & 0x0000ff00) |
              ((in_swap <<  8) & 0x00ff0000) |
              ((in_swap << 24) & 0xff000000));
}

#define EndianU32_LtoN(x) endianSwap(x)


typedef struct
{
	uint32 magic;
	byte version;
	uint32 ofsFiles;  // pointer to file list 
	uint32 directoryOffset; // pointer to first directory entry
} gobHeader_t;

typedef struct
{
	uint32 offset;
	uint32 size;
	char filename[127];
} gobFile_t;

int main(int argc, char **argv)
{
	printf("GOB Extractor\n");
	if (argc < 1)
		return 0;
		
	// Open input
	printf("Extracting from %s\n", argv[1]);
	
	FILE *fp = fopen(argv[1], "rb");
	if (fp)
	{
		gobHeader_t header;
		gobFile_t file_info;
		uint32 numFiles;
		int i;
		
		fread(&header, sizeof(gobHeader_t), 1, fp);
		if (EndianU32_LtoN(header.magic) == 0x20424f47 && header.version == 0x14)
		{
			// Now we can try reading...
			header.ofsFiles = EndianU32_LtoN(header.ofsFiles);
			header.directoryOffset = EndianU32_LtoN(header.directoryOffset);
			
			fseek(fp, header.ofsFiles, SEEK_SET);
			fread(&numFiles, sizeof(uint32), 1, fp);
			numFiles = EndianU32_LtoN(numFiles);
			
			//fseek(fp, header.directoryOffset, SEEK_SET);
			
			printf("Files : %d\n", numFiles);
			for (i=0; i<numFiles; i++)
			{
				//break;
				if (!fread(&file_info, sizeof(gobFile_t), 1, fp)) 
					break;
				file_info.offset = EndianU32_LtoN(file_info.offset);
				file_info.size = EndianU32_LtoN(file_info.size);
				file_info.filename[126] = '\0';
				printf("'%s' : offs=%d, len=%d\n", file_info.filename, file_info.offset, file_info.size);
			}
			fclose(fp);
		}
		else {
			fclose(fp);
			printf("INVALID GOB!\n");
		}
	}
	else
		printf("FAILED!\n");
}