#!/bin/sh

set -e

case "$1" in
	configure)
		# Recursively create the system-wide manifest directories in case they don't exist.
		mkdir -p /etc/opt/chrome/native-messaging-hosts
		mkdir -p /usr/lib/mozilla/native-messaging-hosts

		# Copy the manifest files.
		cp /usr/lib/readup/resources/app/content/linux/chrome/it.reallyread.mobile.browser_extension_app.json /etc/opt/chrome/native-messaging-hosts/
		cp /usr/lib/readup/resources/app/content/linux/firefox/it.reallyread.mobile.browser_extension_app.json /usr/lib/mozilla/native-messaging-hosts/
		;;
esac

exit 0