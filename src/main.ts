import { app } from 'electron';
import { notifications } from './notifications';
import { readerScript } from './readerScript';
import { userData } from './userData';
import { WebAppViewController } from './webAppViewController';

if (
	app.requestSingleInstanceLock()
) {
	// DEBUG ONLY
	app.setAppUserModelId(process.execPath);
	let webAppViewController: WebAppViewController | undefined;
	app
		.whenReady()
		.then(
			async () => {
				// Initialize services.
				await userData.initializeDirectories();
				await readerScript.initializeDirectories();
				// Create main view controller.
				const urlArg = findReadupUrlArg(process.argv);
				webAppViewController = new WebAppViewController();
				if (
					urlArg?.searchParams.has('url')
				) {
					webAppViewController.readArticle({
						url: urlArg.searchParams.get('url')!
					});
				}
				// Initialize services.
				notifications.startChecking();
			}
		);
	app
		.on(
			'second-instance',
			(_, argv) => {
				const urlArg = findReadupUrlArg(argv);
				if (
					webAppViewController &&
					urlArg?.searchParams.has('url')
				) {
					webAppViewController.readArticle({
						url: urlArg.searchParams.get('url')!
					});
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

function findReadupUrlArg(argv: string[]) {
	const arg = argv.find(
		arg => arg.startsWith('readup://')
	);
	if (arg) {
		return new URL(arg);
	}
}