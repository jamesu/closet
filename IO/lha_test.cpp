// Copyright (C) 2005 - 2006, James S Urquhart (jamesu at gmail.com). All Rights Reserved.

#include <stdio.h>

typedef unsigned char U8;
typedef unsigned short U16;
typedef unsigned int U32;
typedef unsigned long long U64;

// LHA Structures

typedef struct LHA_header
{
		U16 size;
		U8 method[5];
		U32 compressedSize;
		U32 originalSize;
		U32 lastModifiedTimestamp;
		U8 fileAttribute;
		U8 level;
};

#define LHA_0 0x00
#define LHA_1 0x01
#define LHA_2 0x02
#define LHA_3 0x03

// LHA Extended Header Types

#define LHA_EX_CRC 0x00
#define LHA_EX_FILENAME 0x01
#define LHA_EX_DIRECTORY 0x02
#define LHA_EX_COMMENT   0x3F

#define LHA_EX_DOSATTRIBUTE   0x40
#define LHA_EX_WINTIME        0x41

#define LHA_EX_UNIXPERMISSION 0x50
#define LHA_EX_UNIXGROUP      0x51
#define LHA_EX_UNIXTIME       0x52

#define LHA_EX_NEWATTRIBUTE   0xFF

void dumpHeader(FILE *fp, U32 size)
{
	U8 type;
	U8 temp8;
	U16 temp16;
	U32 temp32;
	U64 temp64;
	U8 *temp;
	
	U32 realSize = size-3;
	
	fread(&type, sizeof(U8), 1, fp);
	printf("  ATTR(%d): ", size);
	switch(type) {
		case LHA_EX_CRC: // CRC16
			fread(&temp16, sizeof(U16), 1, fp);
			printf("crc=%x\n", temp16);
			realSize = 2;
		break;
		case LHA_EX_FILENAME: 
			temp = new U8 [realSize+1];
			fread(temp, realSize, 1, fp);
			temp[realSize+1] = '\0';
			printf("filename='%s'\n", temp);
			delete [] temp;
		break;
		case LHA_EX_DIRECTORY: 
			temp = new U8 [realSize+1];
			fread(temp, realSize, 1, fp);
			temp[realSize+1] = '\0';
			printf("directory='%s'\n", temp);
			delete [] temp;
		break;
		case LHA_EX_COMMENT:
			temp = new U8 [realSize+1];
			fread(temp, realSize, 1, fp);
			temp[realSize+1] = '\0';
			printf("comment='%s'\n", temp);
			delete [] temp;
		break;
		
		case LHA_EX_DOSATTRIBUTE:
			fread(&temp16, sizeof(U16), 1, fp);
			printf("dosattrib=%x\n", temp16);
			realSize = 2;
		break;
		case LHA_EX_WINTIME:
			fread(&temp64, sizeof(U64), 1, fp);
			printf("windows(time) creation=? ");
			fread(&temp64, sizeof(U64), 1, fp);
			printf("write=? ");
			fread(&temp64, sizeof(U64), 1, fp);
			printf("access=?\n");
			realSize = 24;		
		break;

		case LHA_EX_UNIXPERMISSION: // Unix Permission
			fread(&temp16, sizeof(U16), 1, fp);
			printf("unix permission='%d'\n", temp16);
			realSize = 2;
		break;
		case LHA_EX_UNIXGROUP: // Unix Group
			fread(&temp16, sizeof(U16), 1, fp);
			printf("unix gid=%d ", temp16);
			fread(&temp16, sizeof(U16), 1, fp);
			printf("uid=%d\n", temp16);
			realSize = 4;
		break;
		case LHA_EX_UNIXTIME: // Unix Timestamp
			fread(&temp32, sizeof(U32), 1, fp);
			printf("unix time=%d\n", temp32);
			realSize = 4;
		break;
		
		default:
			// Skip to next header size
			printf("UNKNOWN(0x%x)\n", type);
			fseek(fp, realSize, SEEK_CUR);
			return;
		break;
	}
	
	realSize += 3;
	if (realSize != size) {
		realSize = size-realSize;
		printf("DBG: Header %d bytes bigger than it should be!\n", realSize);
		// Presumably bigger
		fseek(fp, realSize, SEEK_CUR);
	}
}

