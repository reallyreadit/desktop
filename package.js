const fs = require('fs');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const { buildOut, packageOut } = require('./build/constants');
const { clean } = require('./build/clean');
const { build } = require('./build/typescript');
const { package } = require('./build/package');

// Command line arguments.
const argv = yargs(
		hideBin(process.argv)
	)
	.option(
		'config',
		{
			choices: [
				'dev',
				'prod'
			],
			description: 'The type of configuration to include with the packaged app.',
			requiresArg: true
		}
	)
	.option(
		'extension-app',
		{
			type: 'string',
			description: 'The path to the browser extension application single file executable to be included in the bundle.',
			requiresArg: true
		}
	)
	.option(
		'platform',
		{
			choices: [
				'linux',
				'win32'
			],
			description: 'The platform for which to package the app.',
			requiresArg: true
		}
	)
	.demandOption('config')
	.demandOption('extension-app')
	.demandOption('platform')
	.help()
	.argv;

try {
	fs.accessSync(argv['extension-app']);
} catch {
	console.error(`Error accessing extension application: ${argv['extension-app']}`);
	return;
}

clean(buildOut)
	.then(build)
	.then(
		() => clean(packageOut)
	)
	.then(
		() => package({
			configType: argv.config,
			extensionAppPath: argv['extension-app'],
			platform: argv.platform
		})
	);