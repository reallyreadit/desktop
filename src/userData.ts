import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { DisplayPreference } from './models/DisplayPreference';
import { ScriptUpdateRecord } from './readerScript';

const fileNames = {
	displayPreference: 'displayPreference.json',
	readerScriptUpdateRecord: 'readerScriptUpdateRecord.json'
};

function getFilePath(fileName: string) {
	return path.join(
		getUserDataDirectory(),
		fileName
	);
}
async function getFileData<T>(fileName: string) {
	try {
		return JSON.parse(
			await fs.readFile(
				getFilePath(fileName),
				{
					encoding: 'utf8'
				}
			)
		) as T;
	} catch (ex) {
		return null;
	}
}
async function setFileContents(fileName: string, contents: string) {
	await fs.writeFile(
		getFilePath(fileName),
		contents
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
		return await getFileData<DisplayPreference>(fileNames.displayPreference);
	},
	getReaderScriptUpdateRecord: async () => {
		return await getFileData<ScriptUpdateRecord>(fileNames.readerScriptUpdateRecord);
	},
	initializeDirectories: async () => {
		return fs.mkdir(
			getUserDataDirectory(),
			{
				recursive: true
			}
		);
	},
	setDisplayPreference: async (preference: DisplayPreference) => {
		await setFileContents(
			fileNames.displayPreference,
			JSON.stringify(preference)
		);
	},
	setReaderScriptUpdateRecord: async (record: ScriptUpdateRecord) => {
		await setFileContents(
			fileNames.readerScriptUpdateRecord,
			JSON.stringify(record)
		);
	}
};