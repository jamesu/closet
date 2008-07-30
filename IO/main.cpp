// (C) Copyright 2006, James S Urquhart (jamesu at gmail.com). All Rights Reserved.

#include <memory.h>
#include <stdio.h>

typedef unsigned char U8;
typedef unsigned short U16;
typedef unsigned long U32;

#include "midi.h"

inline U16 endianSwap(const U16 in_swap)
{
   return U16(((in_swap >> 8) & 0x00ff) | // right
              ((in_swap << 8) & 0xff00)); // left
}

// 11111111 00000000 >>
// 11111111 00000000 (0x00ff)
// 11111111 00000000 &

// 00000000 11111111 <<
// 00000000 11111111 (0xff00)
// 00000000 11111111 &

// 11111111 00000000
// 00000000 11111111
// 11111111 11111111 |

// e.g.

// 10101010 00000000 >>
// 11111111 00000000 (0x00ff)
// 10101010 00000000 &

// 00000000 10101010 >>
// 00000000 11111111 (0xff00)
// 00000000 10101010 &

// 10101010 00000000
// 00000000 10101010
// 10101010 10101010 |

inline U32 endianSwap(const U32 in_swap)
{
   return U32(((in_swap >> 24) & 0x000000ff) |
              ((in_swap >>  8) & 0x0000ff00) |
              ((in_swap <<  8) & 0x00ff0000) |
              ((in_swap << 24) & 0xff000000));
}

unsigned long ReadVarLen(U8 *ptr, U8 *size)
{
    register unsigned long value;
    register unsigned char c;

	*size=1;
    if ( (value = *ptr++) & 0x80 )
    {
       value &= 0x7F;
       do
       {
         value = (value << 7) + ((c = *ptr++) & 0x7F);
         (*size)++;
       } while (c & 0x80);
    }
    
    //printf("                   ReadVarLen: [%d] %lu\n", *size, value);

    return(value);
}

char *ReadText(U8 *ptr, unsigned long size) {
	char *text = new char[size+1];
	memcpy(text, ptr, size);
	text[size] = '\0';
	return text;
}

void readChunkData(midi_chunk *Chunk, midi_chunk_data *cdata, FILE *fp)
{
	printf("readChunkData: Size(%lu)\n", Chunk->size);
	
	cdata->size = Chunk->size;
	cdata->data = new U8[cdata->size];
	fread(cdata->data, sizeof(U8), cdata->size, fp);
}

bool readMidiEvent(U8 status, U8 *ptr, unsigned long *size)
{
	U8 *startPtr = ptr;
	U8 type  = status >> 4;
	U8 param = status << 4;
	switch (type) {
		case ST_SYS:
			printf("{SYS} ");
			// Determine what we are modifying...
			switch (param) {
				case 0x0: // SYSEX start
					// TODO: better error handling
					while (!(*ptr++ & MIDI_STATUS)) {;}
					printf("SYSEX\n");
				break;
				case 0x1: // Quarter frame sync
					param = *ptr++;
					printf("QUARTER SYNC (%d)\n", param);
				break;
				case 0x2: // Song position
					ptr += 2;
					printf("SONG POS (TODO)\n");
				break;
				case 0x3: // Song select
					param = *ptr++;
					printf("SONG SELECT (%d)\n", param);
				break;
				case 0x6: // Tune request
					printf("TUNE REQUEST (%d)\n", param);
				break;
				case 0x7: // SYSEX end
					printf("Warning: SYSEX End encountered without beginning!\n");
				break;
				case 0x8: // MIDI clock
					printf("MIDI CLOCK\n");
				break;
				case 0x9: // MIDI tick
					printf("MIDI TICK\n");
				break;
				case 0xA: // MIDI start
					printf("MIDI START\n");
				break;
				case 0xB: // MIDI continue
					printf("MIDI CONTINUE\n");
				break;
				case 0xC: // MIDI stop
					printf("MIDI STOP\n");
				break;
				case 0xE: // MIDI activesense
					printf("MIDI STOP\n");
				break;
				case 0xF: // MIDI reset
					printf("MIDI RESET\n");
				break;
				default:
					printf("UNKNOWN\n");
				break;
			}
		break;
		case ST_NOTEOFF:
			printf("{NOTEOFF} [%d] ", param);
			param = *ptr++;
			printf("note=%d ", param);
			param = *ptr++;
			printf("velocity=%d\n", param);
		break;
		case ST_NOTEON:
			printf("{NOTEON} [%d] ", param);
			param = *ptr++;
			printf("note=%d ", param);
			param = *ptr++;
			printf("velocity=%d\n", param);
		break;
		case ST_AFTERTOUCH:
			printf("{AFTERTOUCH} [%d] ", param);
			param = *ptr++;
			printf("note=%d ", param);
			param = *ptr++;
			printf("pressure=%d\n", param);
		break;
		case ST_CONTROLLER:
			printf("{CONTROLLER} [%d] ", param);
			param = *ptr++;
			printf("controller=%d ", param);
			param = *ptr++;
			printf("value=%d\n", param);
		break;
		case ST_CHANGEPATCH:
			printf("{CHANGEPATCH} [%d] ", param);
			param = *ptr++;
			printf("to=%d\n", param);
		break;
		case ST_CHANNELPRESSURE:
			printf("{CHANNELPRESSURE} [%d] ", param);
			param = *ptr++;
			printf("pressure=%d\n", param);
		break;
		case ST_PITCH:
			printf("{PITCH} [%d]\n", param);
			ptr += 2;
		break;
		default:
			printf("!! {unknown} (%d)!!\n", type);
			// This should *not* happen!
			*size = 0;
			/*while (!(*ptr & MIDI_STATUS)) {
				ptr++; (*size)++;
			}*/
			return false;
		break;
	}
	
	*size = (ptr - startPtr);
	return true;
}

