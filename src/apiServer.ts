import got, { CancelableRequest, OptionsOfTextResponseBody } from 'got';
import { sharedCookieStore } from './sharedCookieStore';

type GotSearchParams = string | Record<string, string | number | boolean | null | undefined> | URLSearchParams | undefined;

const defaultHeaders = {
	'X-Readup-Client': 'ios/app@7.0.2'
};

function createUrl(path: string) {
	return 'https://api.dev.readup.com' + path;
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
	getJson: async <T>(path: string, queryItems?: GotSearchParams) => {
		return await got
			.get(
				createUrl(path),
				{
					cookieJar: await sharedCookieStore.getStore(),
					headers: defaultHeaders,
					searchParams: queryItems
				}
			)
			.json<T>();
	},
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