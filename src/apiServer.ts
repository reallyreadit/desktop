// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import got, { CancelableRequest, HTTPError, OptionsOfTextResponseBody, Response } from 'got';
import { appConfig } from './appConfig';
import { HttpProblemDetails } from './models/ProblemDetails';
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
function processError<T>(reason: any): Promise<T> {
	let problemDetails: HttpProblemDetails | undefined;
	if (
		reason instanceof HTTPError &&
		reason.response.headers['content-type']?.startsWith('application/problem+json') &&
		typeof reason.response.body === 'string'
	) {
		try {
			problemDetails = JSON.parse(reason.response.body)
		} catch { }
	}
	throw problemDetails ?? reason ?? new Error('An unexpected API server error occurred.');
}

export const apiServer = {
	get: async (path: string, queryItems?: GotSearchParams, options?: Options) => await got
		.get(
			createApiServerUrl(path),
			await createGetOptions(queryItems, options)
		)
		.catch(
			reason => processError<CancelableRequest<Response<string>>>(reason)
		),
	getJson: async <T>(path: string, queryItems?: GotSearchParams) => await got
		.get(
			createApiServerUrl(path),
			await createGetOptions(queryItems)
		)
		.json<T>()
		.catch(
			reason => processError<T>(reason)
		),
	post: async <T>(path: string, data?: T) => await got
		.post(
			createApiServerUrl(path),
			await createPostOptions(data)
		)
		.catch(
			reason => processError<CancelableRequest<Response<string>>>(reason)
		),
	postJson: async <TData, TResult>(path: string, data?: TData) => await got
		.post(
			createApiServerUrl(path),
			await createPostOptions(data)
		)
		.json<TResult>()
		.catch(
			reason => processError<TResult>(reason)
		)
};