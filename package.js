const packager = require('electron-packager');
const childProcess = require('child_process');
const fs = require('fs/promises');
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

function cleanBuildDir() {
	console.log('Cleaning build directory...');
	return fs.rm(
		'bin',
		{
			force: true,
			recursive: true
		}
	);
}

function build() {
	console.log('Building...');
	 return new Promise(
		resolve => {
			childProcess
				.spawn(
					'npm run build',
					{
						shell: true,
						stdio: 'inherit'
					}
				)
				.on('exit', resolve)
		}
	);
}

function cleanPackageDir() {
	console.log('Cleaning package directory...');
	return fs.rm(
		out,
		{
			force: true,
			recursive: true
		}
	);
}

function package() {
	console.log('Starting electron-packager...');
	return packager({
		afterCopy: [
			async (buildPath, electronVersion, platform, arch, callback) => {
				console.log('Writing configuration file...');
				const appConfig = JSON.parse(
					await fs.readFile(
						`config.${argv.config}.json`,
						{
							encoding: 'utf8'
						}
					)
				);
				appConfig['type'] = argv.config;
				await fs.writeFile(
					path.join(buildPath, 'config.json'),
					JSON.stringify(appConfig)
				);
				callback();
			}
		],
		dir: '.',
		icon: 'content/windows/Readup.ico',
		ignore: [
			/^\/\./,
			/^\/src/,
			/^\/package\.js$/,
			/^\/config\.[^.]+\.json/,
			/^\/tsconfig\.json/
		],
		out
	});
}

cleanBuildDir()
	.then(build)
	.then(cleanPackageDir)
	.then(package);