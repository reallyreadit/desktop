const fs = require('fs');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const { buildOut, installerOut, packageOut } = require('./build/constants');
const { clean } = require('./build/clean');
const { build } = require('./build/typescript');
const { createInstaller: createWindowsInstaller } = require('./build/windows');
const { createInstaller: createLinuxInstaller } = require('./build/linux');
const { package } = require('./build/package');

// Command line arguments.
const argv = yargs(
		hideBin(process.argv)
	)
	.option(
		'cert',
		{
			type: 'string',
			description: 'The thumbprint of the certificate that will be used to sign the setup executable (--platform win32 only).',
			requiresArg: true
		}
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

if (argv.platform === 'win32' && !argv.cert) {
	console.error('Code signing argument --cert is required when --platform is win32');
	return;
}

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
	)
	.then(
		() => clean(installerOut)
	)
	.then(
		() => {
			switch (argv.platform) {
				case 'linux':
					return createLinuxInstaller();
				case 'win32':
					return createWindowsInstaller({
						certThumbprint: argv.cert,
						configType: argv.config
					});
			}
			throw new Error('Unexpected value for --platform argument.');
		}
	);