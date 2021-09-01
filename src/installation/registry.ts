import childProcess from 'child_process';

interface AddParams {
	name?: string,
	value?: string
}

function escapeDoubleQuotes(param: string) {
	return param.replace(/"/g, '\\"');
}
function executeCommand(command: string) {
	return new Promise<string>(
		(resolve, reject) => {
			childProcess.exec(
				command,
				{
					windowsHide: true
				},
				(error, stdout, stderr) => {
					if (error || stderr) {
						reject();
					}
					resolve(stdout);
				}
			);
		}
	);
}
function doubleQuoteIfRequired(param: string) {
	if (
		param.includes(' ')
	) {
		return '"' + param + '"';
	}
	return param;
}
function prepareParam(param: string) {
	return doubleQuoteIfRequired(
		escapeDoubleQuotes(param)
	);
}

export const registry = {
	add: (key: string, params: AddParams) => {
		let command = `reg add ${key}`;
		if (params.name) {
			command += ` /v ${prepareParam(params.name)}`;
		}
		command += ' /t REG_SZ';
		if (params.value) {
			command += ` /d ${prepareParam(params.value)}`;
		}
		command += ' /f';
		return executeCommand(command);
	},
	delete: (key: string) => {
		return executeCommand(`reg delete ${key} /f`);
	}
};