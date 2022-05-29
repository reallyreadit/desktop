// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { DisplayPreference } from './models/DisplayPreference';
import { ScriptUpdateRecord } from './readerScript';

enum UserDataType {
	DisplayPreference = 'displayPreference',
	ReaderScriptUpdateRecord = 'readerScriptUpdateRecord'
}

type UserDataMap<T extends UserDataType> =
	T extends UserDataType.DisplayPreference ? DisplayPreference | null :
	T extends UserDataType.ReaderScriptUpdateRecord ? ScriptUpdateRecord | null :
	never;

interface UserData<T extends UserDataType> {
	fileName: string,
	data: UserDataMap<T>,
	hasLoaded: boolean
}

const cache: {
	[Key in UserDataType]: UserData<Key>
} = {
	[UserDataType.DisplayPreference]: {
		fileName: 'displayPreference.json',
		data: null,
		hasLoaded: false
	},
	[UserDataType.ReaderScriptUpdateRecord]: {
		fileName: 'readerScriptUpdateRecord.json',
		data: null,
		hasLoaded: false
	}
};

async function getData<T extends UserDataType>(type: T): Promise<UserDataMap<T>> {
	const entry = cache[type];
	if (entry.hasLoaded) {
		return entry.data as UserDataMap<T>;
	}
	try {
		console.log('[user-data] reading data for type: ' + type);
		entry.data = JSON.parse(
			await fs.readFile(
				getFilePath(entry.fileName),
				{
					encoding: 'utf8'
				}
			)
		);
		entry.hasLoaded = true;
		return entry.data as UserDataMap<T>;
	} catch (ex) {
		return null as UserDataMap<T>;
	}
}
function getFilePath(fileName: string) {
	return path.join(
		getUserDataDirectory(),
		fileName
	);
}
async function setData<T extends UserDataType>(type: T, data: UserDataMap<T>) {
	console.log('[user-data] writing data for type: ' + type);
	const entry = cache[type];
	entry.data = data;
	entry.hasLoaded = true;
	await fs.writeFile(
		getFilePath(entry.fileName),
		JSON.stringify(data)
	);
}
function getUserDataDirectory( ){
	return path.join(
		app.getPath('userData'),
		'com.readup/userData/v1'
	);
}

export const userData = {
	getDisplayPreference: async () => {
		return await getData(UserDataType.DisplayPreference);
	},
	getReaderScriptUpdateRecord: async () => {
		return await getData(UserDataType.ReaderScriptUpdateRecord);
	},
	initializeDirectories: async () => {
		console.log('[user-data] initializing directories');
		return fs.mkdir(
			getUserDataDirectory(),
			{
				recursive: true
			}
		);
	},
	setDisplayPreference: async (preference: DisplayPreference) => {
		await setData(UserDataType.DisplayPreference, preference);
	},
	setReaderScriptUpdateRecord: async (record: ScriptUpdateRecord) => {
		await setData(UserDataType.ReaderScriptUpdateRecord, record);
	}
};