//
// Program to convert from any base to/from base10 
// (C)2006 - 2007 Stuart James Urquhart (jamesu@cuppadev.co.uk)
//
// TomB: "yeh! i got Z4g5D points!" (base62)
//

#define DO_NUMERALS
// #define DEBUG_PRINTTABLE

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

#include "base62.h"

// Output buffers
UTF8 outbase[1024 * 1];       // 1kb
UChar32 outbase_32[1024 * 1]; // 4kb

// Misc stuff
UTF8 *neg_char = (UTF8*)"-";

// Digits
bool	use_digits = true;
UChar32	*digit_table = NULL;
U8		digit_table_size = 0;
U8		digit_table_base = 0;

#ifdef DO_NUMERALS
// Numerals
// Interpreter allows for numbers to be multiplied by 100 via wrapping them in |,
// but overline's or underline's should be handled in the numeral table.
// 
// Note: Numerals in the table must be in numeric order (smallest to biggest).
//       Refer to loadNumeralTable() for the table format.
//
UChar32	*numeral_table = NULL; // e.g. I V X  L  C   D   M
int		*numeral_value = NULL; // e.g. 1 5 10 50 100 500 1000
U8		numeral_table_size = 0;
#endif

// ---------------------------------------------------
// Unicode Stuff
// ---------------------------------------------------

UTF8 highLookup[] = {
	0x7F, // 01111111 (ASCII)
	0x3F, // 00111111 (continue)
	0x1F, // 00011111 (1 6bit block following)
	0xF,  // 00001111 (2 6bit blocks following)
	0x7,  // 00000111 (3 6bit blocks following)
	0x3,  // 00000011 (4 6bit blocks following)
	0x1,  // 00000001 (5 6bit blocks following)
};

UTF8 highSetLookup[] = {
	0x0,   // 0??????? (ASCII)
	0x80,  // 10?????? (continue)
	0xC0,  // 110????? (1 6bit block following)
	0xE0,  // 1110???? (2 6bit blocks following)
	0xF0,  // 11110??? (3 6bit blocks following)
	0xF8,  // 111110?? (4 6bit blocks following)
	0xFC,  // 1111110? (5 6bit blocks remaining)
};

char maxBits(UChar32 character)
{
	char count = 0;
	while (character != 0)
	{
		character /= 2;
		count++;
	}
	return count;
}

UTF8 utf8_out[32];

UTF8 *convertToUTF8(UChar32 character, int *size)
{
	char bits = maxBits(character);
	UTF8 *ptr = utf8_out;

	// Need to fit bits into 6bit chunks - however, we also need to fill
	// in bits in the first chunk.
	// No more than 5 6bit chunks can exist

	int maxChunks = bits / 6; // Potential chunks
	int remChunks = bits % 6; // Chunks left over

	if (((maxChunks * 6) + remChunks) < 8)
	{
		// We can fit this into a single ASCII byte
		//printf("ASCII BYTE DETECTED (%d chunks, %d remaining)\n", maxChunks, remChunks);
		remChunks += (maxChunks*6);
		maxChunks = 0;
	} else {
		maxChunks++; // We count from 2, not 1
	}

	// Fill initial chunk
	*ptr = highSetLookup[maxChunks];
	U8 temp = ((U8)character) & highLookup[maxChunks];
	*ptr |= temp;
	character = character >> (7-maxChunks);
	ptr++;

	//printf("%s!\n", printBits(*ptr));

	// Add on the rest of the bytes
	while (maxChunks > 1)
	{
		// Fill in another chunk
		*ptr = highSetLookup[1];
		unsigned char temp = (unsigned char)character & highLookup[1];
		*ptr |= temp;
		//printf("THEN: %s\n", printBits(*ptr));
		ptr++;
		character = character >> 6;
		maxChunks--;
	}

	*size = ptr - utf8_out; // should be ok
	*ptr = '\0';
	return utf8_out;
}

