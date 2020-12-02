#! /bin/bash

#check to see if the user is root
if [ "$EUID" -ne 0 ]; then
	echo "Run as root"
	exit
fi

#kill all redis processes
killall redis-server
