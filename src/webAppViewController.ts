import { app, BrowserView, BrowserWindow, shell } from 'electron';
import path from 'path';
import { appConfig } from './appConfig';
import { ArticleViewController } from './articleViewController';
import { presentAppleIdAuthSession } from './authentication/appleIdAuthSession';
import { presentOauthAuthSession } from './authentication/oauthAuthSession';
import { presentExternalUrlSession } from './externalUrlSession';
import { OverlayState, OverlayStateType, OverlayViewController } from './overlayViewController';
import { MessagingContext } from './messagingContext';
import { AlertStatus } from './models/AlertStatus';
import { AppActivationEvent } from './models/AppActivationEvent';
import { getAppPlatform } from './models/AppPlatform';
import { ArticleReference } from './models/ArticleReference';
import { DeviceInfo } from './models/DeviceInfo';
import { InitializationEvent } from './models/InitializationEvent';
import { NotificationAuthorizationStatus } from './models/NotificationAuthorizationStatus';
import { SignInEvent, SignInEventResponse, SignInEventType } from './models/SignInEvent';
import { UserAccount } from './models/UserAccount';
import { WebAuthRequest } from './models/WebAuth';
import { notifications } from './notifications';
import { readerScript } from './readerScript';
import { createUrl } from './routing/HttpEndpoint';
import { userData } from './userData';
import { DisplayTheme } from './models/DisplayPreference';
import { ArticleReadOptions } from './models/ArticleReadOptions';
import { appUpdates } from './appUpdates';

const windowBackgroundColorMap: { [key in DisplayTheme]: string } = {
	[DisplayTheme.Dark]: '#2a2326',
	[DisplayTheme.Light]: '#f7f6f5'
};
const defaultWindowSize = {
	width: 800,
	height: 600
};
const windowTitle = 'Readup';
const appPlatform = getAppPlatform();
const appVersion = appConfig.appVersion.toString();

function getDeviceInfo(): DeviceInfo {
	return {
		appPlatform,
		appVersion,
		installationId: null,
		name: '',
		token: null
	};
}

function prepareUrl(url: URL) {
	// convert reallyread.it urls to readup.com
	url.hostname = url.hostname.replace('reallyread.it', appConfig.webServer.host);
	// verify that the host matches the web server host
	if (url.hostname !== appConfig.webServer.host) {
		url = createUrl(appConfig.webServer);
	}
	// force https
	url.protocol = 'https:';
	// set the client type in the query string
	url.searchParams.set('clientType', 'App');
	url.searchParams.set('appPlatform', appPlatform);
	url.searchParams.set('appVersion', appVersion);
	// return the url
	return url;
}

function signIn(user: UserAccount, eventType: SignInEventType) {
	console.log('[webapp] authenticated');
}

function signOut() {
	console.log('[webapp] unauthenticated');
}

interface WebAppViewControllerParams {
	displayTheme: DisplayTheme
}

