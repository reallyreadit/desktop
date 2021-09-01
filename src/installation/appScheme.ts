import { registry } from './registry';

const readupClassKey = 'HKEY_CURRENT_USER\\SOFTWARE\\Classes\\Readup';

export const appScheme = {
	register: () => Promise.all([
		registry.add(
			readupClassKey,
			{
				value: 'URL:readup'
			}
		),
		registry.add(
			readupClassKey,
			{
				name: 'URL Protocol'
			}
		),
		registry.add(
			`${readupClassKey}\\shell\\open\\command`,
			{
				value: `"${process.execPath}" "%1"`
			}
		)
	]),
	unregister: () => registry.delete(readupClassKey)
};