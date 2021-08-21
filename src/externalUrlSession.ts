import { BrowserWindow } from 'electron';
import { ExternalUrlCompletionEvent } from './models/ExternalUrlCompletionEvent';

export function presentExternalUrlSession(url: string) {
	const externalWindow = new BrowserWindow({
		width: 600,
		height: 600
	});
	return new Promise<ExternalUrlCompletionEvent>(
		resolve => {
			externalWindow.on(
				'closed',
				() => {
					resolve({ });
				}
			);
			externalWindow.loadURL(url);
		}
	);
}