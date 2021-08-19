import { ReadStateCommitData } from './ReadStateCommitData';

export interface CommitReadStateEvent {
	commitData: ReadStateCommitData,
	isCompletionCommit: boolean
}