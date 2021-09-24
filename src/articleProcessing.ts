import got, { Headers } from 'got';
import { Cookie, CookieJar } from 'tough-cookie';

const viewportMetaTagReplacement = {
	searchValue: "<meta([^>]*)name=(['\"])viewport\\2([^>]*)>",
	replaceValue: "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,minimum-scale=1,viewport-fit=cover\">"
};
// this replacement should be called first since the local replacement
// looks at the type to avoid reprocessing and losing the src data
const remoteScriptDisablingTagReplacement = {
	searchValue: "<script\\b[^>]*\\bsrc=(['\"])([^'\"]+)\\1[^>]*>[^<]*(?:(?!</script>)<[^<]*)*</script>",
	replaceValue: "<script type=\"text/x-readup-disabled-javascript\" data-src=\"$2\"></script>"
};
const localScriptDisablingTagReplacement = {
	searchValue: "<script\\b(?:[^>](?!\\btype=(['\"])(application/(ld\\+)?json|text/x-readup-disabled-javascript)\\1))*>([^<]*(?:(?!</script>)<[^<]*)*)</script>",
	replaceValue: "<script type=\"text/x-readup-disabled-javascript\">$4</script>"
};
const iframeRemovalTagReplacement = {
	searchValue: "<iframe\\b[^<]*(?:(?!</iframe>)<[^<]*)*</iframe>",
	replaceValue: ""
};
const inlineStyleRemovalTagReplacement = {
	searchValue: "<style\\b[^<]*(?:(?!</style>)<[^<]*)*</style>",
	replaceValue: ""
};
const linkedStyleRemovalTagReplacement = {
	searchValue: "<link\\b[^>]*\\brel=(['\"])stylesheet\\1[^>]*>",
	replaceValue: ""
};
const imageRemovalTagReplacement = {
	searchValue: "<img\\b[^>]*>",
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
		// remote scripts must be disabled first!
		remoteScriptDisablingTagReplacement,
		localScriptDisablingTagReplacement,
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
	// use desktop user agent
	const headers: Headers = {
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36'
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