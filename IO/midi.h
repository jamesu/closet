// Copyright (C) 2006, James S Urquhart (jamesu at gmail.com). All Rights Reserved.

#ifndef _MIDI_
#define _MIDI_

#include <stdlib.h>

#define Vector std::vector

// MIDI Structures
typedef struct midi_chunk
{
	U32 id;
	U32 size;
};

typedef struct midi_chunk_data
{
	U32 size;
	U8 *data;
};

// MIDI Meta-Events

#define MIDI_METAEVENT 0xFF

#define EV_SEQNUM      0x0
#define EV_TEXT        0x01
#define EV_COPYRIGHT   0x02
#define EV_TRACKNAME   0x03
#define EV_INSTRUMENT  0x04
#define EV_LYRIC       0x05
#define EV_MARKER      0x06
#define EV_CUEPOINT    0x07
#define EV_PROGRAMNAME 0x08
#define EV_DEVICEPORT  0x09
#define EV_ENDOFTRACK  0x2F
#define EV_TEMPO       0x51
#define EV_SMPTE       0x54
#define EV_TIMESIG     0x58
#define EV_KEYSIG      0x59
#define EV_PROPRIETARY 0x7F
// Following are obsolete
#define EV_CHANNEL     0x20
#define EV_PORT        0x21


// MIDI Status Events
#define MIDI_STATUS    (1 << 7)

#define ST_NOTEOFF         0x8
#define ST_NOTEON          0x9
#define ST_AFTERTOUCH      0xA
#define ST_CONTROLLER      0xB
#define ST_CHANGEPATCH     0xC
#define ST_CHANNELPRESSURE 0xD
#define ST_PITCH           0xE
#define ST_SYS             0xF // Cancels running status (up to 0xF8)

#endif //_MIDI_
