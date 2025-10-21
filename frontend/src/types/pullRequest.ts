export interface PullRequest {
	id: number
	repositoryId: number
	githubPrId: number
	title: string
	body?: string
	state: "open" | "closed" | "merged"
	draft: boolean
	headRef: string
	baseRef: string
	headSha: string
	baseSha: string
	authorLogin: string
	authorName?: string
	authorEmail?: string
	authorAvatarUrl?: string
	htmlUrl: string
	diffUrl?: string
	patchUrl?: string
	additions: number
	deletions: number
	changedFiles: number
	commits: number
	reviewComments: number
	comments: number
	mergeable?: boolean
	rebaseable?: boolean
	labels?: Array<{
		name: string
		color: string
	}>
	createdAt: string
	updatedAt: string
	closedAt?: string
	mergedAt?: string
	githubCreatedAt: string
	githubUpdatedAt: string
	fileCount?: number
	commentCount?: number
	reviewCount?: number
}

export interface PullRequestFile {
	id: number
	pullRequestId: number
	filename: string
	status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged"
	additions: number
	deletions: number
	changes: number
	blobUrl?: string
	rawUrl?: string
	contentsUrl?: string
	patch?: string
	previousFilename?: string
	createdAt: string
	updatedAt: string
}

export interface PullRequestComment {
	id: number
	pullRequestId: number
	githubCommentId: number
	body: string
	authorLogin: string
	authorName?: string
	authorEmail?: string
	authorAvatarUrl?: string
	htmlUrl?: string
	filePath?: string
	lineNumber?: number
	position?: number
	originalLineNumber?: number
	originalPosition?: number
	commentType: "review_comment" | "issue_comment" | "pr_comment"
	createdAt: string
	updatedAt: string
	githubCreatedAt: string
	githubUpdatedAt: string
}

export interface PullRequestReview {
	id: number
	pullRequestId: number
	githubReviewId: number
	body?: string
	state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING"
	authorLogin: string
	authorName?: string
	authorEmail?: string
	authorAvatarUrl?: string
	htmlUrl?: string
	commitId?: string
	createdAt: string
	updatedAt: string
	githubCreatedAt?: string
	githubSubmittedAt?: string
}

export interface PullRequestDetails extends PullRequest {
	files: PullRequestFile[]
	comments: PullRequestComment[]
	reviews: PullRequestReview[]
}

export interface PullRequestStats {
	overview: {
		totalPRs: number
		openPRs: number
		closedPRs: number
		mergedPRs: number
		draftPRs: number
		avgAdditions: number
		avgDeletions: number
		avgChangedFiles: number
		totalAdditions: number
		totalDeletions: number
		totalChangedFiles: number
	}
	recentActivity: Array<{
		date: string
		prsCreated: number
		prsMerged: number
	}>
	topContributors: Array<{
		login: string
		prCount: number
		mergedCount: number
		totalAdditions: number
		totalDeletions: number
	}>
}

export interface PullRequestSearchFilters {
	q?: string
	state?: string
	author?: string
	label?: string
	limit?: number
	offset?: number
}

export interface PullRequestListResponse {
	success: boolean
	data: {
		pullRequests: PullRequest[]
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}
}

export interface PullRequestDetailsResponse {
	success: boolean
	data: PullRequestDetails
}

export interface PullRequestStatsResponse {
	success: boolean
	data: PullRequestStats
}

export interface SyncResponse {
	success: boolean
	message: string
	repository: {
		id: number
		name: string
		owner: string
		fullName: string
	}
	pullRequest?: {
		number: number
	}
}
