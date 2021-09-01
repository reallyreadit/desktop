import { app } from 'electron';
import childProcess from 'child_process';
import path from 'path';
import { appScheme } from './appScheme';
import { extensionAppManifest } from './extensionAppManifest';
import fs from 'fs/promises';

export enum SquirrelResult {
	None,
	FirstRun,
	ProcessingInstallationEvent
}

function runSquirrel(args: string[]) {
	return new Promise(
		resolve => {
			childProcess
				.spawn(
					path.resolve(
						path.dirname(process.execPath), '..', 'Update.exe'
					),
					args,
					{
						detached: true
					}
				)
				.on('close', resolve);
		}
	);
}

export function tryProcessSquirrelEvent(): SquirrelResult {
	const squirrelEvent = process.argv[1];
	if (
		process.platform !== 'win32' ||
		!squirrelEvent?.startsWith('--squirrel-')
	) {
		return SquirrelResult.None;
	}
	const shortcutTarget = path.basename(process.execPath);
	switch (squirrelEvent) {
		case '--squirrel-firstrun':
			return SquirrelResult.FirstRun;
		case '--squirrel-install':
		case '--squirrel-updated':
			runSquirrel(['--createShortcut=' + shortcutTarget])
				.then(appScheme.register)
				.then(extensionAppManifest.register)
				.finally(app.quit);
			return SquirrelResult.ProcessingInstallationEvent;
		case '--squirrel-uninstall':
			runSquirrel(['--removeShortcut=' + shortcutTarget])
				.then(appScheme.unregister)
				.then(extensionAppManifest.unregister)
				.then(
					() => fs.rm(
						app.getPath('userData'),
						{
							force: true,
							recursive: true
						}
					)
				)
				.finally(app.quit);
			return SquirrelResult.ProcessingInstallationEvent;
		case '--squirrel-obsolete':
		default:
			app.quit();
			return SquirrelResult.ProcessingInstallationEvent;
	}
}