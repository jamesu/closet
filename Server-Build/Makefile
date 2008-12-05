# Cuppadev website server builder

# Login
SERVER=localhost
SSH_LOGIN=user@$(SERVER)

# Prefixes
ROOT_PREFIX=/usr/local
APACHE_LOCATION=$(ROOT_PREFIX)/apache2
PHP_LOCATION=$(ROOT_PREFIX)/php
LIGHTTPD_LOCATION=$(ROOT_PREFIX)/lighttpd


# Versions
APACHE_VERSION=2.2.4
PHP_VERSION=5.2.2
PHP_EACCELERATOR_VERSION=0.9.5
LIGHTTPD_VERSION=1.4.15

# Download url's
APACHE_URL=http://apache.rmplc.co.uk/httpd
PHP_URL=http://uk2.php.net/distributions
PHP_EACCELERATOR_URL=http://bart.eaccelerator.net/source
LIGHTTPD_URL=http://www.lighttpd.net/download

# List of configuration files which can be deployed
CONFIGURATION_FILES= config/httpd.conf config/php.ini config/lighttpd.conf

# ./configure options
include config/apache_build.cfg
include config/php_build.cfg
include config/eaccelerator_build.cfg
include config/lighttpd_build.cfg

# Build scripts
include mk/lighttpd.mk
include mk/apache.mk
include mk/php.mk
include mk/eaccelerator.mk

# Rules for required programs

deploy-config: $(CONFIGURATION_FILES)
	scp -r $(CONFIGURATION_FILES) $(SSH_LOGIN):/home/user/server/config/
	ssh $(SSH_LOGIN) "ROOT_PREFIX=$(ROOT_PREFIX) sudo /home/user/server/scripts/reload-config"

deploy-scripts:
	scp -r scripts keys config $(SSH_LOGIN):/home/user/server/
	ssh $(SSH_LOGIN) "rm /home/user/server/config/*.cfg"

deploy: apache_deploy php_deploy

# Typical generic targets
default: deploy-config


all: apache php php_eaccelerator deploy

clean-build:
	-rm -rf build/*

clean-external:
	rm external/*

clean-location:
	-rm -rf "$(APACHE_LOCATION)" "$(PHP_LOCATION)" "$(LIGHTTPD_LOCATION)"
clean: apache_buildclean php_buildclean php_eaccelerator_buildclean
