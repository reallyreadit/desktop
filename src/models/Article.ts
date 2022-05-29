// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

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
export interface StarArticleRequest {
	articleId: number
}
export interface ArticleStarredEvent {
	article: Article
}