#!/bin/sh

set -e

case "$1" in
	remove)
		# remove the manifest files.
		rm -f /etc/opt/chrome/native-messaging-hosts/it.reallyread.mobile.browser_extension_app.json
		rm -f /usr/lib/mozilla/native-messaging-hosts/it.reallyread.mobile.browser_extension_app.json
		;;
esac

exit 0