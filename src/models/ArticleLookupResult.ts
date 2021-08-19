import { Article } from './Article';
import { UserAccount } from './UserAccount';
import { UserPage } from './UserPage';

export interface ArticleLookupResult {
	userArticle: Article,
	userPage: UserPage,
	user: UserAccount
}