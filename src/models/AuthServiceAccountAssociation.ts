import { AuthServiceProvider } from './AuthServiceProvider';

export interface AuthServiceAccountAssociation {
	dateAssociated: string,
	emailAddress: string,
	handle: string,
	identityId: number,
	provider: AuthServiceProvider
}