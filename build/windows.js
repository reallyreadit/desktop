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
const winstaller = require('electron-winstaller');
const { packageOut, installerOut } = require('./constants');
const { getConfig } = require('./config');

module.exports = {
	createInstaller: ({
		certThumbprint,
		configType
	}) => {
		console.log('Starting electron-winstaller...');
		const appConfig = getConfig(configType);
		return winstaller.createWindowsInstaller({
			appDirectory: path.join(packageOut, 'Readup-win32-x64'),
			exe: 'Readup.exe',
			iconUrl: 'https://static.dev.readup.com/app/images/favicon.ico',
			loadingGif: path.resolve('content/images/electron-installation-tile-500.gif'),
			name: 'Readup',
			noMsi: true,
			outputDirectory: installerOut,
			remoteReleases: appConfig.autoUpdateFeedUrl,
			setupIcon: path.resolve('content/windows/Readup.ico'),
			signWithParams: `/tr http://timestamp.sectigo.com /td sha256 /fd sha256 /sha1 ${certThumbprint}`
		});
	}
};