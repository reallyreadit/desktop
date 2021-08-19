import got from 'got';
import { sharedCookieStore } from './sharedCookieStore';

type GotSearchParams = string | Record<string, string | number | boolean | null | undefined> | URLSearchParams | undefined;

const defaultHeaders = {
	'X-Readup-Client': 'ios/app@7.0.2'
};

function createUrl(path: string) {
	return 'https://api.dev.readup.com' + path;
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
	postJson: async <TData, TResult>(path: string, data: TData) => {
		return await got
			.post(
				createUrl(path),
				{
					body: JSON.stringify(data),
					cookieJar: await sharedCookieStore.getStore(),
					headers: {
						...defaultHeaders,
						'Content-Type': 'application/json'
					},
				},
			)
			.json<TResult>();
	}
};