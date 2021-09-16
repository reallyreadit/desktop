export enum DisplayTheme {
	Light = 1,
	Dark = 2
}
export interface DisplayPreference {
	hideLinks: boolean,
	textSize: number,
	theme: DisplayTheme
}
export function areEqual(a: DisplayPreference, b: DisplayPreference) {
	return (
		a.hideLinks === b.hideLinks &&
		a.textSize === b.textSize &&
		a.theme === b.theme
	);
}
export function getDisplayTheme(preference: DisplayPreference | null) {
	return preference?.theme ?? DisplayTheme.Light;
}