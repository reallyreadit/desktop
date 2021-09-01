import { app } from 'electron';
import { appConfig } from './appConfig';
import { SquirrelResult, tryProcessSquirrelEvent } from './installation/squirrel';
import { notifications } from './notifications';
import { readerScript } from './readerScript';
import { loadUrlFromArguments } from './routing/argvParser';
import { createUrl } from './routing/HttpEndpoint';
import { userData } from './userData';
import { WebAppViewController } from './webAppViewController';

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
		// If the app is not installed during development the ID should be changed to process.execPath
		app.setAppUserModelId('com.squirrel.Readup.Readup');
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
				webAppViewController = new WebAppViewController();
				const argUrlResult = await loadUrlFromArguments(process.argv);
				await webAppViewController.loadUrl(
					argUrlResult.main ?? createUrl(appConfig.webServer)
				);
				if (argUrlResult.article) {
					await webAppViewController.readArticle(argUrlResult.article);
				}
				// Initialize services.
				notifications.startChecking();
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
						await webAppViewController.readArticle(argUrlResult.article);
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