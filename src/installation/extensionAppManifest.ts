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
import fs from 'fs/promises';
import path from 'path';
import { appConfig } from '../appConfig';
import { registry } from './registry';

type Browser = 'chrome' | 'edge' | 'firefox';

type ManifestBase = {
	name: string,
	description: string,
	path: string,
	type: 'stdio'
};
type ChromeManifest = ManifestBase & {
	allowed_origins: string[]
};
type FirefoxManifest = ManifestBase & {
	allowed_extensions: string[]
};

const browsers = new Set<Browser>([
	'chrome',
	'edge',
	'firefox'
]);

const manifestBase: ManifestBase = {
	name: 'it.reallyread.mobile.browser_extension_app',
	description: 'Readup Browser Extension App',
	path: path.join(
		app.getAppPath(),
		'content/windows/BrowserExtensionApp.exe'
	),
	type: 'stdio'
};

const manifestMap: { [key in Browser]: ChromeManifest | FirefoxManifest } = {
	'chrome': <ChromeManifest>{
		...manifestBase,
		allowed_origins: [
			`chrome-extension://${appConfig.extensionIds.chrome}/`
		]
	},
	'edge': <ChromeManifest>{
		...manifestBase,
		allowed_origins: [
			`chrome-extension://${appConfig.extensionIds.edge}/`
		]
	},
	'firefox': <FirefoxManifest>{
		...manifestBase,
		allowed_extensions: [
			appConfig.extensionIds.firefox
		]
	}
};

const registryKeyMap: { [key in Browser]: string } = {
	'chrome': 'HKEY_CURRENT_USER\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\it.reallyread.mobile.browser_extension_app',
	'edge': 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Edge\\NativeMessagingHosts\\it.reallyread.mobile.browser_extension_app',
	'firefox': 'HKEY_CURRENT_USER\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\it.reallyread.mobile.browser_extension_app'
}

function getManifestFilePath(browser: Browser) {
	return path.join(
		getManifestsDirectory(browser),
		'it.reallyread.mobile.browser_extension_app.json'
	);
}
function getManifestsDirectory(browser: Browser) {
	return path.join(
		app.getPath('userData'),
		'com.readup/extensionManifests/v1',
		browser
	);
}
async function initializeDirectories() {
	for (const browser of browsers) {
		await fs.mkdir(
			getManifestsDirectory(browser),
			{
				recursive: true
			}
		);
	}
}

export const extensionAppManifest = {
	register: async () => {
		// Initialze the directories.
		await initializeDirectories();
		// Write the manifests and registry keys.
		for (const browser of browsers) {
			const manifestFilePath = getManifestFilePath(browser);
			await fs.writeFile(
				manifestFilePath,
				JSON.stringify(
					manifestMap[browser]
				)
			);
			await registry.add(
				registryKeyMap[browser],
				{
					value: manifestFilePath
				}
			);
		}
	},
	unregister: async () => {
		for (const browser of browsers) {
			await registry.delete(
				registryKeyMap[browser]
			);
		}
	}
};