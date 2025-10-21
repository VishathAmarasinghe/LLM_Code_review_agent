// Main workspace management exports
export { GitHubWorkspaceManager } from "./githubWorkspaceManager"
export { PathResolver } from "./pathResolver"
export { IgnoreHandler } from "./ignoreHandler"
export { SecurityHandler } from "./securityHandler"

// Type exports
export type {
	GitHubRepository,
	PullRequest,
	FileDiff,
	GitHubFile,
	WorkspaceContext,
	SecurityBoundaries,
	PathResolution,
	FileAccessRequest,
	FileAccessResult,
	IgnorePattern,
	WorkspaceConfig,
} from "./types"
