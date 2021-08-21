import { BrowserWindow } from 'electron';
import { WebAuthRequest, WebAuthResponse } from '../models/WebAuth';

export function presentOauthAuthSession(request: WebAuthRequest) {
	const authWindow = new BrowserWindow({
		width: 600,
		height: 600
	});
	return new Promise<WebAuthResponse>(
		resolve => {
			const cancel = () => {
				resolve({
					error: 'Cancelled'
				});
			};
			authWindow.on('closed', cancel);
			authWindow.webContents.session.webRequest.onHeadersReceived(
				(details, callback) => {
					const responseHeaders = details.responseHeaders;
					let
						locationHeaderValues: string[] | undefined,
						locationUrl: string | undefined;
					if (
						responseHeaders &&
						(locationHeaderValues = responseHeaders['location']) &&
						(locationUrl = locationHeaderValues[0]) &&
						locationUrl.startsWith('readup:')
					) {
						authWindow.off('closed', cancel);
						authWindow.close();
						resolve({
							callbackURL: locationUrl
						});
					} else {
						callback({});
					}
				}
			);
			authWindow.loadURL(request.authUrl);
		}
	);
}