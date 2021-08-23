import { AppPlatform } from './AppPlatform';

export interface DeviceInfo {
	appPlatform: AppPlatform,
	appVersion: string,
	installationId: string | null,
	name: string,
	token: string | null
}