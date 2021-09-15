const path = require('path');
const installer = require('electron-installer-debian');
const { packageOut, installerOut } = require('./constants');

module.exports = {
	createInstaller: () => {
		console.log('Starting electron-installer-debian...');
		return installer({
			src: path.join(packageOut, 'Readup-linux-x64'),
			dest: installerOut,
			arch: 'amd64',
			options: {
				name: 'readup',
				genericName: 'Reading App',
				description: 'Readup Desktop Client',
				productDescription: 'The world\'s best reading app.',
				section: 'web',
				bin: 'Readup',
				icon: {
					'16x16': 'content/images/icon-16.png',
					'32x32': 'content/images/icon-32.png',
					'48x48': 'content/images/icon-48.png',
					'64x64': 'content/images/icon-64.png',
					'128x128': 'content/images/icon-128.png',
					'256x256': 'content/images/icon-256.png',
					'scalable': 'content/images/icon.svg'
				},
				categories: [
					'Network'
				],
				mimeType: [
					'x-scheme-handler/readup'
				],
				scripts: {
					'postinst': 'content/linux/postinst.sh',
					'postrm': 'content/linux/postrm.sh'
				}
			}
		});
	}
};