UChar32 convertFromUTF8(UTF8 **in)
{
	char char_size = 0;
	unsigned char cur_char_pos = 0;
	UChar32 cur_char = 0;
	UChar32 temp = 0;
	UTF8 *ptr = *in;

	if (*ptr == '\0') {
		//printf("EOS\n");
		return INVALID_CHAR;
	}

	while (*ptr & (1 << (7-char_size)))
		char_size++;

	if (char_size == 1) // continue bits
	{
		//printf("Warning: Invalid UTF-8, skipping.\n");
		*in++;
		return INVALID_CHAR;
	}

	cur_char = *ptr & highLookup[char_size];
	//printf("CC:%s\n", printBits(cur_char));
	cur_char_pos = 7-char_size;

	//printf("[CHAR] %d bytes (initial=%s) pos=%d\n", char_size, pb_out, cur_char_pos);

	if (char_size != 0)
		char_size--;

	ptr++;

	while (char_size != 0)
	{
		if (!(*ptr & (1 << 7)))
		{
			// Should never happen
			//printf("Warning: Malformed UTF-8(%d), skipping.\n", char_size);
			*in = ptr+1;
			return INVALID_CHAR;
		}

		temp = (*ptr & 0x3F) << cur_char_pos;
		cur_char |= temp;
		cur_char_pos += 6;

		ptr++;
		char_size--;	
	}

	*in = ptr;
	return cur_char;
}

// ---------------------------------------------------
// Digit handling
// ---------------------------------------------------

U64 getmaxbasedigits(U64 in, U8 base)
{
	U64 out = 0;
	U64 calc = in;
	while (calc != 0)
	{
		calc /= base;
		out++;
	}
	return out;
}

UChar32 inttobasedigit(int in)
{
	if (in >= 0 && in < digit_table_size) {
		return digit_table[in];
	}
	return INVALID_CHAR;
}

U8 basedigittoint(UChar32 symbol)
{
	// Note to self: horribly slow, but works for now
	U8 i;
	for (i=0; i<digit_table_size; i++)
	{
		if (digit_table[i] == symbol) {
			return i;
		}
	}
	return 0;
}

const UTF8 *inttobase(const S64 in)
{
	U64 excess = 0;
	U64 real_in;
	int size = 0;

	UChar32 *realbase = outbase_32;
	if (in < 0) {
		// If negative, convert to positive
		*realbase++ = convertFromUTF8(&neg_char);
		real_in = -in;
		printf("%lld -> %lld\n", in, real_in);
		excess = real_in % digit_table_base;
		real_in = real_in - excess;

	} else {
		// Otherwise, proceed as normal
		excess = in % digit_table_base;
		real_in = in - excess;	
	}

	UChar32 b62_excess = 0;
	b62_excess = inttobasedigit((int)excess);

	printf("Excess digits: %lld (%s)\n", excess, convertToUTF8(b62_excess, &size));
	U64 digit = getmaxbasedigits(real_in, digit_table_base);

	if (digit == 0) {
		digit++;
	}

	realbase[digit] = INVALID_CHAR;
	realbase[digit-1] = b62_excess;

	printf("Max digits: %lld\n", digit);
	digit--;

	while (digit != 0)
	{
		U64 max_value = (U64)powl((long double)digit_table_base, (long double)digit);
		U64 digit_value = real_in / max_value;

		UChar32 cur_digit = inttobasedigit((int)digit_value);
		printf("Digit[%lld]: %s pow == %lld {%lld} | %lld\n", digit, convertToUTF8(cur_digit, &size), max_value, digit_value, real_in);

		*realbase++ = cur_digit;
		real_in -= digit_value * max_value;
		digit--;
	}

	// Convert to UTF-8
	UTF8 *ptr = outbase;
	UTF8 *end = outbase + sizeof(outbase);
	realbase = outbase_32;
	while (*realbase != INVALID_CHAR && ptr < end)
	{
		UTF8 *convert = convertToUTF8(*realbase, &size);
		while (size--)
		{
			*ptr++ = *convert++;
		}
		realbase++;
	}
	*ptr = '\0';

	return outbase;
}

