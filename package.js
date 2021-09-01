const packager = require('electron-packager');
const childProcess = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const winstaller = require('electron-winstaller');

const
	buildOut = 'bin',
	packageOut = 'pub',
	installerOut = 'pkg';

const argv = yargs(
		hideBin(process.argv)
	)
	.option(
		'cert',
		{
			type: 'string',
			description: 'The path to the certificate that will be used to sign the setup executable.',
			requiresArg: true
		}
	)
	.option(
		'cert-pass',
		{
			type: 'string',
			description: 'The password for the signing certificate.',
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
	.demandOption('cert')
	.demandOption('cert-pass')
	.demandOption('config')
	.demandOption('extension-app')
	.help()
	.argv;

function clean(directory) {
	console.log(`Cleaning ${directory} directory...`);
	return fs.rm(
		directory,
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
				.on('exit', resolve);
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
				console.log('Copying browser extension application executable...');
				await fs.copyFile(
					argv['extension-app'],
					path.join(buildPath, 'content/windows/BrowserExtensionApp.exe')
				);
				callback();
			}
		],
		arch: [
			'x64'
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
		out: packageOut,
		platform: 'win32'
	});
}

function createInstaller() {
	console.log('Starting electron-winstaller...');
	return winstaller.createWindowsInstaller({
		appDirectory: path.join(packageOut, 'Readup-win32-x64'),
		certificateFile: argv['cert'],
		certificatePassword: argv['cert-pass'],
		exe: 'Readup.exe',
		iconUrl: 'https://static.dev.readup.com/app/images/favicon.ico',
		loadingGif: path.resolve('content/images/electron-installation-tile-500.gif'),
		name: 'Readup',
		noMsi: true,
		outputDirectory: installerOut,
		setupIcon: path.resolve('content/windows/Readup.ico')
	});
}

fs
	.access(argv['extension-app'])
	.then(
		clean(buildOut)
	)
	.then(build)
	.then(
		clean(packageOut)
	)
	.then(package)
	.then(
		clean(installerOut)
	)
	.then(createInstaller);