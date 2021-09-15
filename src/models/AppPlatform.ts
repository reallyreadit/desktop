export enum AppPlatform {
	Android = 'Android',
	Ios = 'iOS',
	Linux = 'Linux',
	MacOs = 'macOS',
	Windows = 'Windows'
}

export function getAppPlatform() {
	switch (process.platform) {
		case 'linux':
			return AppPlatform.Linux;
		case 'win32':
			return AppPlatform.Windows;
	}
	throw new Error('Unexpected value for process.platform: ' + process.platform);
}