S64 basetoint(UTF8 *in)
{
	bool negative = false;
	UTF8 *ptr;
	UTF8 *start = in;
	int base_size = 0;

	if (*in == '-') {
		negative = true;
		start++;
	}

	// We need to process the number backwards, so lets copy it to a buffer...
	ptr = (UTF8*)start;
	while (*ptr != '\0')
	{
		outbase_32[base_size++] = convertFromUTF8(&ptr);
	}

	U64 power = 1;
	U64 out = 0;

	while (base_size--)
	{

		UChar32 in_digit;

		if (outbase_32[base_size] == INVALID_CHAR) // whoops!
			in_digit = 0;
		else
			in_digit = basedigittoint(outbase_32[base_size]);

		//ptr = (const char*)basedigittoint((const U8*)ptr, &in_digit);

		printf("Next power... (%d) [%lld]\n", in_digit, power);
		out += power * in_digit;

		if (power == 1) {
			power = digit_table_base;
		} else {
			power *= digit_table_base;
		}

	}

	if (negative) {
		return -((S64)out);
	} else {
		return (S64)out;
	}
}

#ifdef DO_NUMERALS
// ---------------------------------------------------
// Numeral stuff
// ---------------------------------------------------

void numeraltoint(UTF8 **ptr, S64 *out, bool *do_multiplication, S64 *previous)
{
	// Note to self: horribly slow, but works for now
	if (**ptr == '|') {
		*do_multiplication = !(*do_multiplication);
		*out = 0;
		*previous = 0;
		U8 *nptr = *ptr;
		nptr++;
		*ptr = nptr;
		return;
	}

	UChar32 symbol = convertFromUTF8(ptr); // increments ptr
	U8 i;
	for (i=0; i<numeral_table_size; i++)
	{
		//printf("%d vs %d\n", symbol, numeral_table[i]);
		if (numeral_table[i] == symbol) {
			// If the previous numeral is lower than the current, subtract twice its value
			// e.g. CM = 100 + (1000 - 200) = 900
			*out = (*previous != 0) && (*previous < numeral_value[i]) ? numeral_value[i] - (*previous * 2) : numeral_value[i];
			*previous = numeral_value[i];
			return;
		}
	}
	*out = 0;
}

bool inttonumeral(UChar32 **ptr, U64 *number)
{
	// Find biggest numeral that divides into this number
	int i;
	//printf("inttonumeral:%s, %lld\n", ptr, *number);
	for (i=numeral_table_size-1; i != -1; i--)
	{
		U64 calc = *number / numeral_value[i];
		UChar32 *nptr = *ptr;
		//printf("/ x%d == %lld ?\n", numeral_value[i], calc);
		if (calc > 0)
		{
			// Add calc amount of numerals to the output
			*number -= calc * numeral_value[i];
			while (calc != 0)
			{
				*nptr++ = numeral_table[i];
				calc--;
			}
			*ptr = nptr;
			return true;
		}
	}

	return false;
}

UTF8 *inttonumerals(const S64 in)
{
	U64 real_in;
	UChar32 *realbase;

	// First pass : Factor in biggest -> smallest numerals (end -> start of table)
	realbase = outbase_32;
	real_in = in;
	if (in < 0) {
		// If negative, convert to positive
		*realbase++ = convertFromUTF8(&neg_char);
		real_in = -in;
	}

	UChar32 *realbase_end = outbase_32 + sizeof(outbase_32);
	while (realbase != realbase_end)
	{
		if (!inttonumeral(&realbase, &real_in))
			break;
	}
	*realbase = INVALID_CHAR;

	// TODO: 
	// Second pass : Sort out duplicate symbols (e.g. IIII == IV)

	// Convert to UTF-8
	UTF8 *ptr = outbase;
	UTF8 *end = outbase + sizeof(outbase);
	realbase = outbase_32;
	while (*realbase != INVALID_CHAR && ptr < end)
	{
		int size = 0;
		UTF8 *convert = convertToUTF8(*realbase, &size);
		while (size--)
		{
			*ptr++ = *convert++;
		}
		realbase++;
	}
	*ptr = '\0';

	return outbase;
}

S64 numeralstoint(UTF8 *in)
{
	bool negative = false;
	UTF8 *ptr = in;
	UTF8 *end = in + strlen((const char*)in);
	if (*in == '-') {
		negative = true;
		ptr++;
	}

	S64 out = 0;
	S64 previous = 0;

	// TODO: fix potential bug if a number such as X|V|C|1| (690) pops up

	bool do_multiplication = false; // multiply by 100?
	do
	{
		S64 in_value = 0;
		bool now_do_multiplication = do_multiplication;

		numeraltoint(&ptr, &in_value, &now_do_multiplication, &previous);

		out += in_value;

		if (do_multiplication && !now_do_multiplication) {
			out *= 100;
			previous = out; // allows for |1|M == 900
			do_multiplication = false;
		} else {
			do_multiplication = true;
		}

	} while (ptr < end);

	if (negative) {
		out = -out;
	}

	return out;
}

