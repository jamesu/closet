# Lighttpd builder

LIGHTTPD_BUILD_ROOT=build/lighttpd-$(LIGHTTPD_VERSION)

# Sources
external/lighttpd-$(LIGHTTPD_VERSION).tar.gz:
	curl -o $@ $(LIGHTTPD_URL)/lighttpd-$(LIGHTTPD_VERSION).tar.gz

# Targets
$(LIGHTTPD_BUILD_ROOT)/EXTRACTED: external/lighttpd-$(LIGHTTPD_VERSION).tar.gz
	cd build && tar -xzf ../external/lighttpd-$(LIGHTTPD_VERSION).tar.gz && touch lighttpd-$(LIGHTTPD_VERSION)/EXTRACTED

$(LIGHTTPD_BUILD_ROOT)/Makefile: $(LIGHTTPD_BUILD_ROOT)/EXTRACTED config/lighttpd_build.cfg
	rm -rf $(LIGHTTPD_LOCATION)
	-cd $(LIGHTTPD_BUILD_ROOT) && make clean
	cd $(LIGHTTPD_BUILD_ROOT) && ./configure --prefix="$(LIGHTTPD_LOCATION)" $(LIGHTTPD_CONF)

$(LIGHTTPD_BUILD_ROOT)/src/lighttpd: $(LIGHTTPD_BUILD_ROOT)/Makefile
	cd $(LIGHTTPD_BUILD_ROOT) && make

$(LIGHTTPD_LOCATION)/sbin/lighttpd: $(LIGHTTPD_BUILD_ROOT)/src/lighttpd
	cd $(LIGHTTPD_BUILD_ROOT) && sudo make install
	mkdir -p $(LIGHTTPD_LOCATION)/conf/keys

# Deployment
lighttpd_deploy: $(LIGHTTPD_LOCATION)
	sudo rsync -avz -e ssh $(LIGHTTPD_LOCATION)/ $(SSH_LOGIN):/tmp/deploy-lighttpd/
	ssh $(SSH_LOGIN) "ROOT_PREFIX=$(LIGHTTPD_LOCATION) sudo /home/user/server/scripts/do-deploy-lighttpd" 

# Cleanup
lighttpd_confclean:
	-cd $(LIGHTTPD_BUILD_ROOT) ; make clean; rm Makefile

lighttpd_updateconf: lighttpd_confclean $(LIGHTTPD_BUILD_ROOT)/Makefile

lighttpd_buildclean:
	rm -rf $(LIGHTTPD_BUILD_ROOT)	

# Shorthand
lighttpd: $(LIGHTTPD_LOCATION)/sbin/lighttpd