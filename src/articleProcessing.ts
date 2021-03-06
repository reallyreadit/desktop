// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import got, { Headers } from 'got';
import { Cookie, CookieJar } from 'tough-cookie';

const viewportMetaTagReplacement = {
	searchValue: "<meta[^>]*name=(\\\\?)(['\"])viewport\\1\\2[^>]*>",
	replaceValue: "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover\">"
};
const scriptRemovalTagReplacement = {
	searchValue: "<script\\b(?:[^>](?!\\btype=(\\\\?)(['\"])(?:application\\\\?/(?:ld\\+)?json|text\\\\?/template)\\1\\2))*>[^<]*(?:(?!<\\\\?/script>)<[^<]*)*<\\\\?/script>",
	replaceValue: ""
};
const iframeRemovalTagReplacement = {
	searchValue: "<iframe\\b[^>]*>(?:\\s*<\\\\?/iframe>)?",
	replaceValue: ""
};
const inlineStyleRemovalTagReplacement = {
	searchValue: "<style\\b[^<]*(?:(?!<\\\\?/style>)<[^<]*)*<\\\\?/style>",
	replaceValue: ""
};
const linkedStyleRemovalTagReplacement = {
	searchValue: "<link\\b[^>]*\\brel=(\\\\?)(['\"])stylesheet\\1\\2[^>]*>",
	replaceValue: ""
};

type RequestPreProcessor = (url: URL, headers: Headers, cookieJar: CookieJar) => void;

const hostSpecificRequestPreProcessors: { [key: string]: RequestPreProcessor } = {
	'npr.org': (url, _, cookieJar) => {
		cookieJar.setCookieSync(
			new Cookie({
				domain: url.hostname,
				path: '/',
				key: 'trackingChoice',
				value: 'true'
			}),
			url.href
		);
		cookieJar.setCookieSync(
			new Cookie({
				domain: url.hostname,
				path: '/',
				key: 'choiceVersion',
				value: '1'
			}),
			url.href
		);
		cookieJar.setCookieSync(
			new Cookie({
				domain: url.hostname,
				path: '/',
				key: 'dateOfChoice',
				value: Date
					.now()
					.toString()
			}),
			url.href
		);
	},
	'washingtonpost.com': (url, _, cookieJar) => {
		cookieJar.setCookieSync(
			new Cookie({
				domain: url.hostname,
				path: '/',
				key: 'wp_gdpr',
				value: '1|1'
			}),
			url.href
		);
	},
	'wsj.com': (_, headers) => {
		headers['Referer'] = "https://drudgereport.com/";
	}
};

function processArticleContent(content: string) {
	const tagReplacements = [
		scriptRemovalTagReplacement,
		iframeRemovalTagReplacement,
		inlineStyleRemovalTagReplacement,
		linkedStyleRemovalTagReplacement,
		viewportMetaTagReplacement
	];
	for (const tagReplacement of tagReplacements) {
		content = content.replaceAll(
			new RegExp(tagReplacement.searchValue, 'g'),
			tagReplacement.replaceValue
		);
	}
	return content;
}

export async function fetchArticle(url: URL) {
	// impersonate chrome on windows 10 desktop
	const headers: Headers = {
		'sec-ch-ua': '"Chromium";v="94", "Google Chrome";v="94", ";Not A Brand";v="99"',
		'sec-ch-ua-mobile': '?0',
		'sec-ch-ua-platform': '"Windows"',
		'Upgrade-Insecure-Requests': '1',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
		'Sec-Fetch-Site': 'none',
		'Sec-Fetch-Mode': 'navigate',
		'Sec-Fetch-User': '?1',
		'Sec-Fetch-Dest': 'document',
		'Accept-Encoding': 'gzip, deflate, br',
		'Accept-Language': 'en-US,en;q=0.9'
	};
	// Use a temporary/per-request cookie jar.
	const cookieJar = new CookieJar();
	// special host handling
	const preProcessor = hostSpecificRequestPreProcessors[url.hostname.replace(/^www\./, '')];
	if (preProcessor) {
		preProcessor(url, headers, cookieJar);
	}
	// initiate request
	const content = await got
		.get(
			url,
			{
				cookieJar,
				headers
			}
		)
		.text();
	return processArticleContent(content);
}