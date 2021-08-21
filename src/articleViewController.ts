import { app, BrowserView, BrowserWindow, shell } from 'electron';
import { fetchArticle } from './articleProcessing';
import { ArticleReference, isArticleUrlReference } from './models/ArticleReference';
import { ArticleUpdatedEvent } from './models/ArticleUpdatedEvent';
import { AuthServiceAccountAssociation } from './models/AuthServiceAccountAssociation';
import { CommentAddendumForm, CommentCreationResponse, CommentDeletionForm, CommentForm, CommentRevisionForm, CommentThread } from './models/CommentThread';
import { areEqual, DisplayPreference } from './models/DisplayPreference';
import { createCommentThread, Post, PostForm } from './models/Post';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { Article, ArticleStarredEvent, StarArticleRequest } from './models/Article';
import { MessagingContext } from './messagingContext';
import { userData } from './userData';
import { apiServer } from './apiServer';
import { ArticleLookupResult } from './models/ArticleLookupResult';
import { PageParseResult } from './models/PageParseResult';
import { CommitReadStateEvent } from './models/CommitReadStateEvent';
import { ReadStateCommitData } from './models/ReadStateCommitData';
import { createWebViewFailureResult, createWebViewSuccessResult } from './models/WebViewResult';
import { isProblemDetails } from './models/ProblemDetails';
import { ReadingErrorType } from './models/Errors';
import { TwitterCredentialLinkForm, TwitterRequestToken } from './models/TwitterAuthentication';
import { presentExternalUrlSession } from './externalUrlSession';
import { ArticleIssueReportRequest } from './models/ArticleIssueReportRequest';
import { WebAuthRequest } from './models/WebAuth';
import { presentOauthAuthSession } from './authentication/oauthAuthSession';

export interface ArticleViewControllerParams {
	onArticlePosted: (post: Post) => void,
	onArticleStarred: (event: ArticleStarredEvent) => void,
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
					case 'changeDisplayPreference':
						const preference = message.data as DisplayPreference;
						await userData.setDisplayPreference(preference);
						this._params.onDisplayPreferenceChanged(preference);
						apiServer
							.postJson<DisplayPreference, DisplayPreference>('/UserAccounts/DisplayPreference', preference)
							.then(sendResponse);
						break;
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
							)
							.catch(
								reason => {
									if (
										isProblemDetails(reason) &&
										reason.type === ReadingErrorType.SubscriptionRequired
									) {
										sendResponse(
											createWebViewFailureResult(reason)
										)
									}
								}
							);
						break;
					case 'deleteComment':
						apiServer
							.postJson<CommentDeletionForm, CommentThread>('/Social/CommentDeletion', message.data as CommentDeletionForm)
							.then(
								comment => {
									this._params.onCommentUpdated(comment);
									sendResponse(comment);
								}
							);
						break;
					case 'getComments':
						apiServer
								.getJson<CommentThread[]>(
									'/Social/Comments',
									{
										slug: message.data as string
									}
								)
								.then(sendResponse);
						break;
					case 'getDisplayPreference':
						const storedPreference = await userData.getDisplayPreference();
						sendResponse(storedPreference);
						apiServer
							.getJson<DisplayPreference | null>('/UserAccounts/DisplayPreference')
							.then(
								async preference => {
									if (
										!preference ||
										(
											storedPreference &&
											areEqual(storedPreference, preference)
										)
									) {
										return;
									}
									await userData.setDisplayPreference(preference);
									this._messagingContext?.sendMessage({
										type: 'displayPreferenceChanged',
										data: preference
									});
									this._params.onDisplayPreferenceChanged(preference);
								}
							);
						break;
					case 'navBack':
						this._params.onClose();
						break;
					case 'navTo':
						this._params.onNavTo(
							new URL(message.data as string)
						);
						break;
					case 'linkTwitterAccount':
						apiServer
							.postJson<TwitterCredentialLinkForm, AuthServiceAccountAssociation>('/Auth/TwitterLink', message.data as TwitterCredentialLinkForm)
							.then(
								association => {
									this._params.onAuthServiceAccountLinked(association);
									sendResponse(association);
								}
							)
						break;
					case 'openExternalUrl':
					case 'openExternalUrlUsingSystem':
						shell.openExternal(message.data as string);
						break;
					case 'openExternalUrlWithCompletionHandler':
						presentExternalUrlSession(message.data as string)
							.then(sendResponse);
						break;
					case 'openSubscriptionPrompt':
						this._params.onOpenSubscriptionPrompt();
						break;
					case 'parseResult':
						apiServer
							.postJson<PageParseResult, ArticleLookupResult>('/Extension/GetUserArticle', message.data)
							.then(sendResponse);
						break;
					case 'postArticle':
						apiServer
							.postJson<PostForm, Post>('/Social/Post', message.data as PostForm)
							.then(
								post => {
									this._params.onArticlePosted(post);
									this._params.onArticleUpdated({
										article: post.article,
										isCompletionCommit: false
									});
									if (post.comment) {
										this._params.onCommentPosted(
											createCommentThread(post)
										);
									}
									sendResponse(post);
								}
							);
						break;
					case 'postComment':
						apiServer
							.postJson<CommentForm, CommentCreationResponse>('/Social/Comment', message.data as CommentForm)
							.then(
								response => {
									this._params.onArticleUpdated({
										article: response.article,
										isCompletionCommit: false
									});
									this._params.onCommentPosted(response.comment);
									sendResponse(response);
								}
							);
						break;
					case 'postCommentAddendum':
						apiServer
							.postJson<CommentAddendumForm, CommentThread>('/Social/CommentAddendum', message.data as CommentAddendumForm)
							.then(
								comment => {
									this._params.onCommentUpdated(comment);
									sendResponse(comment);
								}
							)
						break;
					case 'postCommentRevision':
						apiServer
							.postJson<CommentRevisionForm, CommentThread>('/Social/CommentRevision', message.data as CommentRevisionForm)
							.then(
								comment => {
									this._params.onCommentUpdated(comment);
									sendResponse(comment);
								}
							)
						break;
					case 'readArticle':
						await this.replaceArticle({
							slug: message.data as string
						});
						break;
					case 'reportArticleIssue':
						apiServer.post<ArticleIssueReportRequest>('/Analytics/ArticleIssueReport', message.data as ArticleIssueReportRequest);
						break;
					case 'requestTwitterWebViewRequestToken':
						apiServer
							.postJson<undefined, TwitterRequestToken>('/Auth/TwitterWebViewRequest')
							.then(sendResponse);
						break;
					case 'requestWebAuthentication':
						const request = message.data as WebAuthRequest;
						presentOauthAuthSession(request)
							.then(sendResponse);
						break;
					case 'starArticle':
						apiServer
							.postJson<StarArticleRequest, Article>('/Articles/Star', message.data as StarArticleRequest)
							.then(
								article => {
									this._params.onArticleUpdated({
										article,
										isCompletionCommit: false
									});
									this._params.onArticleStarred({
										article
									});
									sendResponse(article);
								}
							);
						break;
				}
			}
		});
	}
	private async loadArticle(reference: ArticleReference) {
		let url: URL;
		if (
			isArticleUrlReference(reference)
		) {
			url = new URL(reference.url);
		} else {
			const article = await apiServer.getJson<Article>(
				'/Articles/Details',
				{
					slug: reference.slug
				}
			);
			url = new URL(article.url);
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
	public async attach(window: BrowserWindow) {
		// Set up the messaging context.
		this.createMessagingContext();
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
	public async replaceArticle(reference: ArticleReference) {
		await this.loadArticle(reference);
	}
}