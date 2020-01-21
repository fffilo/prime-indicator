#!/usr/bin/env bash

if [[ $# -eq 1 && "$1" == "-L" ]]; then
    if [ -f "/var/tmp/prime-discrete" ]; then
        if [[ "`cat /var/tmp/prime-discrete`" == "on" ]]; then
            echo "GPU 0: GeForce GTX 1080M (UUID: GPU-00000000-0000-0000-0000-000000000000)"
            exit 0;
        fi
    fi

    echo "NVIDIA-SMI has failed because it couldn't communicate with the NVIDIA driver. Make sure that the latest NVIDIA driver is installed and running."
    exit 1;
else
    echo "Invalid argument $1"
    exit 1
fi
