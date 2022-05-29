// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import { ipcMain, WebContents } from 'electron';

interface CallEnvelope {
	callbackId?: number,
	data: Message
}

interface ResponseEnvelope {
	data: any,
	id: number
}

type Envelope = CallEnvelope | ResponseEnvelope;

function isResponseEnvelope(envelope: Envelope): envelope is ResponseEnvelope {
	return typeof (envelope as ResponseEnvelope).id === 'number';
}

interface Message {
	data?: any,
	type: string
}

interface ResponseCallback {
	id: number,
	function: (data: any) => void
}

function jsonEncodeForLiteral(object: any) {
	return JSON
		.stringify(object)
		.replaceAll('\\', '\\\\')
		.replaceAll("'", "\\'");
}

export interface MessagingContextParams {
	executeJavaScript: (code: string) => void,
	ipcChannel: string,
	javascriptListenerObject: string,
	onMessage: (message: Message, sendResponse: (data: any) => void) => void
}
export class MessagingContext {
	private readonly _ipcListener = (_: Electron.IpcMainEvent, envelope: Envelope) => {
		if (
			isResponseEnvelope(envelope)
		) {
			console.log(`[webview-msg] received response for callback: ${envelope.id}`);
			const responseCallback = this._responseCallbacks[envelope.id];
			responseCallback.function(envelope.data);
			this._responseCallbacks.splice(
				this._responseCallbacks.indexOf(responseCallback),
				1
			);
		} else {
			console.log(`[webview-msg] received message: ${envelope.data.type}`);
			this._params.onMessage(
				envelope.data,
				data => {
					if (typeof envelope.callbackId !== 'number') {
						return;
					}
					this.sendResponse(data, envelope.callbackId)
				}
			);
		}
	};
	private readonly _params: MessagingContextParams;
	private readonly _responseCallbacks: ResponseCallback[] = [];
	constructor(params: MessagingContextParams) {
		this._params = params;
		ipcMain.on(params.ipcChannel, this._ipcListener);
	}
	private sendResponse(data: any, callbackId: number) {
		console.log(`[webview-msg] sending response for callback: ${callbackId}`);
		const envelope = {
			data,
			id: callbackId
		};
		this._params.executeJavaScript(`${this._params.javascriptListenerObject}.sendResponse('${jsonEncodeForLiteral(envelope)}');`)
	}
	public dispose() {
		ipcMain.off(this._params.ipcChannel, this._ipcListener);
	}
	public sendMessage(message: Message, responseCallback?: (data: any) => void) {
		console.log(`[webview-msg] sending message: ${message.type}`);
		let callbackId: number | undefined;
		if (responseCallback) {
			callbackId = this._responseCallbacks.length ?
				Math.max(
					...this._responseCallbacks.map(
						callback => callback.id
					)
				) + 1 :
				0;
			this._responseCallbacks.push({
				id: callbackId,
				function: responseCallback
			});
		}
		const envelope = {
			callbackId,
			data: message
		};
		this._params.executeJavaScript(`${this._params.javascriptListenerObject}.postMessage('${jsonEncodeForLiteral(envelope)}');`);
	}
}