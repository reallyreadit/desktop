import { app, BrowserWindow } from 'electron';
import path from 'path';
import { ArticleReference } from './models/ArticleReference';
import { ArticleViewController } from './articleViewController';
import { MessagingContext } from './messagingContext';
import { userData } from './userData';
import { SignInEvent, SignInEventResponse, SignInEventType } from './models/SignInEvent';
import { NotificationAuthorizationStatus } from './models/NotificationAuthorizationStatus';
import { InitializationEvent } from './models/InitializationEvent';
import { UserAccount } from './models/UserAccount';
import { WebAuthRequest } from './models/WebAuth';
import { presentOauthAuthSession } from './authentication/oauthAuthSession';

const defaultWindowBackgroundColor = '#2a2326';
const defaultWindowSize = {
	width: 800,
	height: 600
};
const windowTitle = 'Readup';

let appWindow: BrowserWindow | undefined;
let messagingContext: MessagingContext | undefined;

if (
	app.requestSingleInstanceLock()
) {
	app
		.whenReady()
		.then(
			async () => {
				await createAppWindow();
			}
		);
	app
		.on(
			'second-instance',
			(_, argv) => {
				const urlArg = findReadupUrlArg(argv);
				if (
					appWindow &&
					urlArg?.searchParams.has('url')
				) {
					readArticle({
						url: urlArg.searchParams.get('url')!
					});
					if (
						appWindow.isMinimized()
					) {
						appWindow.restore();
					}
					appWindow.focus();
				}
			}
		)
		.on(
			'window-all-closed',
			() => {
				app.quit();
			}
		);
} else {
	app.quit();
}

const urlArg = findReadupUrlArg(process.argv);

function findReadupUrlArg(argv: string[]) {
	const arg = argv.find(
		arg => arg.startsWith('readup://')
	);
	if (arg) {
		return new URL(arg);
	}
}

function getDeviceInfo() {
	return {
		appVersion: '7.0.2',
		installationId: null,
		name: 'jeffcamera-desktop',
		token: null
	};
}

function readArticle(articleReference: ArticleReference) {
	const articleViewController = new ArticleViewController({
		onArticlePosted: post => {

		},
		onArticleUpdated: event => {
			messagingContext!.sendMessage({
				type: 'articleUpdated',
				data: event
			});
		},
		onAuthServiceAccountLinked: association => {

		},
		onClose: () => {
			articleViewController.detach(appWindow!);
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

	articleViewController.attach(appWindow!, articleReference);
}

function signIn(user: UserAccount, eventType: SignInEventType) {
	console.log('[webapp] authenticated');
}

function signOut() {
	console.log('[webapp] unauthenticated');
}

async function createAppWindow() {
	appWindow = new BrowserWindow({
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

	appWindow.on(
		'page-title-updated',
		event => {
			event.preventDefault();
		}
	);

	messagingContext = new MessagingContext({
		executeJavaScript: code => {
			appWindow!.webContents.executeJavaScript(code);
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
				case 'readArticle':
					readArticle(message.data as ArticleReference);
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

	await appWindow.loadURL('https://dev.readup.com/?clientType=App');

	if (
		urlArg?.searchParams.has('url')
	) {
		readArticle({
			url: urlArg.searchParams.get('url')!
		});
	}
}