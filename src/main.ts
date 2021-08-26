import { app } from 'electron';
import { notifications } from './notifications';
import { readerScript } from './readerScript';
import { sharedCookieStore } from './sharedCookieStore';
import { userData } from './userData';
import { WebAppViewController } from './webAppViewController';

async function loadUrlFromArguments(webAppViewController: WebAppViewController, argv: string[]) {
	let urlArg = argv.find(
		arg => arg.startsWith('readup://') || arg.startsWith('https://dev.readup.com/')
	);
	if (!urlArg) {
		return false;
	}
	if (
		urlArg.startsWith('readup://dev.readup.com/')
	) {
		urlArg = urlArg.replace(/^readup:/, 'https:');
	}
	const url = new URL(urlArg);
	let pathComponents: string[] | undefined;
	if (
		url.protocol === 'readup:' &&
		url.hostname === 'read' &&
		url.searchParams.has('url') &&
		await sharedCookieStore.isAuthenticated()
	) {
		await webAppViewController.readArticle({
			url: url.searchParams.get('url')!
		});
	} else if (
		url.pathname.startsWith('/read') &&
		(pathComponents = url.pathname.split('/')).length === 4 &&
		await sharedCookieStore.isAuthenticated()
	) {
		const
			slug = pathComponents[2] + '_' + pathComponents[3],
			commentsUrl = new URL(
				url.href.replace(/^(https?:\/\/[^\/]+)\/read\/(.+)/, '$1/comments/$2')
			);
		await webAppViewController.loadUrl(commentsUrl);
		await webAppViewController.readArticle({
			slug
		});
	} else {
		webAppViewController.closeReader();
		await webAppViewController.loadUrl(url);
	}
	return true;
}

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
				webAppViewController = new WebAppViewController();
				if (
					!(await loadUrlFromArguments(webAppViewController, process.argv))
				) {
					webAppViewController.loadUrl(
						new URL('https://dev.readup.com/')
					);
				}
				// Initialize services.
				notifications.startChecking();
			}
		);
	app
		.on(
			'second-instance',
			async (_, argv) => {
				if (
					webAppViewController &&
					(await loadUrlFromArguments(webAppViewController, argv))
				) {
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