#endif

// ---------------------------------------------------
// Utility functions
// ---------------------------------------------------

bool loadDigitTable(char *filename)
{
	bool result = false;

	if (filename) {
		FILE *fp = fopen(filename, "rb");
		if (fp) {
			// Read in file to buffer
			fseek(fp, 0, SEEK_END);
			int sz = ftell(fp);
			char *tmp_buffer = (char*)malloc(sz+1);
			fseek(fp, 0, SEEK_SET);
			fread(tmp_buffer, sz, 1, fp);
			tmp_buffer[sz] = '\0';

			// Do initial read-through to determine number of unicode char's
			digit_table_size = 0;
			UTF8 *ptr = (UTF8*)tmp_buffer;
			while (*ptr != '\0' && convertFromUTF8(&ptr) != INVALID_CHAR)
			{
				digit_table_size++;
			}

			if (digit_table_size != 0) {
				// Create
				digit_table = (UChar32*)malloc(sizeof(UChar32) * digit_table_size);
				digit_table_base = digit_table_size;

				ptr = (UTF8*)tmp_buffer;
				for (sz=0; sz<digit_table_size; sz++)
				{
					// Convert one at a time
					digit_table[sz] = convertFromUTF8(&ptr);
				}

				printf("Read in digit table from '%s'\n", filename);
				result = true;
			}

			// Cleanup
			free(tmp_buffer);		
			fclose(fp);
		}
	}

	if (!result) {
		// Good ol' base62
		digit_table = (UChar32*)malloc(sizeof(UChar32) * 62);
		digit_table_base = 62;
		digit_table_size = 62;
		int i;
		int count = 0;
		for (i = '0'; i != ('9'+1); i++)
			digit_table[count++] = i;
		for (i = 'a'; i != ('z'+1); i++)
			digit_table[count++] = i;
		for (i = 'A'; i != ('Z'+1); i++)
			digit_table[count++] = i;
	}

#ifdef DEBUG_PRINTTABLE
	int i;
	for (i=0; i<digit_table_size; i++)
	{
		UTF8 *ptr = NULL;
		int size = 0;
		UChar32 unichar = 0;

		UTF8 *string_rep = convertToUTF8(digit_table[i], &size);
		printf("digit[%d]\t=\n", i);
		printf("\t%d (size:%d)\n", digit_table[i], size);

		ptr = string_rep;
		unichar = convertFromUTF8(&ptr);
		printf("\t%s -> %d\n", string_rep, unichar);
	}
#endif

	return result;
}

bool isDigitTableLoaded()
{
	return digit_table != NULL;
}

