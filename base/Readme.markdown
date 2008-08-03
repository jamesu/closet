# BaseAnything Coder

Base.exe is a program that converts numbers to and from any base, the default being base62 (represented by [0-9][a-z][A-Z]).
In addition, there is also support converting to and from numerals, the default being roman numerals (e.g. I=1, V=5, L=50, C=100).

Usage : Base: (-numerals, -table <file>) [to|from] <number>

E.g.  :
<pre>
	base from Tea
	base to   212288
	base -numerals from IV
	base -numerals to   6
	
	base -table base_2.txt from 0110
	base -numerals -table numerals_yikes.txt from ~!H
</pre>

# Symbol tables
You can supply a file containing all of your base symbols, or numerals, via the -table parameter.

In the default mode, the file will contain a list of symbols. The number of symbols in the file will determine what number the base is. e.g. if there were 10 letters (ABCDEFGHIJ), the numbers would be interpreted as base10 represented by those letters.

In the numerals mode, the file will contain lines, of the format:

<pre>
	&lt;numeral&gt;=&lt;value&gt;
</pre>

e.g.:

<pre>
	A=123
</pre>

All text (including commandline parameters) is assumed to be UTF-8 formatted, meaning you can also insert unicode symbols - so you can use a large range of symbols when devising a base or numeral system.
NOTE: typing in UTF-8 formatted unicode characters via the Windows command prompt has not been tested. However, it works fine by default in Mac OS X.

# Please Note

This program can be extended to convert numbers of different bases, using alternate symbols to represent digits. Be aware that this program is merely a proof of concept, so it is not optimized in any way. In addition, due to the number types used, there are typically errors during calculation for very large numbers (noticable when using large bases).

# Contact
James Urquhart (jamesu at gmail.com)
