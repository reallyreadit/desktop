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