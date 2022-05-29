// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

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