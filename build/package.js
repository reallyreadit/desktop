// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

const path = require('path');
const fs = require('fs');
const packager = require('electron-packager');
const { packageOut } = require('./constants');
const { getConfig } = require('./config');

const platformOptions = {
	'linux': {
		extensionAppPath: 'content/linux/BrowserExtensionApp',
		ignoreList: [
			/^\/content\/linux\/it\.reallyread\.mobile\.browser_extension_app\.template\.json$/,
			/^\/content\/windows/
		]
	},
	'win32': {
		extensionAppPath: 'content/windows/BrowserExtensionApp.exe',
		ignoreList: [
			/^\/content\/linux/
		]
	}
};

const manifestOptions = {
	'chrome': {
		path: 'content/linux/chrome',
		createPermissions: extensionId => ({
			allowed_origins: [
				`chrome-extension://${extensionId}/`
			]
		})
	},
	'firefox': {
		path: 'content/linux/firefox',
		createPermissions: extensionId => ({
			allowed_extensions: [
				extensionId
			]
		})
	}
};

module.exports = {
	package: ({
		configType,
		extensionAppPath,
		platform
	}) => {
		console.log('Starting electron-packager...');
		return packager({
			afterCopy: [
				(buildPath, electronVersion, platform, arch, callback) => {
					console.log('Writing configuration file...');
					const config = getConfig(configType);
					fs.writeFileSync(
						path.join(buildPath, 'config.json'),
						JSON.stringify(config)
					);
					console.log('Copying browser extension application executable...');
					fs.copyFileSync(
						extensionAppPath,
						path.join(buildPath, platformOptions[platform].extensionAppPath)
					);
					if (platform === 'linux') {
						console.log('Writing browser extension application manifests...');
						const manifestTemplate = JSON.parse(
							fs.readFileSync(
								'content/linux/it.reallyread.mobile.browser_extension_app.template.json',
								{
									encoding: 'utf8'
								}
							)
						);
						for (const browser in manifestOptions) {
							const options = manifestOptions[browser];
							fs.mkdirSync(
								path.join(buildPath, options.path),
								{
									recursive: true
								}
							);
							fs.writeFileSync(
								path.join(buildPath, options.path, 'it.reallyread.mobile.browser_extension_app.json'),
								JSON.stringify({
									...manifestTemplate,
									...options.createPermissions(config.extensionIds[browser])
								})
							);
						}
					}
					callback();
				}
			],
			arch: [
				'x64'
			],
			dir: '.',
			icon: 'content/windows/Readup.ico',
			ignore: [
				/^\/\./,
				/^\/build/,
				/^\/pkg/,
				/^\/src/,
				/^\/config\.[^.]+\.json/,
				/^\/package\.js$/,
				/^\/publish\.js$/,
				/^\/readme\.md$/,
				/^\/tsconfig\.json/,
				...platformOptions[platform].ignoreList
			],
			out: packageOut,
			platform
		});
	}
};