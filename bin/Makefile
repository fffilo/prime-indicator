SHELL := /bin/bash

help:
	@echo "Usage: make install|uninstall"

install:
	@echo "Fake nvidia drivers used for non-nvidia machines (for testing purpose only)."
	@echo "Do NOT install this on machines with nvidia graphics cards!"
	@read -r -p "Continue [y/N]: " CONTINUE; \
	[[ $$CONTINUE = "y" ]] || [[ $$CONTINUE = "Y" ]] || (echo "Exiting."; exit 1;)
	mkdir -p /opt/nvidia-fake
	cp -r --preserve=timestamps prime-select.sh nvidia-smi.sh nvidia-settings.sh /opt/nvidia-fake
	ln -s /opt/nvidia-fake/prime-select.sh /usr/local/bin/prime-select
	ln -s /opt/nvidia-fake/nvidia-smi.sh /usr/local/bin/nvidia-smi
	ln -s /opt/nvidia-fake/nvidia-settings.sh /usr/local/bin/nvidia-settings
	echo "off" > /etc/prime-discrete

uninstall:
	rm -f /etc/prime-discrete
	rm -f /usr/local/bin/nvidia-settings
	rm -f /usr/local/bin/nvidia-smi
	rm -f /usr/local/bin/prime-select
	rmdir -rf /opt/nvidia-fake