#ifdef DO_NUMERALS
bool loadNumeralTable(char *filename)
{
	bool result = false;
	if (filename) {
		/*
		Overview of format:
		[numeral]=value\n

		e.g.
		I=1
		V=5
		X=10
		L=50
		C=100

		NOTE: a bit of a hack atm, but works for current purposes.
		*/
		FILE *fp = fopen(filename, "r");
		if (fp) {
			// Read in file to buffer
			fseek(fp, 0, SEEK_END);
			int sz = ftell(fp);
			UTF8 *tmp_buffer = (UTF8*)malloc(sz+1);
			fseek(fp, 0, SEEK_SET);
			fread(tmp_buffer, sz, 1, fp);
			tmp_buffer[sz] = '\0';

			// Determine number of numerals
			UTF8 *ptr = tmp_buffer;
			UTF8 *end = ptr + sz;
			sz = 0;
			while (ptr != end)
			{
				if (*ptr++ == '=')
					sz++;
			}

			if (sz != 0)
			{
				numeral_table = (UChar32*)malloc(sizeof(UChar32) * sz);
				numeral_value = (int*)malloc(sizeof(int) * sz);

				// Parse
				U8 count = 0;
				bool newline_passed = false;
				ptr = tmp_buffer;
				while (ptr < end)
				{
					if (*ptr == '\r' || *ptr == '\n' || *ptr == '\t' || *ptr == ' ') {
						ptr++;
						newline_passed = false;
					} else
						newline_passed = true;

					if (newline_passed)
					{

						UChar32 in_symbol = convertFromUTF8(&ptr);
						int     in_value = 0;
						if (*ptr++ != '=') {
							// Whoops!
							newline_passed = false;
							continue;
						}

						// Finally!
						sz = 0;
						sscanf((const char*)ptr, "%d%n", &in_value, &sz);
						numeral_table[count] = in_symbol;
						numeral_value[count++] = in_value;
						ptr += sz;
						newline_passed = false;
					}
				}
				numeral_table_size = count;
				printf("Read in digit table from '%s'\n", filename);
				result = true;
			}

			fclose(fp);
		}
	}

	if (!result) {
		// Standard roman numerals
		numeral_table = (UChar32*)malloc(sizeof(UChar32)*7);
		numeral_value = (int*)malloc(sizeof(int) * 7);
		numeral_table_size = 7;

		int count = 0;
		numeral_table[count] = 'I';
		numeral_value[count++] = 1;
		numeral_table[count] = 'V';
		numeral_value[count++] = 5;
		numeral_table[count] = 'X';
		numeral_value[count++] = 10;
		numeral_table[count] = 'L';
		numeral_value[count++] = 50;
		numeral_table[count] = 'C';
		numeral_value[count++] = 100;
		numeral_table[count] = 'D';
		numeral_value[count++] = 500;
		numeral_table[count] = 'M';
		numeral_value[count++] = 1000;
	}

	return result;
}

bool isNumeralTableLoaded()
{
	return numeral_table != NULL;
}
#endif

// Entry point

int main(int argc, char **argv)
{
	bool done = false;

	int end = argc != 0 ? argc-1 : 0;
	int i;
	for (i=1; i<end; i++)
	{
		if (argv[i][0] == '-') {
			if (strcmp(argv[i], "-table") == 0)
			{
				if (use_digits) {
					if (!digit_table) { free(digit_table); }
					loadDigitTable(argv[++i]);
				}
#ifdef DO_NUMERALS
				else {
					if (!numeral_table) { 
						free(numeral_table);
						free(numeral_value);
					}
					loadNumeralTable(argv[++i]);
				}
#endif
			}
#ifdef DO_NUMERALS
			else if (strcmp(argv[i], "-numerals") == 0) {
				use_digits = false;
				digit_table_base = 10;
			}
#endif
		} else if (strcmp(argv[i], "to") == 0)  {
			// Convert to base
			UTF8 *in_number = (UTF8*)argv[++i];
			const UTF8 *result = NULL;

			if (use_digits) {
				if (!digit_table) { loadDigitTable(NULL); }
				result = inttobase(atoi((const char*)in_number));
			}
#ifdef DO_NUMERALS
			else {
				if (!numeral_table) { loadNumeralTable(NULL); }
				result = inttonumerals(atoi((const char*)in_number));
			}
#endif

			printf("\nIn: %s [Base %d]\nResult: %s\n", in_number, digit_table_base, result);
			done = true;

			break;
		} else if (strcmp(argv[i], "from") == 0)  {
			// Convert from base
			UTF8   *in_base = (UTF8*)argv[++i];
			S64 result = 0;

			if (use_digits) {
				if (!digit_table) { loadDigitTable(NULL); }
				result = basetoint(in_base);
			}
#ifdef DO_NUMERALS
			else {
				if (!numeral_table) { loadNumeralTable(NULL); }
				result = numeralstoint(in_base); // TODO
			}
#endif

			printf("\nIn: %s [Base %d]\nResult: %lld\n", in_base, digit_table_base, result);
			done = true;

			break;
		} else {
			// Usage error
			break;
		}
	}

	if (digit_table) {
		free(digit_table);
	}
#ifdef DO_NUMERALS
	if (numeral_table) {
		free(numeral_table);
		free(numeral_value);
	}
#endif

	if (!done) {
		printf("Base: (-numerals, -table <file>) [to|from] <number>\n");
		return 1;
	}

	return 0;
} 