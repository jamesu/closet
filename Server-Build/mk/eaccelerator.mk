# Eaccelerator builder

PHP_EACCELERATOR_BUILD_ROOT=build/eaccelerator-$(PHP_EACCELERATOR_VERSION)

# Sources
external/eaccelerator-$(PHP_EACCELERATOR_VERSION).tar.bz2:
	curl -o $@ $(PHP_EACCELERATOR_URL)/$(PHP_EACCELERATOR_VERSION)/eaccelerator-$(PHP_EACCELERATOR_VERSION).tar.bz2

# Targets
$(PHP_EACCELERATOR_BUILD_ROOT)/EXTRACTED: external/eaccelerator-$(PHP_EACCELERATOR_VERSION).tar.bz2
	cd build && tar -xjf ../external/eaccelerator-$(PHP_EACCELERATOR_VERSION).tar.bz2 && touch eaccelerator-$(PHP_EACCELERATOR_VERSION)/EXTRACTED

$(PHP_EACCELERATOR_BUILD_ROOT)/configure: $(PHP_LOCATION)/bin/php $(PHP_EACCELERATOR_BUILD_ROOT)/EXTRACTED
	cd $(PHP_EACCELERATOR_BUILD_ROOT) && ${PHP_LOCATION}/bin/phpize

$(PHP_EACCELERATOR_BUILD_ROOT)/Makefile: $(PHP_EACCELERATOR_BUILD_ROOT)/configure config/eaccelerator_build.cfg
	cd $(PHP_EACCELERATOR_BUILD_ROOT) && ./configure --with-php-config=${PHP_LOCATION}/bin/php-config $(PHP_EACCELERATOR_CONF)

$(PHP_EACCELERATOR_BUILD_ROOT)/modules/eaccelerator.so: $(PHP_EACCELERATOR_BUILD_ROOT)/Makefile
	cd $(PHP_EACCELERATOR_BUILD_ROOT) && make

$(PHP_MODULE_LOCATION)/eaccelerator.so: $(PHP_EACCELERATOR_BUILD_ROOT)/modules/eaccelerator.so
	cd $(PHP_EACCELERATOR_BUILD_ROOT) && sudo make install

# Deployment
php_eaccelerator_deploy: $(PHP_MODULE_LOCATION)/eaccelerator.so
	sudo rsync -avz -e ssh $(PHP_LOCATION)/ $(SSH_LOGIN):/tmp/deploy-php/
	ssh $(SSH_LOGIN) "ROOT_PREFIX=$(PHP_LOCATION) sudo /home/user/server/scripts/do-deploy-php"

# Cleanup
php_eaccelerator_confclean:
	-cd $(PHP_EACCELERATOR_BUILD_ROOT) ; make clean; rm Makefile

php_eaccelerator_updateconf: php_eaccelerator_confclean $(PHP_EACCELERATOR_BUILD_ROOT)/Makefile

php_eaccelerator_buildclean:
	rm -rf $(PHP_EACCELERATOR_BUILD_ROOT)	

# Shorthand
php_eaccelerator: $(PHP_MODULE_LOCATION)/eaccelerator.so