# Desktop App
The Readup desktop client for Windows and Linux.
## Running

    npm start
## Updating Bundled Scripts
This repository includes the production build of the `nativeClient/reader` script from the `web` repository. Perform the following update procedure whenever a new version of the script is available:
1. Copy the production build of the latest `nativeClient/reader` script to `content/reader.js`.
2. Update the `readerScriptVersion` value in the `config.dev.json` and `config.prod.json` configuration files.
## Publishing
The Browser Extension App executable is bundled during publishing. See that repo for details: https://github.com/reallyreadit/browser-extension-app

Production build command for Windows:

    node publish.js --cert bef7b5dae0ed1352bfe23d4cfe30089f0f512a30 --config prod --extension-app C:\Users\jeff\repos\reallyreadit\browser-extension-app\bin\Release\netcoreapp3.1\win-x64\publish\BrowserExtensionApp.exe --platform win32

Production build command for Linux:

    node publish.js --config prod --extension-app /home/jeff/repos/reallyreadit/browser-extension-app/bin/Release/netcoreapp3.1/linux-x64/publish/BrowserExtensionApp --platform linux