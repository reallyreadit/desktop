import { Article } from "./Article";
import { CommentAddendum, CommentThread, LeaderboardBadge } from "./CommentThread";

export interface PostComment {
	id: string,
	text: string,
	addenda: CommentAddendum[]
}
export interface Post {
	date: string,
	userName: string,
	badge: LeaderboardBadge,
	article: Article,
	comment: PostComment | null,
	silentPostId: string | null,
	dateDeleted: string | null,
	hasAlert: boolean
}
export interface PostForm {
	articleId: number,
	ratingScore: number | null,
	commentText: string | null,
	tweet: boolean
}
export function createCommentThread(post: Post): CommentThread {
	return {
		id: (post.comment && post.comment.id) || '',
		dateCreated: post.date,
		text: (post.comment && post.comment.text) || '',
		addenda: (post.comment && post.comment.addenda) || [],
		articleId: post.article.id,
		articleTitle: post.article.title,
		articleSlug: post.article.slug,
		userAccount: post.userName,
		badge: post.badge,
		isAuthor: false,
		parentCommentId: null,
		dateDeleted: post.dateDeleted,
		children: []
	};
}