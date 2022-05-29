// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

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