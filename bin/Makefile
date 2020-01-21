SHELL := /bin/bash

help:
	@echo "Usage: make install|uninstall"

install:
	@echo "Fake nvidia drivers used for non-nvidia machines (for testing purpose only)."
	@echo "Do NOT install this on machines with nvidia graphics cards!"
	@read -r -p "Continue [y/N]: " CONTINUE; \
	[[ $$CONTINUE = "y" ]] || [[ $$CONTINUE = "Y" ]] || (echo "Exiting."; exit 1;)
	ln -s `pwd`/prime-select.sh /usr/local/bin/prime-select
	ln -s `pwd`/nvidia-smi.sh /usr/local/bin/nvidia-smi
	ln -s `pwd`/nvidia-settings.sh /usr/local/bin/nvidia-settings
	echo "off" > /etc/prime-discrete
	echo "off" > /var/tmp/prime-discrete
	chmod 777 /var/tmp/prime-discrete
	echo "[Desktop Entry]" > /home/$$SUDO_USER/.config/autostart/prime-discrete-update.desktop
	echo "Exec=/home/$$SUDO_USER/.local/share/gnome-shell/extensions/prime-indicator@gnome-shell-exstensions.fffilo.github.com/bin/prime-discrete-update.sh" >> /home/$$SUDO_USER/.config/autostart/prime-discrete-update.desktop
	echo "Name=prime-discrete-update" >> /home/$$SUDO_USER/.config/autostart/prime-discrete-update.desktop
	echo "Type=Application" >> /home/$$SUDO_USER/.config/autostart/prime-discrete-update.desktop
	echo "X-GNOME-Autostart-enabled=true" >> /home/$$SUDO_USER/.config/autostart/prime-discrete-update.desktop

uninstall:
	rm -f /home/$$SUDO_USER/.config/autostart/prime-discrete-update.desktop
	rm -f /var/tmp/prime-discrete
	rm -f /etc/prime-discrete
	rm -f /usr/local/bin/nvidia-settings
	rm -f /usr/local/bin/nvidia-smi
	rm -f /usr/local/bin/prime-select
