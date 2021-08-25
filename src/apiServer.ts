import got, { CancelableRequest, OptionsOfTextResponseBody } from 'got';
import { sharedCookieStore } from './sharedCookieStore';

type GotSearchParams = string | Record<string, string | number | boolean | null | undefined> | URLSearchParams | undefined;

interface Options {
	followRedirect?: boolean
}

const defaultHeaders = {
	'X-Readup-Client': 'ios/app@7.0.2'
};

function createUrl(path: string) {
	return 'https://api.dev.readup.com' + path;
}
async function createGetOptions(queryItems?: GotSearchParams, options?: Options) {
	const standardOptions: OptionsOfTextResponseBody = {
		cookieJar: await sharedCookieStore.getStore(),
		headers: defaultHeaders,
		searchParams: queryItems
	};
	if (options) {
		standardOptions.followRedirect = options.followRedirect;
	}
	return standardOptions;
}
async function createPostOptions<T>(data?: T) {
	const options: OptionsOfTextResponseBody = {
		cookieJar: await sharedCookieStore.getStore(),
		headers: {
			...defaultHeaders
		}
	};
	if (data) {
		options.body = JSON.stringify(data);
		options.headers = {
			...options.headers,
			'Content-Type': 'application/json'
		};
	}
	return options;
}

export const apiServer = {
	get: async (path: string, queryItems?: GotSearchParams, options?: Options) => await got
		.get(
			createUrl(path),
			await createGetOptions(queryItems, options)
		),
	getJson: async <T>(path: string, queryItems?: GotSearchParams) => await got
		.get(
			createUrl(path),
			await createGetOptions(queryItems)
		)
		.json<T>(),
	post: async <T>(path: string, data?: T) => await got
		.post(
			createUrl(path),
			await createPostOptions(data)
		),
	postJson: async <TData, TResult>(path: string, data?: TData) => await got
		.post(
			createUrl(path),
			await createPostOptions(data)
		)
		.json<TResult>()
};