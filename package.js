const packager = require('electron-packager');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const out = 'pub';

const argv = yargs(
		hideBin(process.argv)
	)
	.option(
		'config',
		{
			alias: 'c',
			choices: [
				'dev',
				'prod'
			],
			description: 'The type of configuration to include with the packaged app.',
			requiresArg: true
		}
	)
	.demandOption('config')
	.help()
	.argv;

console.log('Cleaning output directory...');
fs.rmSync(
	out,
	{
		force: true,
		recursive: true
	}
);

console.log('Starting electron-packager...');
packager({
	afterCopy: [
		(buildPath, electronVersion, platform, arch, callback) => {
			console.log('Writing configuration file...');
			const appConfig = JSON.parse(
				fs.readFileSync(
					`config.${argv.config}.json`,
					{
						encoding: 'utf8'
					}
				)
			);
			appConfig['type'] = argv.config;
			fs.writeFileSync(
				path.join(buildPath, 'config.json'),
				JSON.stringify(appConfig)
			);
			callback();
		}
	],
	dir: '.',
	icon: 'content/Readup.ico',
	ignore: [
		/^\/\./,
		/^\/src/,
		/^\/package\.js$/,
		/^\/config\.[^.]+\.json/,
		/^\/tsconfig\.json/
	],
	out
});