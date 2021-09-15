const fs = require('fs');

module.exports = {
	getConfig: (configType) => {
		let appConfig = JSON.parse(
			fs.readFileSync(
				`config.${configType}.json`,
				{
					encoding: 'utf8'
				}
			)
		);
		appConfig.type = configType;
		return appConfig;
	}
};