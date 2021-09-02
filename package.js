const packager = require('electron-packager');
const fs = require('fs');
const fsPromise = require('fs/promises');
const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const winstaller = require('electron-winstaller');
const webpack = require('webpack');

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

function createWebpackBuild(config) {
	return new Promise(
		(resolve, reject) => {
			webpack(
				config,
				(err, stats) => {
					if (err) {
						reject(err);
					} else {
						console.log(
							stats.toString({
								chunks: false,
								colors: true
							})
						);
						resolve();
					}
				}
			);
		}
	);
};

function build() {
	console.log('Building...');
	const commonConfig = {
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: 'ts-loader',
					exclude: /node_modules/,
				},
			],
		},
		resolve: {
			extensions: ['.tsx', '.ts', '.js'],
		},
		mode: 'production'
	};
	return Promise.all([
		createWebpackBuild({
			...commonConfig,
			entry: './src/main.ts',
			output: {
				filename: 'main.js',
				path: path.resolve(__dirname, 'bin')
			},
			target: 'electron-main'
		}),
		createWebpackBuild({
			...commonConfig,
			entry: './src/preloadScripts/articlePreloadScript.ts',
			output: {
				filename: 'articlePreloadScript.js',
				path: path.resolve(__dirname, 'bin/preloadScripts')
			},
			target: 'electron-preload'
		}),
		createWebpackBuild({
			...commonConfig,
			entry: './src/preloadScripts/webAppPreloadScript.ts',
			output: {
				filename: 'webAppPreloadScript.js',
				path: path.resolve(__dirname, 'bin/preloadScripts')
			},
			target: 'electron-preload'
		})
	]);
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