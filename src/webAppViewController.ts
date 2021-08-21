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

function signIn(user: UserAccount, eventType: SignInEventType) {
	console.log('[webapp] authenticated');
}

function signOut() {
	console.log('[webapp] unauthenticated');
}

export class WebAppViewController {
	private _articleViewController: ArticleViewController | undefined;
	private readonly _messagingContext = new MessagingContext({
		executeJavaScript: code => {
			this._window.webContents.executeJavaScript(code);
		},
		ipcChannel: 'web-app',
		javascriptListenerObject: 'window.reallyreadit.app',
		onMessage: (message, sendResponse) => {
			switch (message.type) {
				case 'displayPreferenceChanged':
					userData.setDisplayPreference(message.data);
					break;
				case 'getDeviceInfo':
					sendResponse(
						getDeviceInfo()
					);
					break;
				case 'getVersion':
					sendResponse('7.0.2');
					break;
				case 'initialize':
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
					this.readArticle(message.data as ArticleReference);
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
	public readArticle(articleReference: ArticleReference) {
		if (this._articleViewController) {
			throw new Error('Already reading. Need to implemented article updating.');
		}
		this._articleViewController = new ArticleViewController({
			onArticlePosted: post => {

			},
			onArticleUpdated: event => {
				this._messagingContext.sendMessage({
					type: 'articleUpdated',
					data: event
				});
			},
			onAuthServiceAccountLinked: association => {

			},
			onClose: () => {
				this._articleViewController?.detach(this._window);
				this._articleViewController = undefined;
			},
			onCommentPosted: comment => {

			},
			onCommentUpdated: comment => {

			},
			onDisplayPreferenceChanged: preference => {

			},
			onNavTo: url => {

			},
			onOpenSubscriptionPrompt: () => {

			}
		});
		this._articleViewController.attach(this._window, articleReference);
	}
	public get window() {
		return this._window;
	}
}