import { Article } from "./Article";
import { CommentAddendum, LeaderboardBadge } from "./CommentThread";

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