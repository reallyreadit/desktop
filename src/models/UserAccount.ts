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