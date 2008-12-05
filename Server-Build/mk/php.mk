# Php builder

PHP_BUILD_ROOT=build/php-$(PHP_VERSION)
PHP_MODULE_LOCATION=$(PHP_LOCATION)/lib/php/extensions/no-debug-non-zts-20060613

ifeq ($(BUILD_PHP_MODULE), true)
	# mod_php
	PHP_EXTRA_REQS=$(APACHE_LOCATION)/bin/httpd
	PHP_CONF+= --with-apxs2="$(APACHE_LOCATION)/bin/apxs"
else
	PHP_EXTRA_REQS=
endif

ifeq ($(BUILD_PHP_FASTCGI), true)
	PHP_CONF+= --enable-force-cgi-redirect --enable-fastcgi
endif

# Sources
external/php-$(PHP_VERSION).tar.gz:
	curl -o $@ $(PHP_URL)/php-$(PHP_VERSION).tar.gz

# Targets
$(PHP_BUILD_ROOT)/EXTRACTED: external/php-$(PHP_VERSION).tar.gz
	cd build && tar -xzf ../external/php-$(PHP_VERSION).tar.gz && touch php-$(PHP_VERSION)/EXTRACTED

$(PHP_BUILD_ROOT)/Makefile: $(PHP_EXTRA_REQS) $(PHP_BUILD_ROOT)/EXTRACTED config/php_build.cfg
	-cd $(PHP_BUILD_ROOT) && make clean
	cd $(PHP_BUILD_ROOT) && ./configure --prefix="$(PHP_LOCATION)" $(PHP_CONF)

$(PHP_BUILD_ROOT)/sapi/cli/php: $(PHP_BUILD_ROOT)/Makefile
	cd $(PHP_BUILD_ROOT) && make

$(PHP_LOCATION)/bin/php: $(PHP_BUILD_ROOT)/sapi/cli/php
	cd $(PHP_BUILD_ROOT) && sudo make install

# Deployment
php_deploy: $(PHP_LOCATION)
	sudo rsync -avz -e ssh $(PHP_LOCATION)/ $(SSH_LOGIN):/tmp/deploy-php/
	ssh $(SSH_LOGIN) "ROOT_PREFIX=$(PHP_LOCATION) sudo /home/user/server/scripts/do-deploy-php"

# Cleanup
php_confclean:
	-cd $(PHP_BUILD_ROOT) ; make clean; rm Makefile

php_updateconf: php_confclean $(PHP_BUILD_ROOT)/Makefile

php_buildclean:
	rm -rf $(PHP_BUILD_ROOT)	

# Shorthand
php: $(PHP_LOCATION)/bin/php