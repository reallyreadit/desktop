import { app, BrowserView, BrowserWindow } from 'electron';
import { fetchArticle } from './articleProcessing';
import { ArticleReference, isArticleUrlReference } from './models/ArticleReference';
import { ArticleUpdatedEvent } from './models/ArticleUpdatedEvent';
import { AuthServiceAccountAssociation } from './models/AuthServiceAccountAssociation';
import { CommentThread } from './models/CommentThread';
import { DisplayPreference } from './models/DisplayPreference';
import { Post } from './models/Post';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { Article } from './models/Article';
import { MessagingContext } from './messagingContext';
import { userData } from './userData';
import { apiServer } from './apiServer';
import { ArticleLookupResult } from './models/ArticleLookupResult';
import { PageParseResult } from './models/PageParseResult';
import { CommitReadStateEvent } from './models/CommitReadStateEvent';
import { ReadStateCommitData } from './models/ReadStateCommitData';
import { createWebViewSuccessResult } from './models/WebViewResult';

export interface ArticleViewControllerParams {
	onArticlePosted: (post: Post) => void,
	onArticleUpdated: (event: ArticleUpdatedEvent) => void,
	onAuthServiceAccountLinked: (association: AuthServiceAccountAssociation) => void,
	onClose: () => void,
	onCommentPosted: (comment: CommentThread) => void,
	onCommentUpdated: (comment: CommentThread) => void,
	onDisplayPreferenceChanged: (preference: DisplayPreference) => void,
	onNavTo: (url: URL) => void,
	onOpenSubscriptionPrompt: () => void
}

export class ArticleViewController {
	private _messagingContext: MessagingContext | undefined;
	private readonly _params: ArticleViewControllerParams;
	private readonly _view = new BrowserView({
		webPreferences: {
			preload: path.resolve(
				app.getAppPath(),
				'bin/preloadScripts/articlePreloadScript.js'
			)
		}
	});
	constructor(params: ArticleViewControllerParams) {
		this._params = params;
	}
	private createMessagingContext() {
		if (this._messagingContext) {
			throw new Error('Messaging context already created.');
		}
		this._messagingContext = new MessagingContext({
			executeJavaScript: code => {
				this._view.webContents.executeJavaScript(code);
			},
			ipcChannel: 'article',
			javascriptListenerObject: 'window.reallyreadit.nativeClient.reader',
			onMessage: async (message, sendResponse) => {
				switch (message.type) {
					case 'commitReadState':
						const event = message.data as CommitReadStateEvent;
						apiServer
							.postJson<ReadStateCommitData, Article>('/Extension/CommitReadState', event.commitData)
							.then(
								article => {
									this._params.onArticleUpdated({
										article,
										isCompletionCommit: event.isCompletionCommit
									});
									sendResponse(
										createWebViewSuccessResult(article)
									);
								}
							);
						break;
					case 'getDisplayPreference':
						sendResponse(
							await userData.getDisplayPreference()
						);
						break;
					case 'navBack':
						this._params.onClose();
						break;
					case 'parseResult':
						apiServer
							.postJson<PageParseResult, ArticleLookupResult>('/Extension/GetUserArticle', message.data)
							.then(sendResponse);
						break;
				}
			}
		});
	}
	private async loadArticle(slug: string): Promise<void>;
	private async loadArticle(url: URL): Promise<void>;
	private async loadArticle(arg0: string | URL) {
		let url: URL;
		if (typeof arg0 === 'string') {
			const article = await apiServer.getJson<Article>(
				'/Articles/Details',
				{
					slug: arg0
				}
			);
			url = new URL(article.url);
		} else {
			url = arg0;
		}
		const html = await fetchArticle(url);
		const articleUrlHash = crypto
			.createHash('md5')
			.update(url.href)
			.digest('hex');
		const tempFilePath = path.join(
			app.getPath('temp'),
			`com.readup.article_${articleUrlHash}.html`
		);
		await fs.writeFile(tempFilePath, html);
		await this._view.webContents.loadFile(
			tempFilePath,
			{
				query: {
					url: url.href
				}
			}
		);
		await this._view.webContents.executeJavaScript(
			await fs.readFile(
				path.resolve(
					app.getAppPath(),
					'content/reader-12.2.1.js'
				),
				{
					encoding: 'utf8'
				}
			)
		);
		await fs.unlink(tempFilePath);
	}
	public attach(window: BrowserWindow, articleReference: ArticleReference) {
		// Set up the messaging context.
		this.createMessagingContext();
		// Load the article.
		if (
			isArticleUrlReference(articleReference)
		) {
			this.loadArticle(
				new URL(articleReference.url)
			);
		} else {
			this.loadArticle(articleReference.slug);
		}
		// Attach to the window.
		const windowBounds = window.getContentBounds();
		window.addBrowserView(this._view);
		this._view.setBounds({
			x: 0,
			y: 0,
			width: windowBounds.width,
			height: windowBounds.height
		});
		this._view.setAutoResize({
			height: true,
			width: true
		});
		window.setTopBrowserView(this._view);
	}
	public detach(window: BrowserWindow) {
		// Dispose of the messaging context.
		this._messagingContext?.dispose();
		// Detach from the window.
		window.removeBrowserView(this._view);
	}
}