void readMetaEvent(U8 *ptr, unsigned long *size)
{
		char *text = NULL;
		U8 event = *ptr++;
		U8 incSz = 0;
		*size = ReadVarLen(ptr, &incSz); ptr += incSz;
		
		switch (event) {
			case EV_SEQNUM:
				printf("[SEQNUM] (%lu)\n", *size);
				// TODO
			break;
			case EV_TEXT:
				text = ReadText(ptr, *size);
				printf("[TEXT] (%s)\n", text);
				delete [] text;
			break;
			case EV_TRACKNAME:
				text = ReadText(ptr, *size);
				printf("[TRACKNAME] (%s)\n", text);
				delete [] text;
			break;
			case EV_COPYRIGHT:
				text = ReadText(ptr, *size);
				printf("[COPYRIGHT] (%s)\n", text);
				delete [] text;
			break;
			case EV_INSTRUMENT:
				text = ReadText(ptr, *size);
				printf("[INSTRUMENT] (%s)\n", text);
				delete [] text;
			break;
			case EV_LYRIC:
				text = ReadText(ptr, *size);
				printf("[LYRIC] (%s)\n", text);
				delete [] text;
			break;
			case EV_MARKER:
				text = ReadText(ptr, *size);
				printf("[MARKER] (%s)\n", text);
				delete [] text;
			break;
			case EV_CUEPOINT:
				text = ReadText(ptr, *size);
				printf("[CUEPOINT] (%s)\n", text);
				delete [] text;
			break;
			case EV_PROGRAMNAME:
				text = ReadText(ptr, *size);
				printf("[PROGRAMNAME] (%s)\n", text);
				delete [] text;
			break;
			case EV_DEVICEPORT:
				text = ReadText(ptr, *size);
				printf("[DEVICEPORT] (%s)\n", text);
				delete [] text;
			break;
			case EV_ENDOFTRACK:
				printf("[ENDOFTRACK] (%lu)\n", *size);
				// TODO: let reader know!
			break;
			case EV_TEMPO:
				printf("[TEMPO] (%lu)\n", *size);
				// TODO
			break;
			case EV_SMPTE:
				printf("[SMPTE] (%lu)\n", *size);
				// TODO
			break;
			case EV_TIMESIG:
				printf("[TIMESIG] (%lu)\n", *size);
				// TODO
			break;
			case EV_KEYSIG:
				printf("[KEYSIG] (%lu)\n", *size);
				// TODO
			break;
			case EV_PROPRIETARY:
				printf("[PROPRIETARY] (%lu)\n", *size);
				// TODO
			break;
			// Following are obsolete
			case EV_CHANNEL:
			case EV_PORT:
				printf("[OBSOLETE] (%lu)\n", *size);
			break;
			default:
				// Unknown, so lets just skip
				printf("[UNKNOWN] (%d[%lu])\n", event, *size);
			break;
		}
		
		// Lets not forget length of Variable Length...
		(*size) += incSz+1;
}

