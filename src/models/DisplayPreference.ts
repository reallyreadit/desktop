// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

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