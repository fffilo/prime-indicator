#!/usr/bin/env bash

help () {
    echo "Usage: prime-select nvidia|intel|query"
}

index () {
    echo "/etc/prime-discrete"
}

apply () {
    if [[ $EUID -ne 0 ]]; then
        echo "This operation requires root privileges"
        exit 1
    fi

    if [[ "$1" == "nvidia" ]]; then
        echo "on" > `index`
    else
        echo "off" > `index`
    fi

    echo "Info: selecting the $1 profile"
}

query () {
    if [ -f "`index`" ]; then
        if [[ "$(cat `index`)" == "on" ]]; then
            echo "nvidia"
            return;
        fi
    fi

    echo "intel"
}

if [[ $# -eq 1 ]]; then
    if [[ "$1" == "intel" || "$1" == "nvidia" ]]; then
        echo `apply "$1"`
    elif [[ "$1" == "query" ]]; then
        echo `query`
    elif [[ "$1" == "--help" ]]; then
        help
    else
        help
        exit 1
    fi
else
    help
    exit 1
fi
