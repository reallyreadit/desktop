export enum AppPlatform {
	Android = 'Android',
	Ios = 'iOS',
	Linux = 'Linux',
	MacOs = 'macOS',
	Windows = 'Windows'
}

export function getAppPlatform() {
	return AppPlatform.Windows;
}