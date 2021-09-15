const fsPromise = require('fs/promises');

module.exports = {
	clean: (directory) => {
		console.log(`Cleaning ${directory} directory...`);
		return fsPromise.rm(
			directory,
			{
				force: true,
				recursive: true
			}
		);
	}
};