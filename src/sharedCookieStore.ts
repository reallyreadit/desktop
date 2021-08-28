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