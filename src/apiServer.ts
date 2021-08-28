import got, { OptionsOfTextResponseBody } from 'got';
import { appConfig } from './appConfig';
import { createUrl } from './routing/HttpEndpoint';
import { sharedCookieStore } from './sharedCookieStore';

type GotSearchParams = string | Record<string, string | number | boolean | null | undefined> | URLSearchParams | undefined;

interface Options {
	followRedirect?: boolean
}

const defaultHeaders = {
	'X-Readup-Client': `desktop/app@${appConfig.appVersion.toString()}`
};

function createApiServerUrl(path: string) {
	return createUrl(appConfig.apiServer, path);
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
			createApiServerUrl(path),
			await createGetOptions(queryItems, options)
		),
	getJson: async <T>(path: string, queryItems?: GotSearchParams) => await got
		.get(
			createApiServerUrl(path),
			await createGetOptions(queryItems)
		)
		.json<T>(),
	post: async <T>(path: string, data?: T) => await got
		.post(
			createApiServerUrl(path),
			await createPostOptions(data)
		),
	postJson: async <TData, TResult>(path: string, data?: TData) => await got
		.post(
			createApiServerUrl(path),
			await createPostOptions(data)
		)
		.json<TResult>()
};