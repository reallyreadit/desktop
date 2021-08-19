import { Article } from './Article';

export interface ArticleUpdatedEvent {
	article: Article,
	isCompletionCommit: boolean
}