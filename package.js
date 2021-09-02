const packager = require('electron-packager');
const fs = require('fs');
const fsPromise = require('fs/promises');
const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const winstaller = require('electron-winstaller');

// Constants.
const
	buildOut = 'bin',
	packageOut = 'pub',
	installerOut = 'pkg';

// Command line arguments.
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

try {
	fs.accessSync(argv['extension-app']);
} catch {
	console.error(`Error accessing extension application: ${argv['extension-app']}`);
	return;
}

// Configuration.
let appConfig;
try {
	const configFilePath = `config.${argv.config}.json`;
	appConfig = JSON.parse(
		fs.readFileSync(
			configFilePath,
			{
				encoding: 'utf8'
			}
		)
	);
	appConfig.type = argv.config;
} catch {
	console.error(`Error reading config file: ${configFilePath}`);
	return;
}

function clean(directory) {
	console.log(`Cleaning ${directory} directory...`);
	return fsPromise.rm(
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
			(buildPath, electronVersion, platform, arch, callback) => {
				console.log('Writing configuration file...');
				fs.writeFileSync(
					path.join(buildPath, 'config.json'),
					JSON.stringify(appConfig)
				);
				console.log('Copying browser extension application executable...');
				fs.copyFileSync(
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
		remoteReleases: appConfig.autoUpdateFeedUrl,
		setupIcon: path.resolve('content/windows/Readup.ico')
	});
}

clean(buildOut)
	.then(build)
	.then(
		clean(packageOut)
	)
	.then(package)
	.then(
		clean(installerOut)
	)
	.then(createInstaller);