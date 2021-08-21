export enum AppleClient {
	Ios = 0,
	Web = 1
}
export interface AppleIdCredential {
	authorizationCode: string | null,
	email: string | null,
	identityToken: string | null,
	realUserStatus: 'likelyReal' | 'unknown' | 'unsupported',
	user: string,
	client?: AppleClient
}