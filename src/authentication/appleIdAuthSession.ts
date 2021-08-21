import { BrowserWindow } from 'electron';
import { AppleClient, AppleIdCredential } from '../models/AppleIdCredential';
import { createQueryString, parseQueryString } from '../routing/queryString';

export function presentAppleIdAuthSession() {
	const authWindow = new BrowserWindow({
		width: 600,
		height: 600
	});
	const redirectUrl = 'https://api.readup.com/Auth/AppleWeb';
	// can't use URLSearchParams here because apple requires spaces be
	// encoded as %20 (which encodeURIComponent does) instead of +
	const queryString = createQueryString({
		'client_id': 'com.readup.webapp',
		'redirect_uri': redirectUrl,
		'response_type': 'code id_token',
		'scope': 'email',
		'response_mode': 'form_post',
		'state': JSON.stringify({ })
	});
	const authUrl = 'https://appleid.apple.com/auth/authorize' + queryString;
	return new Promise<AppleIdCredential>(
		resolve => {
			authWindow.webContents.session.webRequest.onBeforeRequest(
				{
					urls: [
						redirectUrl
					]
				},
				(details, callback) => {
					callback({
						cancel: true
					});
					authWindow.close();
					const postData = parseQueryString(
						Buffer
							.from(details.uploadData[0].bytes)
							.toString('utf8')
					);
					if ('error' in postData) {
						return;
					}
					let user: { email?: string } | undefined;
					if ('user' in postData) {
						const jsonUser = postData['user'];
						try {
							user = JSON.parse(jsonUser);
						} catch {
							console.log(`[apple-auth] Failed to parse user: ${jsonUser}`);
						}
					}
					resolve({
						authorizationCode: postData['code'],
						email: user?.email ?? null,
						identityToken: postData['id_token'],
						realUserStatus: 'unsupported',
						user: '',
						client: AppleClient.Web
					});
				}
			);
			authWindow.loadURL(authUrl);
		}
	);
}