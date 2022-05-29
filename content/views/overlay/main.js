// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

// Enable local debugging.
if (!window.__mainProcess) {
	__mainProcess = {
		addMessageListener: listener => {
			__mainProcess.messageListeners.push(listener);
		},
		messageListeners: [],
		sendMessage: message => {
			console.log('send ipc message:');
			console.log(message);
		}
	};
}

const
	loadingSpinner = document.getElementById('loading-spinner'),
	errorForm = document.getElementById('error-form'),
	errorFormMessageContainer = errorForm.querySelector('.message'),
	errorFormIdInput = errorForm.querySelector('input[name="id"]'),
	errorFormSubmitButton = errorForm.querySelector('button[type="submit"]'),
	transitionOverlay = document.getElementById('transition-overlay');

errorFormSubmitButton.addEventListener(
	'click',
	event => {
		event.preventDefault();
		__mainProcess.sendMessage({
			type: 'errorButtonClick',
			data: {
				id: errorFormIdInput.value
			}
		});
	}
);

transitionOverlay.addEventListener(
	'animationend',
	event => {
		let messageType;
		switch (event.animationName) {
			case 'transition-overlay-fade-out':
				messageType = 'fadeOutComplete';
				break;
			case 'transition-overlay-fade-in':
				messageType = 'fadeInComplete';
				transitionOverlay.classList.remove('fade-in');
				break;
		}
		if (messageType) {
			__mainProcess.sendMessage({
				type: messageType
			});
		}
	}
);

const themeMap = {
	'1': 'Light',
	'2': 'Dark'
};

function setDisplayTheme(theme) {
	document.documentElement.dataset['theme'] = themeMap[theme];
}

function setState(state) {
	document.documentElement.dataset['state'] = state.type;
	switch (state.type) {
		case 'None':
			loadingSpinner.style.display = 'none';
			errorForm.style.display = 'none';
			break;
		case 'Loading':
			loadingSpinner.style.display = '';
			errorForm.style.display = 'none';
			break;
		case 'Error':
			while (errorFormMessageContainer.children.length) {
				errorFormMessageContainer.lastElementChild.remove();
			}
			for (const line of state.message) {
				const lineElement = document.createElement('p');
				lineElement.textContent = line;
				errorFormMessageContainer.appendChild(lineElement);
			}
			errorFormIdInput.value = state.id;
			errorFormSubmitButton.textContent = state.buttonText;
			loadingSpinner.style.display = 'none';
			errorForm.style.display = '';
			break;
	}
}

// Initial setup.
const currentUrl = new URL(window.location.href);
setDisplayTheme(
	currentUrl.searchParams.get('theme')
);
setState(
	JSON.parse(
		currentUrl.searchParams.get('state')
	)
);

// Listen for messages.
__mainProcess.addMessageListener(
	(event, message) => {
		switch (message.type) {
			case 'fadeIn':
				transitionOverlay.classList.replace('fade-out', 'fade-in');
				break;
			case 'fadeOut':
				transitionOverlay.classList.add('fade-out');
				break;
			case 'setDisplayTheme':
				setDisplayTheme(message.data);
				break;
			case 'setState':
				setState(message.data);
				break;
		}
	}
);