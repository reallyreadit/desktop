import { app, BrowserView, shell } from 'electron';
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
import { readerScript } from './readerScript';
import { OverlayState, OverlayStateType } from './overlayViewController';

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
	onOpenSubscriptionPrompt: () => void,
	onOverlayStateChanged: () => void
}

export class ArticleViewController {
	private readonly _messagingContext = new MessagingContext({
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
					console.log('[article] did-finish-load');
					this.setOverlayState({
						type: OverlayStateType.None
					});
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
					await this.loadArticle({
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
	private _overlayState: OverlayState = {
		type: OverlayStateType.Loading
	};
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
		this._view.webContents
			.on(
				'did-fail-load',
				() => {
					console.log('[article] did-fail-load');
					this.setOverlayState({
						type: OverlayStateType.Error,
						id: 'article',
						message: [
							'Check your internet connection and try again.',
							'Please contact support@readup.com if this problem persists.'
						],
						buttonText: 'Go Back'
					});
				}
			);
	}
	private setOverlayState(state: OverlayState) {
		this._overlayState = state;
		this._params.onOverlayStateChanged();
	}
	public dispose() {
		this._messagingContext.dispose();
	}
	public async loadArticle(reference: ArticleReference) {
		console.log('[article] did-start-loading');
		this.setOverlayState({
			type: OverlayStateType.Loading
		});
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
			await readerScript.getLatestScript()
		);
		await fs.unlink(tempFilePath);
	}
	public get overlayState() {
		return this._overlayState;
	}
	public get view() {
		return this._view;
	}
}