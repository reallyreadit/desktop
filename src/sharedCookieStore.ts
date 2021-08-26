import { session } from 'electron';
import { Cookie, CookieJar } from 'tough-cookie';

async function getAuthCookie() {
	const authCookies = await session.defaultSession.cookies.get({
		domain: '.dev.readup.com',
		name: 'devSessionKey'
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
			'https://dev.readup.com/'
		);
		return cookieJar;
	},
	isAuthenticated: async () => {
		return !!(await getAuthCookie());
	}
};