int main(int argc, char **argv)
{
	U16 tracks;
	U16 division;
	U16 type;
	FILE *fp;
	midi_chunk Chunk;
	
	midi_chunk_data *trackData;
	trackData = NULL;
	
	printf("Midi loading test\n");
	
	char *filename = argv[1];
	fp = fopen(filename, "rb");
	
	bool error = false;
	
	if (!fp)
	{
		fprintf(stdout, "Error: %s could not be opened!\n", filename);
		error = true;
	} else {
		fread(&Chunk, sizeof(midi_chunk), 1, fp);
		
		#ifndef BIG_ENDIAN
		Chunk.id = endianSwap(Chunk.id);
		Chunk.size = endianSwap(Chunk.size);
		#endif
	
		if (Chunk.id!= 0x4d546864) { // MThd
			fprintf(stderr, "Error: unknown starting chunk!\n");
			error = true;
		} else {
			// Go ahead...
			fread(&type, sizeof(U16), 1, fp);
			fread(&tracks, sizeof(U16), 1, fp);
			fread(&division, sizeof(U16), 1, fp);
			#ifndef BIG_ENDIAN
			type = endianSwap(type);
			tracks = endianSwap(tracks);
			division = endianSwap(division);
			#endif
	
			printf("MidiFileTransport: Starting chunk size == %lu\n", Chunk.size);
			fseek(fp, Chunk.size+8, SEEK_SET);
			
			printf("MidiFileTransport: type %u midi\n--------------------\n", type);
			
			if (type == 0 && tracks != 1) {
				fprintf(stderr, "MidiFileTransport: type %d with %d tracks!\n", type, tracks);
			} else {
				trackData = new midi_chunk_data[tracks];
				//memset(trackData, 0, tracks*sizeof(char*));
				printf("MidiFileTransport: created %d tracks\n", tracks);
				int chunk=0;
				long pos;
				
				// Ok, lets start reading!
				while (!feof(fp)) {
						bool critical = false;
						pos = ftell(fp);
						
						// Lets have a look now...
						if (fread(&Chunk, sizeof(midi_chunk), 1, fp) != 1)
							break;
						
						#ifndef BIG_ENDIAN
						Chunk.id = endianSwap(Chunk.id);
						Chunk.size = endianSwap(Chunk.size);
						#endif
						
						switch (Chunk.id) {
							case 0x4d546864: // MThd
								// WTF is this doing here?
								printf("MidiFileTransport: i thought we just read the header?\n");
							break;
							case 0x4d54726b: // MTrk
								//printf("MidiFileTransport: MTrk(%d) being read(%lu)\n", chunk, Chunk.size);
								readChunkData(&Chunk, &trackData[chunk++], fp);
							break;
							default:
								// Skip chunk
								printf("MidiFileTransport: Unknown(%lu) being skipped\n", Chunk.id);
								critical = true;
								fseek(fp, Chunk.size, SEEK_CUR);
							break;
						}
						if (critical) break;			
				}
				printf("MidiFileTransport: %d/%d tracks read\n", chunk, tracks);
			}
		}
	}
	
	if (error)
	{
		return 1;
	}
	
	printf("--------------------\n");
	for (int i=0;i<tracks;i++) {
		printf("Midi Events(Track %d):\n", i);
		if (trackData[i].size == 0) {
			printf("N/A\n");
			continue;
		}
		
		U8 *ptr = trackData[i].data;
		U8 *end = trackData[i].data+trackData[i].size;
		
		U8 eventStatus = 0;
		U8 runningStatus = 0;
		unsigned long size = 0;
		
		while (ptr < end) {
			U8 tmp;
			
			// Timecode
			U32 time = ReadVarLen(ptr, &tmp); ptr += tmp;
			printf("|+%lu| ", time);
			
			// Status
			eventStatus = *ptr;
			if (!(eventStatus & MIDI_STATUS)) {
				// Could be running status
				if (runningStatus == 0) {
					// Skip
					continue; ptr++;
				}
				else
					eventStatus = runningStatus;
			} else ptr++;
			
			#ifdef DEBUG_POS
			U32 calcPos = ptr - trackData[i].data;
			printf(">> spos == %lu\n", calcPos);
			#endif
			
			if (eventStatus == MIDI_METAEVENT)
				readMetaEvent(ptr, &size);
			else if (!readMidiEvent(eventStatus, ptr, &size)) {
				printf("\n-- SKIPPING REST OF TRACK --\n");
				break;
			}
			
			// Set running status
			if (((eventStatus >> 4) == ST_SYS) && ((eventStatus << 4) < 0x8))
				runningStatus = 0;
			else
				runningStatus = eventStatus;
			
			// Cleanup
			ptr += size;
			
			#ifdef DEBUG_POS
			calcPos = ptr - trackData[i].data;
			printf(">> epos == %lu\n", calcPos);
			#endif
		}
		
		signed char diff = ptr - end;
		if (ptr != end) printf(">> Warning: overrun by %d bytes\n", diff);
	}
	
	
	printf("--------------------\n");
	
	if (trackData != NULL) {
		printf("MidiFileTransport: cleaning up tracks\n");
		for (int i=0;i<tracks;i++) {
			if (trackData[i].size == 0)
				printf("MidiFileTransport: Track(%d) does not exist, skipping\n", i);
			else {
				delete [] trackData[i].data;
				printf("MidiFileTransport: Track(%d) deleted\n", i);
			}
		}
		delete [] trackData;
		printf("MidiFileTransport: Track list deleted\n");
	}
	fclose(fp);
	
	printf("Done.\n");
}
