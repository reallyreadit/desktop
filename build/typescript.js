const { buildOut } = require('./constants');
const path = require('path');
const webpack = require('webpack');

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

module.exports = {
	build: () => {
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
					path: path.resolve(
						__dirname,
						path.join('..', buildOut)
					)
				},
				target: 'electron-main'
			}),
			createWebpackBuild({
				...commonConfig,
				entry: './src/preloadScripts/articlePreloadScript.ts',
				output: {
					filename: 'articlePreloadScript.js',
					path: path.resolve(
						__dirname,
						path.join('..', buildOut, 'preloadScripts')
					)
				},
				target: 'electron-preload'
			}),
			createWebpackBuild({
				...commonConfig,
				entry: './src/preloadScripts/webAppPreloadScript.ts',
				output: {
					filename: 'webAppPreloadScript.js',
					path: path.resolve(
						__dirname,
						path.join('..', buildOut, 'preloadScripts')
					)
				},
				target: 'electron-preload'
			})
		]);
	}
};