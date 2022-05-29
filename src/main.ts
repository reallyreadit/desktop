// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import { app } from 'electron';
import { appConfig } from './appConfig';
import { SquirrelResult, tryProcessSquirrelEvent } from './installation/squirrel';
import { notifications } from './notifications';
import { readerScript } from './readerScript';
import { loadUrlFromArguments } from './routing/argvParser';
import { createUrl } from './routing/HttpEndpoint';
import { userData } from './userData';
import { WebAppViewController } from './webAppViewController';
import { DisplayTheme, getDisplayTheme } from './models/DisplayPreference';
import { appUpdates } from './appUpdates';

/**
 * Process any Squirrel events before anything else. If we are handling a Squirrel
 * event then we shouldn't continue with initialization or quit the app. The app will
 * quit once the processing is complete.
 */
const squirrelResult = tryProcessSquirrelEvent();

if (
	squirrelResult !== SquirrelResult.ProcessingInstallationEvent &&
	app.requestSingleInstanceLock()
) {
	// Set the Application User Model ID in Windows
	if (process.platform === 'win32') {
		let userModelId: string;
		if (app.isPackaged) {
			userModelId = 'com.squirrel.Readup.Readup';
		} else {
			userModelId = process.execPath;
		}
		app.setAppUserModelId(userModelId);
	}
	let webAppViewController: WebAppViewController | undefined;
	app
		.whenReady()
		.then(
			async () => {
				// Initialize services.
				await userData.initializeDirectories();
				await readerScript.initializeDirectories();
				// Create main view controller.
				webAppViewController = new WebAppViewController({
					displayTheme: getDisplayTheme(
						await userData.getDisplayPreference()
					)
				});
				const argUrlResult = await loadUrlFromArguments(process.argv);
				await webAppViewController.loadUrl(
					argUrlResult.main ?? createUrl(appConfig.webServer)
				);
				if (argUrlResult.article) {
					await webAppViewController.readArticle(argUrlResult.article.reference, argUrlResult.article.options);
				}
				// Initialize subscription services.
				notifications.startChecking();
				appUpdates.startChecking();
			}
		);
	app
		.on(
			'second-instance',
			async (_, argv) => {
				if (webAppViewController) {
					const argUrlResult = await loadUrlFromArguments(argv);
					if (!argUrlResult.main && !argUrlResult.article) {
						return;
					}
					if (argUrlResult.main) {
						await webAppViewController.loadUrl(argUrlResult.main);
					}
					if (argUrlResult.article) {
						await webAppViewController.readArticle(argUrlResult.article.reference, argUrlResult.article.options);
					} else {
						webAppViewController.closeReader();
					}
					if (
						webAppViewController.window.isMinimized()
					) {
						webAppViewController.window.restore();
					}
					webAppViewController.window.focus();
				}
			}
		)
		.on(
			'window-all-closed',
			() => {
				app.quit();
			}
		);
} else if (squirrelResult !== SquirrelResult.ProcessingInstallationEvent) {
	app.quit();
}