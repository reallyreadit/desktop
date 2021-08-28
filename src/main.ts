import { app } from 'electron';
import { AppConfig, appConfig } from './appConfig';
import { ArticleReference } from './models/ArticleReference';
import { notifications } from './notifications';
import { readerScript } from './readerScript';
import { createUrl } from './routing/HttpEndpoint';
import { sharedCookieStore } from './sharedCookieStore';
import { userData } from './userData';
import { WebAppViewController } from './webAppViewController';

interface ArgumentsUrlResult {
	main: URL | null,
	article: ArticleReference | null
}

async function loadUrlFromArguments(webAppViewController: WebAppViewController, argv: string[]): Promise<ArgumentsUrlResult> {
	const webServerUrl = createUrl(appConfig.webServer);
	let urlArg = argv.find(
		arg => arg.startsWith('readup://') || arg.startsWith(webServerUrl.href)
	);
	if (!urlArg) {
		return {
			main: null,
			article: null
		};
	}
	if (
		urlArg.startsWith(
			webServerUrl.href.replace(
				new RegExp(`^${webServerUrl.protocol}`),
				'readup:'
			)
		)
	) {
		urlArg = urlArg.replace(/^readup:/, webServerUrl.protocol);
	}
	const url = new URL(urlArg);
	let pathComponents: string[] | undefined;
	if (
		url.protocol === 'readup:' &&
		url.hostname === 'read' &&
		url.searchParams.has('url') &&
		await sharedCookieStore.isAuthenticated()
	) {
		const articleReference = {
			url: url.searchParams.get('url')!
		};
		await webAppViewController.readArticle(articleReference);
		return {
			main: null,
			article: articleReference
		};
	}
	if (
		url.pathname.startsWith('/read') &&
		(pathComponents = url.pathname.split('/')).length === 4 &&
		await sharedCookieStore.isAuthenticated()
	) {
		const
			slug = pathComponents[2] + '_' + pathComponents[3],
			commentsUrl = new URL(
				url.href.replace(/^(https?:\/\/[^\/]+)\/read\/(.+)/, '$1/comments/$2')
			),
			articleReference = {
				slug
			};
		await webAppViewController.loadUrl(commentsUrl);
		await webAppViewController.readArticle(articleReference);
		return {
			main: commentsUrl,
			article: articleReference
		};
	}
	webAppViewController.closeReader();
	await webAppViewController.loadUrl(url);
	return {
		main: url,
		article: null
	};
}

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
				const argUrlResult = await loadUrlFromArguments(webAppViewController, process.argv);
				if (!argUrlResult.main) {
					webAppViewController.loadUrl(
						createUrl(appConfig.webServer)
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
				if (webAppViewController) {
					const argUrlResult = await loadUrlFromArguments(webAppViewController, argv);
					if (!argUrlResult.main && !argUrlResult.article) {
						return;
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