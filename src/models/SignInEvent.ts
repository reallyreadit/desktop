import { NotificationAuthorizationStatus } from './NotificationAuthorizationStatus';
import { UserAccount } from './UserAccount';

export enum SignInEventType {
	NewUser = 1,
	ExistingUser = 2
}

export interface SignInEvent {
	user: UserAccount,
	eventType: SignInEventType
}

export interface SignInEventResponse {
	notificationAuthorizationStatus: NotificationAuthorizationStatus
}