#!/usr/bin/env bash

if [ -f "/etc/prime-discrete" ]; then
    if [[ "`cat /etc/prime-discrete`" == "on" ]]; then
        cp /etc/prime-discrete /var/tmp
        exit;
    fi
fi

echo "off" > /var/tmp/prime-discrete
