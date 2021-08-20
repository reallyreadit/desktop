export interface WebAuthRequest {
	authUrl: string,
	callbackScheme: string
}
export type WebAuthResponse = {
	callbackURL: string
} | {
	error: string
};