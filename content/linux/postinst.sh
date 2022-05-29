# Copyright (C) 2022 reallyread.it, inc.
# 
# This file is part of Readup.
# 
# Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
# 
# Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
# 
# You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

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