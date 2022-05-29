// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

export enum UserAccountRole {
	Regular,
	Admin
}
export interface UserAccount {
	id: number,
	name: string,
	email: string,
	dateCreated: string,
	role: UserAccountRole,
	isEmailConfirmed: boolean,
	timeZoneId: number | null,
	aotdAlert: boolean,
	replyAlertCount: number,
	loopbackAlertCount: number,
	postAlertCount: number,
	followerAlertCount: number,
	isPasswordSet: boolean,
	hasLinkedTwitterAccount: boolean,
	dateOrientationCompleted: string | null
}