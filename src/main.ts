import { app } from 'electron';
import { appConfig } from './appConfig';
import { notifications } from './notifications';
import { readerScript } from './readerScript';
import { loadUrlFromArguments } from './routing/argvParser';
import { createUrl } from './routing/HttpEndpoint';
import { userData } from './userData';
import { WebAppViewController } from './webAppViewController';

if (
	app.requestSingleInstanceLock()
) {
	// Enable development notifications.
	if (appConfig.type === 'dev') {
		app.setAppUserModelId(process.execPath);
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
} else {
	app.quit();
}