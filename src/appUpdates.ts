import timer from 'timers';
import { app, autoUpdater, shell } from 'electron';
import { appConfig } from './appConfig';
import { UpdateAvailableEvent } from './models/UpdateAvailableEvent';
import { createUrl } from './routing/HttpEndpoint';
import got from 'got';
import SemanticVersion from './models/SemanticVersion';

type AppUpdateEventListener = (event: UpdateAvailableEvent) => void;

interface AppUpdates {
	addListener: (listener: AppUpdateEventListener) => void,
	installUpdate: () => void,
	startChecking: () => void
}

const pollingInterval = 1 * 60 * 60 * 1000;

export let appUpdates: AppUpdates;

// The built-in autoUpdater module only works on Windows. Use manual polling for Linux.
switch (process.platform) {
	case 'linux':
		const listeners: AppUpdateEventListener[] = [];
		appUpdates = {
			addListener: (listener: AppUpdateEventListener) => {
				listeners.push(listener);
			},
			installUpdate: () => {
				shell.openExternal(
					createUrl(appConfig.webServer, '/download')
						.toString()
				);
			},
			startChecking: () => {
				timer.setInterval(
					() => {
						console.log('[app-updates] checking for update');
						got
							.get(
								appConfig.autoUpdateFeedUrl + '/RELEASES'
							)
							.text()
							.then(
								text => {
									const newVersions = text
										.split('\n')
										.filter(
											line => SemanticVersion.regex.test(line)
										)
										.map(
											line => new SemanticVersion(line)
										)
										.filter(
											version => version.compareTo(appConfig.appVersion) > 0
										)
										.sort(
											(a, b) => a.compareTo(b)
										);
									if (newVersions.length) {
										console.log('[app-updates] new version available');
										listeners.forEach(
											listener => {
												listener({
													releaseName: newVersions[newVersions.length - 1].toString()
												});
											}
										);
									} else {
										console.log('[app-updates] no new version');
									}
								}
							)
							.catch(
								reason => {
									console.log('[app-updates] error checking for new version:');
									console.log(reason ?? 'No reason.');
								}
							);
					},
					pollingInterval
				);
			}
		};
		break;
	case 'win32':
		appUpdates = {
			addListener: (listener: AppUpdateEventListener) => {
				autoUpdater.on(
					'update-downloaded',
					(event, releaseNotes, releaseName, releaseDate, updateURL) => {
						listener({
							releaseName
						});
					}
				);
			},
			installUpdate: () => {
				autoUpdater.quitAndInstall();
			},
			startChecking: () => {
				if (!app.isPackaged) {
					return;
				}
				autoUpdater.setFeedURL({
					url: appConfig.autoUpdateFeedUrl
				});
				timer.setInterval(
					() => {
						autoUpdater.checkForUpdates();
					},
					pollingInterval
				);
			}
		};
		break;
	default:
		throw new Error('Unexpected value for process.platform.');
}