export class WebAppViewController {
	private _articleViewController: ArticleViewController | undefined;
	private _hasEstablishedCommunication = false;
	private readonly _overlayViewController = new OverlayViewController({
		ipcChannel: 'overlay',
		onErrorButtonClicked: async id => {
			switch (id) {
				case 'article':
					this.closeReader();
					break;
				case 'webApp':
					await this.loadUrl(
						createUrl(appConfig.webServer)
					);
					break;
			}
		},
		onTransitionComplete: () => {
			this.setOverlayVisibility();
		}
	});
	private _overlayState: OverlayState = {
		type: OverlayStateType.Loading
	};
	private readonly _messagingContext = new MessagingContext({
		executeJavaScript: code => {
			this._view.webContents.executeJavaScript(code);
		},
		ipcChannel: 'web-app',
		javascriptListenerObject: 'window.reallyreadit.app',
		onMessage: async (message, sendResponse) => {
			switch (message.type) {
				case 'displayPreferenceChanged':
					this.setOverlayDisplayTheme(message.data.theme);
					await userData.setDisplayPreference(message.data);
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
				case 'installUpdate':
					appUpdates.installUpdate();
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
	private readonly _view = new BrowserView({
		webPreferences: {
			preload: path.resolve(
				app.getAppPath(),
				'bin/preloadScripts/webAppPreloadScript.js'
			)
		}
	});
	private readonly _window: BrowserWindow;
	constructor(params: WebAppViewControllerParams) {
		this._window = new BrowserWindow({
			width: defaultWindowSize.width,
			height: defaultWindowSize.height,
			title: windowTitle,
			backgroundColor: windowBackgroundColorMap[params.displayTheme],
			autoHideMenuBar: true
		});
		this.attachView(this._view);
		this.attachView(this._overlayViewController.view);
		this.setTopBrowserView(this._view);
		this._window
			.on(
				'focus',
				() => {
					this._messagingContext.sendMessage({
						type: 'didBecomeActive',
						data: {
							badgeCount: 0,
							newStarCount: 0
						} as AppActivationEvent
					});
					readerScript.updateScript();
				}
			)
			.on(
				'page-title-updated',
				event => {
					event.preventDefault();
				}
			);
		// Maximizing the window does not work in linux! No maximize event is triggered and although the window itself is resized, the
		// visible content portion within it is not. This workaround attempts to detect a maximize event and force a resizing of the content
		// portion by triggering multiple manual resize operations. As a result of this workaround we have to disable BrowserView auto-resizing
		// and handle that manually as well.
		if (process.platform === 'linux') {
			type AutoResizeEvent = {
				type: 'auto'
			};
			type InitialManualResizeEvent = {
				type: 'initialManual',
				finalBounds: {
					width: number,
					height: number
				}
			};
			type FinalManualResizeEvent = {
				type: 'finalManual'
			};
			let resizeEvent: AutoResizeEvent | InitialManualResizeEvent | FinalManualResizeEvent = {
				type: 'auto'
			};
			this._window.on(
				'resize',
				() => {
					const
						bounds = this._window.getBounds(),
						contentBounds = this._window.getContentBounds();
					console.log(`[web-app] resize: ${bounds.width} x ${bounds.height} (bounds) ${contentBounds.width} x ${contentBounds.height} (contentBounds)`);
					// Always synchronize the views with the window bounds since we can't use view auto-resizing with this workaround.
					const viewBounds = {
						x: 0,
						y: 0,
						width: bounds.width,
						height: bounds.height
					}
					this._view.setBounds(viewBounds);
					this._overlayViewController.view.setBounds(viewBounds);
					this._articleViewController?.view.setBounds(viewBounds);
					// Check why we're resizing.
					switch (resizeEvent.type) {
						case 'auto':
							// When the window is maximized the contentBounds will be smaller than the bounds. That is our signal that we need to
							// start the manual resize workaround. We can skip the workaround if the contentBounds is greater than or equal to the bounds.
							if (
								contentBounds.width >= bounds.width &&
								contentBounds.height >= bounds.height
							) {
								return;
							}
							// If we just set the contentBounds = bounds then nothing will happen. We need to trigger a content resize by
							// setting to a different size first.
							const undersizedContentBounds = {
								width: bounds.width - 1,
								height: bounds.height - 1
							};
							console.log(`[web-app] initiating manual resize (${undersizedContentBounds.width} x ${undersizedContentBounds.height})`);
							resizeEvent = {
								type: 'initialManual',
								finalBounds: bounds
							};
							this._window.setContentBounds({
								x: 0,
								y: 0,
								width: undersizedContentBounds.width,
								height: undersizedContentBounds.height
							});
							break;
						case 'initialManual':
							// In this stage we just trigger a second content resize, this time to the final bounds that should have been
							// set in the first place.
							const finalBounds = resizeEvent.finalBounds;
							console.log(`[web-app] finalizing manual resize (${finalBounds.width} x ${finalBounds.height})`);
							resizeEvent = {
								type: 'finalManual'
							};
							this._window.setContentBounds({
								x: 0,
								y: 0,
								width: finalBounds.width,
								height: finalBounds.height
							});
							break;
						case 'finalManual':
							// Reset the event type to auto now that the manual process is complete. 
							resizeEvent = {
								type: 'auto'
							};
							break;
					}
				}
			);
		}
		this._view.webContents
			.on(
				'did-start-navigation',
				(event, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) => {
					if (isInPlace || !isMainFrame) {
						return;
					}
					console.log('[web-app] did-start-navigation');
					this.setOverlayState({
						type: OverlayStateType.Loading
					});
				}
			)
			.on(
				'did-navigate',
				(event, url, httpResponseCode, httpStatusText) => {
					console.log('[web-app] did-navigate');
					if (httpResponseCode === 200) {
						this.setOverlayState({
							type: OverlayStateType.None
						});
					} else {
						this.setOverlayErrorState();
					}
				}
			)
			.on(
				'did-fail-load',
				() => {
					console.log('[web-app] did-fail-load');
					this.setOverlayErrorState();
				}
			);
		notifications.addAlertStatusListener(
			event => {
				this._messagingContext.sendMessage({
					type: 'alertStatusUpdated',
					data: event.user as AlertStatus
				});
			}
		);
		notifications.addClickEventListener(
			async event => {
				this.closeReader();
				await this.loadUrl(event.url);
			}
		);
		appUpdates.addListener(
			event => {
				this._messagingContext.sendMessage({
					type: 'updateAvailable',
					data: {
						releaseName: event.releaseName
					}
				});
			}
		);
	}
	private attachView(view: BrowserView) {
		const windowBounds = this._window.getContentBounds();
		this._window.addBrowserView(view);
		view.setBounds({
			x: 0,
			y: 0,
			width: windowBounds.width,
			height: windowBounds.height
		});
		// Auto-resizing cannot be used in Linux due to the maximizing bug described above in the window resize handler.
		if (process.platform !== 'linux') {
			view.setAutoResize({
				height: true,
				width: true
			});
		}
	}
	private detachView(view: BrowserView) {
		this._window.removeBrowserView(view);
	}
	private setOverlayDisplayTheme(displayTheme: DisplayTheme) {
		this._overlayViewController.setDisplayTheme(displayTheme);
	}
	private setOverlayErrorState() {
		this.setOverlayState({
			type: OverlayStateType.Error,
			id: 'webApp',
			message: [
				'An error occured while loading the app.',
				'You must be online to use Readup.',
				'Offline support coming soon!'
			],
			buttonText: 'Try Again'
		});
	}
	private setOverlayState(state: OverlayState) {
		this._overlayState = state;
		this.setOverlayVisibility();
	}
	private setOverlayVisibility() {
		let topViewControllerState = this._articleViewController?.overlayState ?? this._overlayState;
		this._overlayViewController.setState(topViewControllerState);
		if (topViewControllerState.type !== OverlayStateType.None || this._overlayViewController.isTransitioning) {
			this.setTopBrowserView(this._overlayViewController.view);
		} else {
			this.setTopBrowserView(this._articleViewController?.view ?? this._view);
		}
	}
	private setTopBrowserView(view: BrowserView) {
		this._window.setTopBrowserView(view);
	}
	public closeReader() {
		if (!this._articleViewController) {
			return;
		}
		this._overlayViewController.beginTransition(
			() => {
				if (this._articleViewController) {
					this.detachView(this._articleViewController.view);
					this._articleViewController.dispose();
					this._articleViewController = undefined;
					this.setOverlayVisibility();
				}
				return Promise.resolve();
			}
		);
		this.setOverlayVisibility();
	}
	public async loadUrl(url: URL) {
		const preparedUrl = prepareUrl(url)
			.toString();
		console.log(`[webapp] load url: ${preparedUrl}`);
		if (!this._overlayViewController.hasInitialized) {
			await this._overlayViewController.initialize(this._overlayState);
		}
		if (this._hasEstablishedCommunication) {
			this._messagingContext.sendMessage({
				type: 'loadUrl',
				data: preparedUrl
			});
		} else {
			await this._view.webContents.loadURL(preparedUrl);
		}
	}
	public async readArticle(articleReference: ArticleReference, options?: ArticleReadOptions) {
		if (this._articleViewController) {
			await this._articleViewController.loadArticle(articleReference, options);
			return;
		}
		const articleViewController = new ArticleViewController({
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
				this.setOverlayDisplayTheme(preference.theme);
				this._messagingContext.sendMessage({
					type: 'displayPreferenceChanged',
					data: preference
				});
			},
			onNavTo: async url => {
				this.closeReader();
				await this.loadUrl(url);
			},
			onOpenSubscriptionPrompt: () => {
				this.closeReader();
				this._messagingContext.sendMessage({
					type: 'openSubscriptionPrompt',
					data: true
				});
			},
			onOverlayStateChanged: () => {
				this.setOverlayVisibility();
			}
		});
		this._overlayViewController.beginTransition(
			async () => {
				this._articleViewController = articleViewController;
				this.attachView(this._articleViewController.view);
				this.setOverlayVisibility();
				await this._articleViewController.loadArticle(articleReference, options);
			}
		);
		this.setOverlayVisibility();
	}
	public get window() {
		return this._window;
	}
}