U16 dumpHeaders16(FILE *fp)
{
	U16 nextSize;
	U16 totalSize;
	fread(&nextSize, sizeof(U16), 1, fp);
	totalSize = nextSize;
	while ((nextSize != 0) && (!feof(fp))) {
		dumpHeader(fp, nextSize);
		fread(&nextSize, sizeof(U16), 1, fp);
		totalSize += nextSize;
	}
	return totalSize;
}

// Dumps extended headers
U32 dumpHeaders32(FILE *fp)
{
	U32 nextSize;
	U32 totalSize;
	fread(&nextSize, sizeof(U32), 1, fp);
	totalSize = nextSize;
	while ((nextSize != 0) && (!feof(fp))) {
		dumpHeader(fp, nextSize);
		fread(&nextSize, sizeof(U32), 1, fp);
		totalSize += nextSize;
	}
	return totalSize;
}

int main(int argc, char **argv)
{
	FILE *fp;
	fp = fopen(argv[1], "rb");
	if (fp) {
		printf("Opened '%s'\n", argv[1]);
		while (!feof(fp)) {
			U8 tmp8;
			U8 var8;
			U8 *temp;
			U16 tmp16;
			U32 tmp32;
			LHA_header hdr;
			
			// Read in core header
			fread(&hdr.size, sizeof(U16), 1, fp);
			if ((U8)hdr.size == 0) break;
			
			if ((hdr.level == LHA_3) && (hdr.size != 4)) {
				printf("[3] Incompatible word size (%d)\n", hdr.size);
				break;
			}
			
			fread(hdr.method, 5, 1, fp);
			if (hdr.method[0] != '-') break;
			fread(&hdr.compressedSize, sizeof(U32), 1, fp);
			fread(&hdr.originalSize, sizeof(U32), 1, fp);
			fread(&hdr.lastModifiedTimestamp, sizeof(U32), 1, fp);
			fread(&hdr.fileAttribute, 1, 1, fp);
			fread(&hdr.level, 1, 1, fp);
			
			printf("[%d] ", hdr.level);
			
			// Filename
			if (hdr.level < LHA_2) {
				fread(&var8, sizeof(U8), 1, fp);
				temp = new U8[var8+1];
				fread(temp, sizeof(U8), var8, fp);
				temp[var8] = '\0';
				printf("filename='%s' ", temp);
				delete [] temp;
			}
			
			// CRC16
			fread(&tmp16, sizeof(U16), 1, fp);
			printf("crc=%x ", tmp16);
			
			// OS ID
			if (hdr.level > LHA_0) {
				fread(&tmp8, sizeof(U8), 1, fp);
				printf("osid=%c ", tmp8);
			}
			
			// Extended area (skip)
			if (hdr.level < LHA_2) {
				tmp8 = hdr.size & 0x00FF;
				tmp8 -= var8+24;
				
				// Any significant leftovers?
				if (tmp8 >= 2) {
					printf("\nExtended area of %d bytes (var == %d)!\n", tmp8, var8);
					fseek(fp, tmp8, SEEK_CUR);
				}
			}
			
			// Header size
			if (hdr.level == LHA_3)
				fread(&tmp32, sizeof(U32), 1, fp);
			
			printf("\n");
			
			U32 headerSize;
			// Extended headers
			if (hdr.level > LHA_0) {
				printf("-Extended headers-\n");
				if (hdr.level == LHA_3)
					headerSize = dumpHeaders32(fp);
				else
					headerSize = dumpHeaders16(fp);

				printf("-End of extended headers (%d bytes total)-\n", headerSize);
				
				// Remove header size
				if (hdr.level == LHA_1)
					hdr.compressedSize -= headerSize;
			}
			
			// Extended area (skip)
			if (hdr.level == LHA_2) {
				tmp16 = headerSize + 26;
				if (tmp16 != hdr.size) {
					printf("EXT: %d vs act %d\n", tmp16, hdr.size);
					tmp16 = hdr.size - tmp16;
					fseek(fp, tmp16, SEEK_CUR);
				}
			} else if (hdr.level == LHA_3) {
				headerSize += 32;
				if (headerSize != tmp32) {
					tmp32 -= headerSize;
					fseek(fp, headerSize, SEEK_CUR);
					printf("EXT: %d vs act %d\n", tmp32, headerSize);	
				}
			}
			
			// Finally, compressed data
			fseek(fp, hdr.compressedSize, SEEK_CUR);
			
			//printf("DBG: method==%c%c%c%c%c\n",hdr.method[0],hdr.method[1],hdr.method[2],hdr.method[3],hdr.method[4]);
		}
		printf("EOF\n");
		fclose(fp);
	}
}
