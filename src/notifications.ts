// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import { apiServer } from './apiServer';
import { UserAccount } from './models/UserAccount';
import { createQueryString } from './routing/queryString';
import { app, Notification as SystemNotification } from 'electron';
import timer from 'timers';
import path from 'path';
import { sharedCookieStore } from './sharedCookieStore';

interface DisplayedNotification {
	id: string,
	date: number,
	systemNotification: SystemNotification
}
interface ReadupNotification {
	id: string,
	title: string,
	message: string
}
interface NotificationsQueryResult {
	cleared: string[],
	created: ReadupNotification[],
	user: UserAccount
}
interface NotificationClickEvent {
	url: URL
}
type NotificationClickEventListener = (event: NotificationClickEvent) => void;
interface AlertStatusUpdatedEvent {
	user: UserAccount
}
type AlertStatusUpdatedEventListener = (event: AlertStatusUpdatedEvent) => void;

const
	displayedNotifications: DisplayedNotification[] = [],
	clickListeners: NotificationClickEventListener[] = [],
	alertStatusListeners: AlertStatusUpdatedEventListener[] = [];

function clearNotification(id: string) {
	const notification = displayedNotifications.find(
		notification => notification.id === id
	);
	if (notification) {
		notification.systemNotification.close();
		displayedNotifications.splice(
			displayedNotifications.indexOf(notification),
			1
		);
	}
}

async function check() {
	console.log('[notifications] checking notifications');
	if (
		!(await sharedCookieStore.isAuthenticated())
	) {
		return;
	}
	apiServer
		.getJson<NotificationsQueryResult>(
			'/Extension/Notifications' + createQueryString({
				ids: displayedNotifications.map(
					notification => notification.id
				)
			})
		)
		.then(
			result => {
				result.cleared.forEach(
					id => {
						console.log(`[notifications] clearing notification with id # ${id}`);
						clearNotification(id);
					}
				);
				result.created.forEach(
					notification => {
						console.log(`[notifications] creating notification with id # ${notification.id}`);
						const systemNotification = new SystemNotification({
							title: notification.title,
							body: notification.message,
							icon: path.resolve(
								app.getAppPath(),
								'content/images/icon-256.png'
							)
						});
						systemNotification.on(
							'click',
							() => {
								console.log(`[notifications] notification clicked with id # ${notification.id}`);
								// clear the notification
								clearNotification(notification.id);
								// process the view and load the url
								apiServer
									.get(
										'/Extension/Notification',
										{
											id: notification.id
										},
										{
											followRedirect: false
										}
									)
									.then(
										response => {
											const url = response.headers.location;
											if (!url) {
												return;
											}
											clickListeners.forEach(
												listener => {
													listener({
														url: new URL(url)
													});
												}
											)
										}
									)
									.catch(
										() => {
											console.log('[notifications] error viewing notification');
										}
									);
							}
						);
						systemNotification.show();
						displayedNotifications.push({
							id: notification.id,
							date: Date.now(),
							systemNotification
						});
					}
				);
				alertStatusListeners.forEach(
					listener => {
						listener({
							user: result.user
						});
					}
				);
			}
		)
		.catch(
			() => {
				console.log('[notifications] error checking notifications');
			}
		);
}

export const notifications = {
	addAlertStatusListener: (listener: AlertStatusUpdatedEventListener) => {
		alertStatusListeners.push(listener);
	},
	addClickEventListener: (listener: NotificationClickEventListener) => {
		clickListeners.push(listener);
	},
	startChecking: () => {
		timer.setInterval(check, 2.5 * 60 * 1000);
	}
};