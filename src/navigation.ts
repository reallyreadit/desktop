import { shell } from 'electron';

type WindowOpenHandlerResponse = {
	action: "deny";
} | {
	action: "allow";
	overrideBrowserWindowOptions?: Electron.BrowserWindowConstructorOptions | undefined;
};

export function handleWindowOpen(details: Electron.HandlerDetails): WindowOpenHandlerResponse {
	shell.openExternal(details.url);
	return {
		action: 'deny'
	};
}