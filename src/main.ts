import { app } from 'electron';
import { appConfig } from './appConfig';
import { SquirrelResult, tryProcessSquirrelEvent } from './installation/squirrel';
import { notifications } from './notifications';
import { readerScript } from './readerScript';
import { loadUrlFromArguments } from './routing/argvParser';
import { createUrl } from './routing/HttpEndpoint';
import { userData } from './userData';
import { WebAppViewController } from './webAppViewController';
import { DisplayTheme } from './models/DisplayPreference';
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
				const displayPreference = await userData.getDisplayPreference();
				webAppViewController = new WebAppViewController({
					displayTheme: displayPreference?.theme ?? DisplayTheme.Light
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