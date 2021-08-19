import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { DisplayPreference } from './models/DisplayPreference';

const fileNames = {
	displayPreference: 'displayPreference'
};

function getFilePath(fileName: string) {
	return path.join(
		app.getPath('userData'),
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
	setDisplayPreference: async (preference: DisplayPreference) => {
		await setFileContents(
			fileNames.displayPreference,
			JSON.stringify(preference)
		);
	}
};