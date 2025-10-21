export interface GitHubRepository {
	owner: string
	repo: string
	fullName: string
	defaultBranch: string
	cloneUrl: string
	sshUrl: string
	htmlUrl: string
	isPrivate: boolean
	language?: string
	description?: string
}

export interface PullRequest {
	number: number
	title: string
	body: string
	state: "open" | "closed" | "merged"
	head: {
		ref: string
		sha: string
		repo: GitHubRepository
	}
	base: {
		ref: string
		sha: string
		repo: GitHubRepository
	}
	user: {
		login: string
		id: number
		avatar_url: string
	}
	created_at: string
	updated_at: string
	merged_at?: string
	closed_at?: string
}

export interface FileDiff {
	filename: string
	status: "added" | "modified" | "removed" | "renamed"
	additions: number
	deletions: number
	changes: number
	patch?: string
	previous_filename?: string
}

export interface GitHubFile {
	name: string
	path: string
	sha: string
	size: number
	url: string
	html_url: string
	git_url: string
	download_url: string
	type: "file" | "dir"
	content?: string
	encoding?: string
}

export interface WorkspaceContext {
	repository: GitHubRepository
	pullRequest?: PullRequest
	baseRef: string
	headRef: string
	baseSha: string
	headSha: string
	changedFiles: FileDiff[]
	ignorePatterns: string[]
	securityBoundaries: SecurityBoundaries
	workspacePath: string
}

export interface SecurityBoundaries {
	allowedOwners: string[]
	allowedRepos: string[]
	maxFileSize: number
	maxFilesPerRequest: number
	allowedFileExtensions: string[]
	blockedFileExtensions: string[]
	blockedPaths: string[]
}

export interface PathResolution {
	originalPath: string
	normalizedPath: string
	relativePath: string
	isWithinWorkspace: boolean
	isIgnored: boolean
	ignoreReason?: string
	isInPRDiff: boolean
	fileStatus?: "added" | "modified" | "removed" | "renamed" | undefined
}

export interface FileAccessRequest {
	path: string
	repository: GitHubRepository
	ref: string
	maxSize?: number
}

export interface FileAccessResult {
	success: boolean
	content?: string
	file?: GitHubFile
	error?: string
	pathResolution?: PathResolution
}

export interface IgnorePattern {
	pattern: string
	source: "gitignore" | "custom" | "security"
	isDirectory: boolean
}

export interface WorkspaceConfig {
	repository: GitHubRepository
	pullRequest?: PullRequest
	ignorePatterns: IgnorePattern[]
	securityBoundaries: SecurityBoundaries
	maxCacheSize: number
	cacheTimeout: number
}
