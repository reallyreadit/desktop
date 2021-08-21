import { app } from 'electron';
import { WebAppViewController } from './webAppViewController';

if (
	app.requestSingleInstanceLock()
) {
	let webAppViewController: WebAppViewController | undefined;
	app
		.whenReady()
		.then(
			async () => {
				const urlArg = findReadupUrlArg(process.argv);
				webAppViewController = new WebAppViewController();
				if (
					urlArg?.searchParams.has('url')
				) {
					webAppViewController.readArticle({
						url: urlArg.searchParams.get('url')!
					});
				}
			}
		);
	app
		.on(
			'second-instance',
			(_, argv) => {
				const urlArg = findReadupUrlArg(argv);
				if (
					webAppViewController &&
					urlArg?.searchParams.has('url')
				) {
					webAppViewController.readArticle({
						url: urlArg.searchParams.get('url')!
					});
					if (
						webAppViewController.window.isMinimized()
					) {
						webAppViewController.window.restore();
					}
					webAppViewController.window.focus();
				}
			}
		)
		.on(
			'window-all-closed',
			() => {
				app.quit();
			}
		);
} else {
	app.quit();
}

function findReadupUrlArg(argv: string[]) {
	const arg = argv.find(
		arg => arg.startsWith('readup://')
	);
	if (arg) {
		return new URL(arg);
	}
}