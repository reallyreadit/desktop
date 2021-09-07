const { contextBridge, ipcRenderer } = require('electron');

const channel = 'overlay';

contextBridge.exposeInMainWorld(
	'__mainProcess',
	{
		addMessageListener: listener => {
			ipcRenderer.on(channel, listener);
		},
		sendMessage: message => {
			ipcRenderer.send(channel, message);
		}
	}
);