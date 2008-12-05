# Apache builder

APACHE_BUILD_ROOT=build/httpd-$(APACHE_VERSION)

# Sources
external/httpd-$(APACHE_VERSION).tar.gz:
	curl -o $@ $(APACHE_URL)/httpd-$(APACHE_VERSION).tar.gz

# Targets
$(APACHE_BUILD_ROOT)/EXTRACTED: external/httpd-$(APACHE_VERSION).tar.gz
	cd build && tar -xzf ../external/httpd-$(APACHE_VERSION).tar.gz && touch httpd-$(APACHE_VERSION)/EXTRACTED

$(APACHE_BUILD_ROOT)/Makefile: $(APACHE_BUILD_ROOT)/EXTRACTED config/apache_build.cfg
	rm -rf $(APACHE_LOCATION)
	-cd $(APACHE_BUILD_ROOT) && make clean
	cd $(APACHE_BUILD_ROOT) && ./configure --prefix="$(APACHE_LOCATION)" $(APACHE_CONF)

$(APACHE_BUILD_ROOT)/httpd: $(APACHE_BUILD_ROOT)/Makefile
	cd $(APACHE_BUILD_ROOT) && make

$(APACHE_LOCATION)/bin/httpd: $(APACHE_BUILD_ROOT)/httpd
	cd $(APACHE_BUILD_ROOT) && sudo make install
	mkdir $(APACHE_LOCATION)/conf/keys

# Deployment
apache_deploy: $(APACHE_LOCATION)
	sudo rsync -avz -e ssh $(APACHE_LOCATION)/ $(SSH_LOGIN):/tmp/deploy-apache/
	ssh $(SSH_LOGIN) "ROOT_PREFIX=$(APACHE_LOCATION) sudo /home/user/server/scripts/do-deploy-apache" 

# Cleanup
apache_confclean:
	-cd $(APACHE_BUILD_ROOT) ; make clean; rm Makefile

apache_updateconf: apache_confclean $(APACHE_BUILD_ROOT)/Makefile

apache_buildclean:
	rm -rf $(APACHE_BUILD_ROOT)	

# Shorthand
apache: $(APACHE_LOCATION)/bin/httpd