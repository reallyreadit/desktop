import { appConfig } from '../appConfig';
import { ArticleReference } from '../models/ArticleReference';
import { sharedCookieStore } from '../sharedCookieStore';
import { createUrl } from './HttpEndpoint';

export interface ArgumentsUrlResult {
	main: URL | null,
	article: ArticleReference | null
}

export async function loadUrlFromArguments(argv: string[]): Promise<ArgumentsUrlResult> {
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
		return {
			main: null,
			article: {
				url: url.searchParams.get('url')!
			}
		};
	}
	if (
		url.pathname.startsWith('/read') &&
		(pathComponents = url.pathname.split('/')).length === 4 &&
		await sharedCookieStore.isAuthenticated()
	) {
		return {
			main: new URL(
				url.href.replace(/^(https?:\/\/[^\/]+)\/read\/(.+)/, '$1/comments/$2')
			),
			article: {
				slug: pathComponents[2] + '_' + pathComponents[3]
			}
		};
	}
	return {
		main: url,
		article: null
	};
}