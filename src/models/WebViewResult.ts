export enum WebViewResultType {
	Success = 1,
	Failure = 2
}
export function createWebViewSuccessResult<T>(value: T) {
	return {
		type: WebViewResultType.Success,
		value
	};
}
export function createWebViewFailureResult<T>(error: T) {
	return {
		type: WebViewResultType.Failure,
		error
	};
}