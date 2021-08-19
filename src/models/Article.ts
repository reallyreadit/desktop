export enum ArticleFlair {
	Paywall
};
export interface ArticleAuthor {
	name: string,
	slug: string
}
export interface Article {
	id: number,
	title: string,
	slug: string,
	source: string,
	datePublished: string | null,
	section: string,
	description: string,
	aotdTimestamp: string | null,
	url: string,
	articleAuthors: ArticleAuthor[],
	tags: string[],
	wordCount: number,
	commentCount: number,
	readCount: number,
	averageRatingScore: number | null,
	dateCreated: string | null,
	percentComplete: number,
	isRead: boolean,
	dateStarred: string | null,
	ratingScore: number | null,
	datesPosted: string[],
	hotScore: number,
	ratingCount: number,
	firstPoster: string | null,
	flair: ArticleFlair,
	aotdContenderRank: number,
	proofToken: string | null,
	imageUrl: string | null
}