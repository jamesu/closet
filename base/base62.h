//
// Program to convert from any base to/from base10 
// (C)2006 - 2007 Stuart James Urquhart (jamesu@cuppadev.co.uk)
//
// TomB: "yeh! i got Z4g5D points!" (base62)
//

#ifndef bool
#define bool int
#define false 0
#define true 1
#endif

typedef unsigned char U8;
typedef unsigned char UTF8;
typedef signed short S16;
typedef unsigned short U16;

typedef signed long long   S64;
typedef unsigned long long U64;

typedef unsigned short UChar;
typedef unsigned long  UChar32;
#define INVALID_CHAR 0xFFFFFFFF

// ---------------------------------------------------
// Unicode Stuff
// ---------------------------------------------------

char maxBits(UChar32 character);

UTF8 *convertToUTF8(UChar32 character, int *size);
UChar32 convertFromUTF8(UTF8 **in);

// ---------------------------------------------------
// Digit handling
// ---------------------------------------------------

U64 getmaxbasedigits(U64 in, U8 base);
UChar32 inttobasedigit(int in);

U8 basedigittoint(UChar32 symbol); 
const UTF8 *inttobase(const S64 in);

S64 basetoint(UTF8 *in);

#ifdef DO_NUMERALS
// ---------------------------------------------------
// Numeral stuff
// ---------------------------------------------------

void numeraltoint(UTF8 **ptr, S64 *out, bool *do_multiplication, S64 *previous);
bool inttonumeral(UChar32 **ptr, U64 *number);

UTF8 *inttonumerals(const S64 in);
S64 numeralstoint(UTF8 *in);
#endif

// ---------------------------------------------------
// Utility functions
// ---------------------------------------------------

bool loadDigitTable(char *filename);
bool isDigitTableLoaded();
#ifdef DO_NUMERALS
bool loadNumeralTable(char *filename);
bool isNumeralTableLoaded();
#endif
