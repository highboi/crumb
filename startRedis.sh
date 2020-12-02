#! /bin/bash

#check if the script is being executed as root
if [ "$EUID" -ne 0 ]; then
	echo "Run as root"
	exit
fi

#start the redis server using the config file for the session store
#even though the only functionality of redis is to store session information,
#having a separate config file means that you can restore default settings
#in an instant by simply not using the altered config file
redis-server /etc/redis/redis_session.conf
