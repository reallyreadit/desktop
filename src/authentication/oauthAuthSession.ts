import { BrowserWindow } from 'electron';
import { WebAuthRequest, WebAuthResponse } from '../models/WebAuth';

export function presentOauthAuthSession(request: WebAuthRequest) {
	const authWindow = new BrowserWindow({
		width: 600,
		height: 600,
		webPreferences: {
			partition: 'oauth'
		},
		autoHideMenuBar: true
	});
	return new Promise<WebAuthResponse>(
		resolve => {
			const cancel = () => {
				resolve({
					error: 'Cancelled'
				});
			};
			authWindow.on('closed', cancel);
			authWindow.webContents.session.protocol.registerHttpProtocol(
				'readup',
				request => {
					authWindow.off('closed', cancel);
					authWindow.close();
					resolve({
						callbackURL: request.url
					});
				}
			);
			authWindow.loadURL(request.authUrl);
		}
	);
}