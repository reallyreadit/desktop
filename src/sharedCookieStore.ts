import { session } from 'electron';
import { Cookie, CookieJar } from 'tough-cookie';

export const sharedCookieStore = {
	getStore: async () => {
		const
			cookieJar = new CookieJar(),
			authCookies = await session.defaultSession.cookies.get({
				domain: '.dev.readup.com',
				name: 'devSessionKey'
			}),
			authCookie = authCookies[0];
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
			'https://dev.readup.com/'
		);
		return cookieJar;
	}
};