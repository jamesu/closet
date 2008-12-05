# Server-Build

Makefile's for use in building a LAMP / LLMP stack from source code. For the paranoid.

This assumes that the machine you are using to build uses the same OS & core libraries as the system you are targeting.

Edit "Makefile" to define the server, and the files in "config" for the build settings.

Generally speaking, you use:

* "make" to just copy over configuration files
* "make all" to build and deploy to the servera (assuming you use apache)
* "make apache php php_eaccelerator" to build apache & php with eaccelerator
* "make deploy" to just deploy to the server (assuming you use apache)
* "make lighttpd lighttpod_deploy" to build and deploy lighttpd to the server


