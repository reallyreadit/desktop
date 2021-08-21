import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { ArticleViewController } from './articleViewController';
import { presentAppleIdAuthSession } from './authentication/appleIdAuthSession';
import { presentOauthAuthSession } from './authentication/oauthAuthSession';
import { presentExternalUrlSession } from './externalUrlSession';
import { MessagingContext } from './messagingContext';
import { ArticleReference } from './models/ArticleReference';
import { InitializationEvent } from './models/InitializationEvent';
import { NotificationAuthorizationStatus } from './models/NotificationAuthorizationStatus';
import { SignInEvent, SignInEventResponse, SignInEventType } from './models/SignInEvent';
import { UserAccount } from './models/UserAccount';
import { WebAuthRequest } from './models/WebAuth';
import { userData } from './userData';

const defaultWindowBackgroundColor = '#2a2326';
const defaultWindowSize = {
	width: 800,
	height: 600
};
const windowTitle = 'Readup';

function getDeviceInfo() {
	return {
		appVersion: '7.0.2',
		installationId: null,
		name: 'jeffcamera-desktop',
		token: null
	};
}

function prepareUrl(url: URL) {
	// convert reallyread.it urls to readup.com
	url.hostname = url.hostname.replace('reallyread.it', 'dev.readup.com');
	// verify that the host matches the web server host
	if (url.hostname !== 'dev.readup.com') {
		url = new URL('https://dev.readup.com/');
	}
	// force https
	url.protocol = 'https:';
	// set the client type in the query string
	url.searchParams.set('clientType', 'App');
	// return the url
	return url;
}

function signIn(user: UserAccount, eventType: SignInEventType) {
	console.log('[webapp] authenticated');
}

function signOut() {
	console.log('[webapp] unauthenticated');
}

export class WebAppViewController {
	private _articleViewController: ArticleViewController | undefined;
	private _hasEstablishedCommunication = false;
	private readonly _messagingContext = new MessagingContext({
		executeJavaScript: code => {
			this._window.webContents.executeJavaScript(code);
		},
		ipcChannel: 'web-app',
		javascriptListenerObject: 'window.reallyreadit.app',
		onMessage: async (message, sendResponse) => {
			switch (message.type) {
				case 'displayPreferenceChanged':
					userData.setDisplayPreference(message.data);
					break;
				case 'getDeviceInfo':
					this._hasEstablishedCommunication = true;
					sendResponse(
						getDeviceInfo()
					);
					break;
				case 'initialize':
					this._hasEstablishedCommunication = true;
					const initializationEvent = message.data as InitializationEvent;
					if (initializationEvent.user) {
						signIn(initializationEvent.user, SignInEventType.ExistingUser);
					} else {
						signOut();
					}
					sendResponse(
						getDeviceInfo()
					);
					break;
				case 'openExternalUrl':
				case 'openExternalUrlUsingSystem':
					shell.openExternal(message.data as string);
					break;
				case 'openExternalUrlWithCompletionHandler':
					presentExternalUrlSession(message.data as string)
						.then(sendResponse);
					break;
				case 'readArticle':
					await this.readArticle(message.data as ArticleReference);
					break;
				case 'requestAppleIdCredential':
					presentAppleIdAuthSession()
						.then(
							credential => {
								this._messagingContext.sendMessage({
									type: 'authenticateAppleIdCredential',
									data: credential
								});
							}
						);
					break;
				case 'requestWebAuthentication':
					const request = message.data as WebAuthRequest;
					presentOauthAuthSession(request)
						.then(sendResponse);
					break;
				case 'signIn':
					const signInEvent = message.data as SignInEvent;
					signIn(signInEvent.user, signInEvent.eventType);
					sendResponse(
						{
							notificationAuthorizationStatus: NotificationAuthorizationStatus.Denied
						} as SignInEventResponse
					);
					break;
				case 'signOut':
					signOut();
					break;
			}
		}
	});
	private readonly _window = new BrowserWindow({
		width: defaultWindowSize.width,
		height: defaultWindowSize.height,
		title: windowTitle,
		backgroundColor: defaultWindowBackgroundColor,
		webPreferences: {
			preload: path.resolve(
				app.getAppPath(),
				'bin/preloadScripts/webAppPreloadScript.js'
			)
		}
	});
	constructor() {
		this._window.on(
			'page-title-updated',
			event => {
				event.preventDefault();
			}
		);
		this._window.loadURL('https://dev.readup.com/?clientType=App')
	}
	private closeReader() {
		this._articleViewController?.detach(this._window);
		this._articleViewController = undefined;
	}
	public loadUrl(url: URL) {
		const preparedUrl = prepareUrl(url)
			.toString();
		console.log(`[webapp] load url: ${preparedUrl}`);
		if (this._hasEstablishedCommunication) {
			this._messagingContext.sendMessage({
				type: 'loadUrl',
				data: preparedUrl
			});
		} else {
			this._window.loadURL(preparedUrl);
		}
	}
	public async readArticle(articleReference: ArticleReference) {
		if (this._articleViewController) {
			throw new Error('Already reading. Need to implemented article updating.');
		}
		this._articleViewController = new ArticleViewController({
			onArticlePosted: post => {
				this._messagingContext.sendMessage({
					type: 'articlePosted',
					data: post
				});
			},
			onArticleStarred: event => {
				this._messagingContext.sendMessage({
					type: 'articleStarred',
					data: event
				});
			},
			onArticleUpdated: event => {
				this._messagingContext.sendMessage({
					type: 'articleUpdated',
					data: event
				});
			},
			onAuthServiceAccountLinked: association => {
				this._messagingContext.sendMessage({
					type: 'authServiceAccountLinked',
					data: association
				});
			},
			onClose: () => {
				this.closeReader();
			},
			onCommentPosted: comment => {
				this._messagingContext.sendMessage({
					type: 'commentPosted',
					data: comment
				});
			},
			onCommentUpdated: comment => {
				this._messagingContext.sendMessage({
					type: 'commentUpdated',
					data: comment
				});
			},
			onDisplayPreferenceChanged: preference => {
				this._messagingContext.sendMessage({
					type: 'displayPreferenceChanged',
					data: preference
				});
			},
			onNavTo: url => {
				this.closeReader();
				this.loadUrl(url);
			},
			onOpenSubscriptionPrompt: () => {
				this.closeReader();
				this._messagingContext.sendMessage({
					type: 'openSubscriptionPrompt',
					data: true
				});
			}
		});
		await this._articleViewController.attach(this._window);
		await this._articleViewController.replaceArticle(articleReference);
	}
	public get window() {
		return this._window;
	}
}