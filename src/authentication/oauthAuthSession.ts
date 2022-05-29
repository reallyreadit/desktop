// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

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