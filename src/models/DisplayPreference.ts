export enum DisplayTheme {
	Light = 1,
	Dark = 2
}
export interface DisplayPreference {
	hideLinks: boolean,
	textSize: number,
	theme: DisplayTheme
}