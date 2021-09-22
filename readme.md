# Desktop App
The Readup desktop client for Windows and Linux.
## Running

    npm start
## Publishing
The Browser Extension App executable is bundled during publishing. See that repo for details: https://github.com/reallyreadit/browser-extension-app

Production build command for Windows:

    node publish.js --cert bef7b5dae0ed1352bfe23d4cfe30089f0f512a30 --config prod --extension-app C:\Users\jeff\repos\reallyreadit\browser-extension-app\bin\Release\netcoreapp3.1\win-x64\publish\BrowserExtensionApp.exe --platform win32

Production build command for Linux:

    node publish.js --config prod --extension-app /home/jeff/repos/reallyreadit/browser-extension-app/bin/Release/netcoreapp3.1/linux-x64/publish/BrowserExtensionApp --platform linux