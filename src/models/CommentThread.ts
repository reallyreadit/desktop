// Copyright (C) 2022 reallyread.it, inc.
// 
// This file is part of Readup.
// 
// Readup is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License version 3 as published by the Free Software Foundation.
// 
// Readup is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
// 
// You should have received a copy of the GNU Affero General Public License version 3 along with Foobar. If not, see <https://www.gnu.org/licenses/>.

import { Article } from "./Article";

export interface CommentAddendum {
	dateCreated: string,
	textContent: string
}
export enum LeaderboardBadge {
	None = 0,
	LongestRead = 1 << 0,
	ReadCount = 1 << 1,
	Scout = 1 << 2,
	Scribe = 1 << 3,
	Streak = 1 << 4,
	WeeklyReadCount = 1 << 5
}
export interface CommentThread {
	id: string,
	dateCreated: string,
	text: string,
	addenda: CommentAddendum[],
	articleId: number,
	articleTitle: string,
	articleSlug: string,
	userAccount: string,
	badge: LeaderboardBadge,
	parentCommentId: string | null,
	dateDeleted: string | null,
	children: CommentThread[],
	isAuthor: boolean
}
export interface CommentForm {
	text: string,
	articleId: number,
	parentCommentId: string
}
export interface CommentCreationResponse {
	article: Article,
	comment: CommentThread
}
export interface CommentRevisionForm {
	commentId: string,
	text: string
}
export interface CommentAddendumForm {
	commentId: string,
	text: string
}
export interface CommentDeletionForm {
	commentId: string
}