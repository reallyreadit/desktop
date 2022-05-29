// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import SemanticVersion from './models/SemanticVersion';
import { userData } from './userData';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import got from 'got/dist/source';
import { appConfig } from './appConfig';
import { createUrl } from './routing/HttpEndpoint';

export interface ScriptUpdateRecord {
	downloadedVersion: string | null,
	lastUpdateCheck: number
}

function getBundledScriptPath() {
	return path.resolve(
		app.getAppPath(),
		'content/reader.js'
	);
}
function getDownloadDirectory() {
	return path.join(
		app.getPath('userData'),
		'com.readup/scripts/v1'
	);
}
function getDownloadedScriptPath() {
	return path.join(
		getDownloadDirectory(),
		'reader.js'
	);
}

export const readerScript = {
	getLatestScript: async () => {
		const updateRecord = await userData.getReaderScriptUpdateRecord();
		try {
			if (
				updateRecord?.downloadedVersion &&
				new SemanticVersion(updateRecord.downloadedVersion)
					.compareTo(appConfig.readerScriptVersion) > 0
			) {
				console.log('[scripts] loading downloaded script');
				return await fs.readFile(
					getDownloadedScriptPath(),
					{
						encoding: 'utf8'
					}
				);
			}
		} catch {
			// fall back to bundled script
		}
		console.log('[scripts] loading bundled script');
		return await fs.readFile(
			getBundledScriptPath(),
			{
				encoding: 'utf8'
			}
		);
	},
	initializeDirectories: async () => {
		return fs.mkdir(
			getDownloadDirectory(),
			{
				recursive: true
			}
		);
	},
	updateScript: async () => {
		const
			now = Date.now(),
			updateRecord = await userData.getReaderScriptUpdateRecord();
		console.log(`[scripts] last update check: ${updateRecord != null ? new Date(updateRecord.lastUpdateCheck).toString() : 'N/A'}`);
		if (updateRecord && now - updateRecord.lastUpdateCheck < 1 * 60 * 60 * 1000) {
			return;
		}
		const availableVersions = [
			appConfig.readerScriptVersion
		];
		if (updateRecord?.downloadedVersion) {
			availableVersions.push(
				new SemanticVersion(updateRecord?.downloadedVersion)
			);
		}
		const currentVersion = SemanticVersion.greatest(...availableVersions);
		console.log(`[scripts] checking for new version. current version: ${currentVersion.toString()}`);
		userData.setReaderScriptUpdateRecord({
			downloadedVersion: updateRecord?.downloadedVersion ?? null,
			lastUpdateCheck: now
		});
		got
			.get(
				createUrl(appConfig.staticServer, '/native-client/reader.txt')
			)
			.text()
			.then(text => {
				const newVersionInfo = text
					.split('\n')
					.filter(
						line => SemanticVersion.regex.test(line)
					)
					.map(
						fileName => ({
							fileName,
							version: new SemanticVersion(fileName)
						})
					)
					.find(versionInfo => currentVersion.canUpgradeTo(versionInfo.version));
				if (newVersionInfo) {
					console.log(`[scripts] updating to version: ${newVersionInfo.version.toString()}`);
					got
						.get(
							createUrl(appConfig.staticServer, '/native-client/reader/' + newVersionInfo.fileName)
						)
						.text()
						.then(text => fs.writeFile(
							getDownloadedScriptPath(),
							text
						))
						.then(() => userData.setReaderScriptUpdateRecord({
							downloadedVersion: newVersionInfo.version.toString(),
							lastUpdateCheck: now
						}))
						.catch(() => {
							console.log('[scripts] error updating to new version');
						});
				} else {
					console.log('[scripts] no new version');
				}
			})
			.catch(() => {
				console.log('[scripts] error checking for new version');
			});
	}
};