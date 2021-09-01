import { app } from 'electron';
import { createUrl, HttpEndpoint } from './routing/HttpEndpoint';
import fs from 'fs';
import path from 'path';
import SemanticVersion from './models/SemanticVersion';

type AppConfigType = 'dev' | 'prod';
export interface AppConfigExtensionIds {
	chrome: string,
	edge: string,
	firefox: string
}
export interface AppConfig {
	apiServer: HttpEndpoint,
	appVersion: SemanticVersion,
	authCookieDomain: string,
	authCookieName: string,
	extensionIds: AppConfigExtensionIds,
	readerScriptVersion: SemanticVersion,
	staticServer: HttpEndpoint,
	type: AppConfigType,
	webServer: HttpEndpoint
}
type SerializedAppConfig = Pick<AppConfig, Exclude<keyof AppConfig, 'readerScriptVersion' | 'type' | 'version'>> & {
	readerScriptVersion: string,
	type?: AppConfigType
}
interface PackageConfig {
	version: string
}

function readRootFile(fileName: string) {
	return fs.readFileSync(
		path.resolve(
			app.getAppPath(),
			fileName
		),
		{
			encoding: 'utf8'
		}
	);
}

/**
 * During the Electron packaging process one of the environment-specific configuration files
 * will be copied and renamed from config.{ENV}.json to config.json. We will first try to
 * load this configuration file and if it fails we can assume we're running in development
 * mode and should explicitly load the config.dev.json file.
 */
let
	serializedAppConfig: SerializedAppConfig,
	appConfigType: AppConfigType;
try {
	serializedAppConfig = JSON.parse(
		readRootFile('config.json')
	);
	appConfigType = serializedAppConfig.type!;
} catch {
	serializedAppConfig = JSON.parse(
		readRootFile('config.dev.json')
	);
	appConfigType = 'dev';
}

const packageConfig = JSON.parse(
	readRootFile('package.json')
) as PackageConfig;

export const appConfig = {
	...serializedAppConfig,
	readerScriptVersion: new SemanticVersion(serializedAppConfig.readerScriptVersion),
	type: appConfigType,
	appVersion: new SemanticVersion(packageConfig.version)
} as AppConfig;