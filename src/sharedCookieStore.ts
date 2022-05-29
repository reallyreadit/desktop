// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import { session } from 'electron';
import { Cookie, CookieJar } from 'tough-cookie';
import { appConfig } from './appConfig';
import { createUrl } from './routing/HttpEndpoint';

async function getAuthCookie() {
	const authCookies = await session.defaultSession.cookies.get({
		domain: appConfig.authCookieDomain,
		name: appConfig.authCookieName
	});
	return authCookies[0];
}

export const sharedCookieStore = {
	getStore: async () => {
		const
			cookieJar = new CookieJar(),
			authCookie = await getAuthCookie();
		cookieJar.setCookieSync(
			new Cookie({
				key: authCookie.name,
				value: authCookie.value,
				domain: authCookie.domain?.replace(/^\./, ''),
				path: authCookie.path,
				expires: new Date(authCookie.expirationDate! * 1000),
				secure: true,
				httpOnly: true,
				sameSite: 'none'
			}),
			createUrl(appConfig.webServer).href
		);
		return cookieJar;
	},
	isAuthenticated: async () => {
		return !!(await getAuthCookie());
	}
};