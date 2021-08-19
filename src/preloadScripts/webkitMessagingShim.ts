import { contextBridge, ipcRenderer } from 'electron';

export function createWebkitMessagingShim(ipcChannel: string) {
	const api = {
		messageHandlers: {
			reallyreadit: {
				postMessage: (envelope: any) => {
					ipcRenderer.send(ipcChannel, envelope);
				}
			}
		}
	};
	contextBridge.exposeInMainWorld('webkit', api);
}