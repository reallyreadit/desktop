import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { DisplayPreference } from './models/DisplayPreference';

const fileNames = {
	displayPreference: 'displayPreference.json'
};

function getFilePath(fileName: string) {
	return path.join(
		getUserDataDirectory(),
		fileName
	);
}
async function getFileContents(fileName: string) {
	return await fs.readFile(
		getFilePath(fileName),
		{
			encoding: 'utf8'
		}
	);
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
		try {
			return JSON.parse(
				await getFileContents(fileNames.displayPreference)
			) as DisplayPreference;
		} catch (ex) {
			return null;
		}
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
	}
};