// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import { registry } from './registry';

const readupClassKey = 'HKEY_CURRENT_USER\\SOFTWARE\\Classes\\Readup';

export const appScheme = {
	register: () => Promise.all([
		registry.add(
			readupClassKey,
			{
				value: 'URL:readup'
			}
		),
		registry.add(
			readupClassKey,
			{
				name: 'URL Protocol'
			}
		),
		registry.add(
			`${readupClassKey}\\shell\\open\\command`,
			{
				value: `"${process.execPath}" "%1"`
			}
		)
	]),
	unregister: () => registry.delete(readupClassKey)
};