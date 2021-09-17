import { app, BrowserView, ipcMain } from 'electron';
import path from 'path';
import { DisplayTheme, getDisplayTheme } from './models/DisplayPreference';
import { userData } from './userData';

export enum OverlayStateType {
	None = 'None',
	Loading = 'Loading',
	Error = 'Error'
};
export type OverlayNoneState = {
	type: OverlayStateType.None
};
export type OverlayLoadingState = {
	type: OverlayStateType.Loading
};
export type OverlayErrorState = {
	type: OverlayStateType.Error,
	id: string,
	message: string[],
	buttonText: string
};
export type OverlayState = OverlayNoneState | OverlayLoadingState | OverlayErrorState;

type TransitionListener = () => Promise<any>;

enum TransitionState {
	None,
	FadingOut,
	WaitingForListeners,
	FadingIn
}

interface Message {
	type: string,
	data?: any
}

interface OverlayViewControllerParams {
	ipcChannel: string,
	onErrorButtonClicked: (id: string) => void,
	onTransitionComplete: () => void
}

export class OverlayViewController {
	private _hasInitialized = false;
	private readonly _params: OverlayViewControllerParams;
	private readonly _processMessage = (event: Electron.IpcMainEvent, message: Message) => {
		console.log(`[overlay] received message: ${message.type}`);
		switch (message.type) {
			case 'errorButtonClick':
				this._params.onErrorButtonClicked(message.data.id);
				break;
			case 'fadeInComplete':
				if (this._transitionListeners.length) {
					this.beginFadingOut();
				} else {
					this._transitionState = TransitionState.None;
				}
				this._params.onTransitionComplete();
				break;
			case 'fadeOutComplete':
				this._transitionState = TransitionState.WaitingForListeners;
				Promise
					.all(
						this._transitionListeners
							.splice(0, this._transitionListeners.length)
							.map(
								listener => listener()
							)
					)
					.finally(
						() => {
							// Give an extra 100ms to avoid flashing due to what I assume is a repainting delay.
							setTimeout(
								() => {
									this.sendMessage('fadeIn');
									this._transitionState = TransitionState.FadingIn;
								},
								100
							);
						}
					);
				break;
		}
	};
	private _transitionListeners: TransitionListener[] = [];
	private _transitionState = TransitionState.None;
	private readonly _view = new BrowserView({
		webPreferences: {
			// This needs to be disabled so that the transition animations are never delayed or stalled due to the page visibility state.
			backgroundThrottling: false,
			preload: path.resolve(
				app.getAppPath(),
				'content/views/overlay/preload.js'
			)
		}
	});
	constructor(params: OverlayViewControllerParams) {
		this._params = params;
		ipcMain.on(params.ipcChannel, this._processMessage);
	}
	private beginFadingOut() {
		this.sendMessage('fadeOut');
		this._transitionState = TransitionState.FadingOut;
	}
	private sendMessage(type: string, data?: any) {
		console.log(`[overlay] sending message: ${type}: ${JSON.stringify(data)}`);
		this._view.webContents.send(
			this._params.ipcChannel,
			{
				type,
				data
			}
		);
	}
	public beginTransition(listener: TransitionListener) {
		this._transitionListeners.push(listener);
		if (this._transitionState === TransitionState.None) {
			this.beginFadingOut();
		}
	}
	public dispose() {
		ipcMain.off(this._params.ipcChannel, this._processMessage);
	}
	public async initialize(state: OverlayState) {
		console.log(`[overlay] initialize: ${state.type}`);
		await this._view.webContents.loadFile(
			path.join(
				app.getAppPath(),
				'content/views/overlay/index.html'
			),
			{
				query: {
					'state': JSON.stringify(state),
					'theme': getDisplayTheme(
							await userData.getDisplayPreference()
						)
						.toString()
				}
			}
		);
		this._hasInitialized = true;
	}
	public setDisplayTheme(displayTheme: DisplayTheme) {
		this.sendMessage('setDisplayTheme', displayTheme);
	}
	public setState(state: OverlayState) {
		this.sendMessage('setState', state);
	}
	public get hasInitialized() {
		return this._hasInitialized;
	}
	public get isTransitioning() {
		return this._transitionState !== TransitionState.None;
	}
	public get view() {
		return this._view;
	}
}