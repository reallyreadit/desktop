// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import { appConfig } from '../appConfig';
import { ArticleReadOptions } from '../models/ArticleReadOptions';
import { ArticleReference } from '../models/ArticleReference';
import { sharedCookieStore } from '../sharedCookieStore';
import { createUrl } from './HttpEndpoint';

export interface ArgumentsUrlResult {
	main: URL | null,
	article: {
		reference: ArticleReference,
		options?: ArticleReadOptions
	} | null
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
				reference: {
					url: url.searchParams.get('url')!
				},
				options: {
					star: url.searchParams.has('star')
				}
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
				reference: {
					slug: pathComponents[2] + '_' + pathComponents[3]
				}
			}
		};
	}
	return {
		main: url,
		article: null
	};
}