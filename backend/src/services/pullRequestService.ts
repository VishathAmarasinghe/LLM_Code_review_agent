import axios, { AxiosInstance } from "axios"
import { logger } from "../utils/logger"
import { Repository, PullRequest, PullRequestFile, PullRequestComment, PullRequestReview } from "../models"

export interface GitHubPullRequest {
	id: number
	number: number
	title: string
	body: string | null
	state: "open" | "closed"
	draft: boolean
	head: {
		ref: string
		sha: string
	}
	base: {
		ref: string
		sha: string
	}
	user: {
		login: string
		name?: string
		email?: string
		avatar_url: string
	}
	html_url: string
	diff_url: string
	patch_url: string
	additions: number
	deletions: number
	changed_files: number
	commits: number
	review_comments: number
	comments: number
	mergeable: boolean | null
	rebaseable: boolean | null
	labels: Array<{
		name: string
		color: string
	}>
	created_at: string
	updated_at: string
	closed_at: string | null
	merged_at: string | null
}

export interface GitHubPullRequestFile {
	filename: string
	status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged"
	additions: number
	deletions: number
	changes: number
	blob_url: string
	raw_url: string
	contents_url: string
	patch?: string
	previous_filename?: string
}

export interface GitHubPullRequestComment {
	id: number
	body: string
	created_at: string
	updated_at: string
	user: {
		login: string
		name?: string
		email?: string
		avatar_url: string
	}
	html_url: string
	path?: string
	line?: number
	position?: number
	original_line?: number
	original_position?: number
}

export interface GitHubPullRequestReview {
	id: number
	body: string | null
	state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING"
	submitted_at: string | null
	user: {
		login: string
		name?: string
		email?: string
		avatar_url: string
	}
	html_url: string
	commit_id: string
}

class PullRequestService {
	private api: AxiosInstance
	private readonly baseURL = "https://api.github.com"
	private runningSyncs = new Set<number>() // Track running sync operations by repositoryId

	constructor() {
		this.api = axios.create({
			baseURL: this.baseURL,
			timeout: 10000,
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": "Code-Review-Agent/1.0",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		})

		// Add request interceptor for rate limiting
		this.api.interceptors.response.use(
			(response) => response,
			(error) => {
				if (error.response?.status === 403 && error.response?.headers["x-ratelimit-remaining"] === "0") {
					logger.warn("GitHub API rate limit exceeded")
					throw new Error("GitHub API rate limit exceeded. Please try again later.")
				}
				return Promise.reject(error)
			},
		)
	}

	/**
	 * Fetch pull requests for a repository from GitHub API
	 */
	async fetchPullRequestsFromGitHub(
		accessToken: string,
		owner: string,
		repo: string,
		state: "open" | "closed" | "all" = "open",
	): Promise<GitHubPullRequest[]> {
		const url = `/repos/${owner}/${repo}/pulls`
		const headers = {
			Authorization: `Bearer ${accessToken}`,
		}

		try {
			logger.info(`[GitHub] Fetching pull requests`, { owner, repo, state })
			const allPRs: GitHubPullRequest[] = []
			let page = 1
			const perPage = 100

			while (true) {
				logger.debug(`[GitHub] Requesting pulls page`, { owner, repo, state, page, perPage })
				const response = await this.api.get(url, {
					headers,
					params: {
						state,
						per_page: perPage,
						page,
					},
				})

				const prs: GitHubPullRequest[] = response.data || []
				logger.debug(`[GitHub] Received page`, { owner, repo, page, count: prs.length })
				allPRs.push(...prs)

				if (prs.length < perPage) break
				page += 1
				// Safety cap to avoid excessive pages
				if (page > 10) break
			}

			logger.info(`[GitHub] Total PRs fetched`, { owner, repo, state, total: allPRs.length })
			return allPRs
		} catch (error: any) {
			const status = error?.response?.status
			const remaining = error?.response?.headers?.["x-ratelimit-remaining"]
			const reset = error?.response?.headers?.["x-ratelimit-reset"]
			const dataSnippet =
				typeof error?.response?.data === "string" ? error.response.data.slice(0, 500) : error?.response?.data
			logger.error("[GitHub] Error fetching pull requests", {
				owner,
				repo,
				state,
				status,
				remaining,
				reset,
				data: dataSnippet,
				message: error?.message,
			})
			throw error
		}
	}

	/**
	 * Fetch a specific pull request from GitHub API
	 */
	async fetchPullRequestFromGitHub(
		accessToken: string,
		owner: string,
		repo: string,
		pullNumber: number,
	): Promise<GitHubPullRequest> {
		const url = `/repos/${owner}/${repo}/pulls/${pullNumber}`
		const headers = {
			Authorization: `Bearer ${accessToken}`,
		}

		try {
			const response = await this.api.get(url, { headers })
			return response.data
		} catch (error: any) {
			logger.error("Error fetching pull request from GitHub:", error)
			throw error
		}
	}

	/**
	 * Fetch pull request files from GitHub API
	 */
	async fetchPullRequestFiles(
		accessToken: string,
		owner: string,
		repo: string,
		pullNumber: number,
	): Promise<GitHubPullRequestFile[]> {
		const url = `/repos/${owner}/${repo}/pulls/${pullNumber}/files`
		const headers = {
			Authorization: `Bearer ${accessToken}`,
		}

		try {
			const response = await this.api.get(url, { headers })
			return response.data
		} catch (error: any) {
			logger.error("Error fetching pull request files:", error)
			throw error
		}
	}

	/**
	 * Fetch pull request comments from GitHub API
	 */
	async fetchPullRequestComments(
		accessToken: string,
		owner: string,
		repo: string,
		pullNumber: number,
	): Promise<GitHubPullRequestComment[]> {
		const url = `/repos/${owner}/${repo}/issues/${pullNumber}/comments`
		const headers = {
			Authorization: `Bearer ${accessToken}`,
		}

		try {
			const response = await this.api.get(url, { headers })
			return response.data
		} catch (error: any) {
			logger.error("Error fetching pull request comments:", error)
			throw error
		}
	}

	/**
	 * Create a pull request review comment (inline comment)
	 */
	async createPullRequestReviewComment(
		accessToken: string,
		owner: string,
		repo: string,
		pullNumber: number,
		comment: {
			body: string
			path: string
			line: number
			side?: "LEFT" | "RIGHT"
			startLine?: number
			startSide?: "LEFT" | "RIGHT"
		},
	): Promise<GitHubPullRequestComment> {
		const url = `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`
		const headers = {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		}

		const payload = {
			body: comment.body,
			path: comment.path,
			line: comment.line,
			side: comment.side || "RIGHT",
			...(comment.startLine && { start_line: comment.startLine }),
			...(comment.startSide && { start_side: comment.startSide }),
		}

		try {
			const response = await this.api.post(url, payload, { headers })
			logger.info(`Created review comment on ${comment.path}:${comment.line}`)
			return response.data
		} catch (error: any) {
			logger.error("Error creating pull request review comment:", error)
			throw error
		}
	}

	/**
	 * Create a pull request issue comment (general comment)
	 */
	async createPullRequestIssueComment(
		accessToken: string,
		owner: string,
		repo: string,
		pullNumber: number,
		body: string,
	): Promise<GitHubPullRequestComment> {
		const url = `/repos/${owner}/${repo}/issues/${pullNumber}/comments`
		const headers = {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json",
		}

		const payload = { body }

		try {
			const response = await this.api.post(url, payload, { headers })
			logger.info(`Created issue comment on PR #${pullNumber}`)
			return response.data
		} catch (error: any) {
			logger.error("Error creating pull request issue comment:", error)
			throw error
		}
	}

	/**
	 * Create multiple pull request review comments
	 */
	async createMultipleReviewComments(
		accessToken: string,
		owner: string,
		repo: string,
		pullNumber: number,
		comments: Array<{
			body: string
			path: string
			line: number
			side?: "LEFT" | "RIGHT"
			startLine?: number
			startSide?: "LEFT" | "RIGHT"
		}>,
	): Promise<GitHubPullRequestComment[]> {
		const results: GitHubPullRequestComment[] = []

		for (const comment of comments) {
			try {
				const result = await this.createPullRequestReviewComment(accessToken, owner, repo, pullNumber, comment)
				results.push(result)

				// Add small delay to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 100))
			} catch (error) {
				logger.error(`Failed to create comment on ${comment.path}:${comment.line}`, error)
				// Continue with other comments even if one fails
			}
		}

		logger.info(`Created ${results.length}/${comments.length} review comments`)
		return results
	}

	/**
	 * Fetch pull request reviews from GitHub API
	 */
	async fetchPullRequestReviews(
		accessToken: string,
		owner: string,
		repo: string,
		pullNumber: number,
	): Promise<GitHubPullRequestReview[]> {
		const url = `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`
		const headers = {
			Authorization: `Bearer ${accessToken}`,
		}

		try {
			const response = await this.api.get(url, { headers })
			return response.data
		} catch (error: any) {
			logger.error("Error fetching pull request reviews:", error)
			throw error
		}
	}

	/**
	 * Store or update a pull request in the database
	 */
	async storePullRequest(repositoryId: number, pr: GitHubPullRequest): Promise<PullRequest> {
		try {
			const prData = {
				repositoryId,
				githubPrId: pr.number,
				title: pr.title,
				body: pr.body || null,
				state: (pr.state === "closed" && pr.merged_at ? "merged" : pr.state) as "open" | "closed" | "merged",
				draft: pr.draft,
				headRef: pr.head.ref,
				baseRef: pr.base.ref,
				headSha: pr.head.sha,
				baseSha: pr.base.sha,
				authorLogin: pr.user.login,
				authorName: pr.user.name || null,
				authorEmail: pr.user.email || null,
				authorAvatarUrl: pr.user.avatar_url,
				htmlUrl: pr.html_url,
				diffUrl: pr.diff_url || null,
				patchUrl: pr.patch_url || null,
				additions: pr.additions,
				deletions: pr.deletions,
				changedFiles: pr.changed_files,
				commits: pr.commits,
				reviewComments: pr.review_comments,
				comments: pr.comments,
				mergeable: pr.mergeable,
				rebaseable: pr.rebaseable,
				labels: pr.labels,
				githubCreatedAt: new Date(pr.created_at),
				githubUpdatedAt: new Date(pr.updated_at),
				closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
				mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
			}

			// Create fresh PR (all existing ones were deleted in processAllPullRequests)
			logger.info(`Creating PR #${pr.number} for repository ${repositoryId}`)
			const createdPR = await PullRequest.create(prData as any)

			if (!createdPR || !createdPR.id) {
				throw new Error(`Failed to create PR #${pr.number}`)
			}

			logger.info(`Successfully created PR #${pr.number} with ID: ${createdPR.id}`)
			return createdPR
		} catch (error: any) {
			logger.error("Error storing pull request:", error)
			throw error
		}
	}

	/**
	 * Store pull request files in the database
	 */
	async storePullRequestFiles(pullRequestId: number, files: GitHubPullRequestFile[]): Promise<void> {
		try {
			if (!pullRequestId) {
				throw new Error("Invalid pullRequestId for files storage")
			}

			logger.info(
				`Storing ${files.length} files for PR ${pullRequestId}:`,
				files.map((f) => ({
					filename: f.filename,
					status: f.status,
					additions: f.additions,
					deletions: f.deletions,
				})),
			)

			// Clear existing files for this PR
			await PullRequestFile.destroy({
				where: { pullRequestId },
			})

			// Insert new files
			const fileData = files.map((file) => ({
				pullRequestId,
				filename: file.filename,
				status: file.status,
				additions: file.additions,
				deletions: file.deletions,
				changes: file.changes,
				blobUrl: file.blob_url,
				rawUrl: file.raw_url,
				contentsUrl: file.contents_url,
				patch: file.patch || null,
				previousFilename: file.previous_filename || null,
			}))

			await PullRequestFile.bulkCreate(fileData as any)

			// Verify files were stored
			const storedFiles = await PullRequestFile.findAll({ where: { pullRequestId } })
			logger.info(`Successfully stored ${storedFiles.length} files for PR ${pullRequestId}`)
		} catch (error: any) {
			logger.error("Error storing pull request files:", error)
			throw error
		}
	}

	/**
	 * Store pull request comments in the database
	 */
	async storePullRequestComments(pullRequestId: number, comments: GitHubPullRequestComment[]): Promise<void> {
		try {
			if (!pullRequestId) {
				throw new Error("Invalid pullRequestId for comments storage")
			}
			// Clear existing comments for this PR
			await PullRequestComment.destroy({
				where: { pullRequestId },
			})

			// Insert new comments
			const commentData = comments.map((comment) => ({
				pullRequestId,
				githubCommentId: comment.id,
				body: comment.body,
				authorLogin: comment.user.login,
				authorName: comment.user.name || null,
				authorEmail: comment.user.email || null,
				authorAvatarUrl: comment.user.avatar_url,
				htmlUrl: comment.html_url,
				filePath: comment.path || null,
				lineNumber: comment.line || null,
				position: comment.position || null,
				originalLineNumber: comment.original_line || null,
				originalPosition: comment.original_position || null,
				commentType: "pr_comment" as const,
				githubCreatedAt: new Date(comment.created_at),
				githubUpdatedAt: new Date(comment.updated_at),
			}))

			await PullRequestComment.bulkCreate(commentData as any)
		} catch (error: any) {
			logger.error("Error storing pull request comments:", error)
			throw error
		}
	}

	/**
	 * Store pull request reviews in the database
	 */
	async storePullRequestReviews(pullRequestId: number, reviews: GitHubPullRequestReview[]): Promise<void> {
		try {
			if (!pullRequestId) {
				throw new Error("Invalid pullRequestId for reviews storage")
			}
			// Clear existing reviews for this PR
			await PullRequestReview.destroy({
				where: { pullRequestId },
			})

			// Insert new reviews
			const reviewData = reviews.map((review) => ({
				pullRequestId,
				githubReviewId: review.id,
				body: review.body || null,
				state: review.state,
				authorLogin: review.user.login,
				authorName: review.user.name || null,
				authorEmail: review.user.email || null,
				authorAvatarUrl: review.user.avatar_url,
				htmlUrl: review.html_url,
				commitId: review.commit_id,
				githubCreatedAt: review.submitted_at ? new Date(review.submitted_at) : null,
				githubSubmittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
			}))

			await PullRequestReview.bulkCreate(reviewData as any)
		} catch (error: any) {
			logger.error("Error storing pull request reviews:", error)
			throw error
		}
	}

	/**
	 * Process a complete pull request (fetch and store all data)
	 */
	async processPullRequest(
		accessToken: string,
		repositoryId: number,
		owner: string,
		repo: string,
		pullNumber: number,
	): Promise<PullRequest> {
		try {
			logger.info(`Processing PR #${pullNumber} for ${owner}/${repo}`)

			// Fetch PR data
			const [pr, files, comments, reviews] = await Promise.all([
				this.fetchPullRequestFromGitHub(accessToken, owner, repo, pullNumber),
				this.fetchPullRequestFiles(accessToken, owner, repo, pullNumber),
				this.fetchPullRequestComments(accessToken, owner, repo, pullNumber),
				this.fetchPullRequestReviews(accessToken, owner, repo, pullNumber),
			])

			// Store in database
			let pullRequest = await this.storePullRequest(repositoryId, pr)
			if (!pullRequest || !pullRequest.id) {
				const fallback = await PullRequest.findOne({ where: { repositoryId, githubPrId: pr.number } })
				if (!fallback || !fallback.id) {
					throw new Error("Failed to persist pull request before storing related data")
				}
				pullRequest = fallback
			}

			const prId = pullRequest.id as number
			await Promise.all([
				this.storePullRequestFiles(prId, files),
				this.storePullRequestComments(prId, comments),
				this.storePullRequestReviews(prId, reviews),
			])

			logger.info(`Successfully processed PR #${pullNumber} for ${owner}/${repo}`)
			return pullRequest
		} catch (error: any) {
			logger.error(`Error processing PR #${pullNumber} for ${owner}/${repo}:`, error)
			throw error
		}
	}

	/**
	 * Process all pull requests for a repository
	 */
	async processAllPullRequests(
		accessToken: string,
		repositoryId: number,
		owner: string,
		repo: string,
	): Promise<PullRequest[]> {
		// Check if sync is already running for this repository
		if (this.runningSyncs.has(repositoryId)) {
			logger.warn(`[Sync] Sync already in progress for repository ${repositoryId}, skipping duplicate request`)
			throw new Error(`Sync already in progress for repository ${repositoryId}`)
		}

		// Mark sync as running
		this.runningSyncs.add(repositoryId)

		try {
			logger.info(`[Sync] Processing all PRs`, { repositoryId, owner, repo })

			// STEP 1: Delete all existing PRs for this repository to avoid duplicates
			logger.info(`[Sync] Deleting existing PRs for repository`, { repositoryId, owner, repo })

			// Count existing PRs before deletion
			const existingCount = await PullRequest.count({ where: { repositoryId } })

			if (existingCount > 0) {
				// Delete all PRs (CASCADE will delete related files, comments, reviews)
				const deletedCount = await PullRequest.destroy({
					where: { repositoryId },
					force: true, // Ensure hard delete
				})

				logger.info(`[Sync] Deleted ${deletedCount} existing PRs (had ${existingCount})`, {
					repositoryId,
					owner,
					repo,
				})

				// Verify deletion completed
				const remainingCount = await PullRequest.count({ where: { repositoryId } })
				if (remainingCount > 0) {
					logger.error(`[Sync] Deletion failed! Still have ${remainingCount} PRs in database`, {
						repositoryId,
						owner,
						repo,
					})
					throw new Error(`Failed to delete existing PRs. ${remainingCount} records remain.`)
				}
				logger.info(`[Sync] Verified: All PRs deleted successfully`, { repositoryId, owner, repo })
			} else {
				logger.info(`[Sync] No existing PRs to delete`, { repositoryId, owner, repo })
			}

			// STEP 2: Fetch fresh PRs from GitHub
			const prs = await this.fetchPullRequestsFromGitHub(accessToken, owner, repo, "all")
			logger.info(`[Sync] GitHub returned PRs`, { repositoryId, owner, repo, count: prs.length })
			const processedPRs: PullRequest[] = []

			// STEP 3: Create fresh PRs in database
			for (const pr of prs) {
				try {
					const processedPR = await this.processPullRequest(accessToken, repositoryId, owner, repo, pr.number)
					processedPRs.push(processedPR)
				} catch (error) {
					logger.error("[Sync] Error processing individual PR", {
						repositoryId,
						owner,
						repo,
						number: pr.number,
						message: (error as any)?.message,
					})
					// Continue with other PRs
				}
			}

			logger.info(`[Sync] Successfully processed PRs`, {
				repositoryId,
				owner,
				repo,
				processed: processedPRs.length,
			})
			return processedPRs
		} catch (error: any) {
			logger.error("[Sync] Error processing PRs", { repositoryId, owner, repo, message: error?.message })
			throw error
		} finally {
			// Always remove from running syncs
			this.runningSyncs.delete(repositoryId)
		}
	}

	/**
	 * Get pull requests from database for a repository
	 */
	async getPullRequests(repositoryId: number, userId: number, state?: string): Promise<any[]> {
		try {
			// Verify user has access to this repository
			const repository = await Repository.findOne({
				where: { id: repositoryId, userId },
			})

			if (!repository) {
				throw new Error("Repository not found or access denied")
			}

			const whereClause: any = { repositoryId }
			if (state) {
				whereClause.state = state
			}

			const pullRequests = await PullRequest.findAll({
				where: whereClause,
				include: [
					{
						model: PullRequestFile,
						as: "files",
						required: false,
					},
					{
						model: PullRequestComment,
						as: "prComments",
						required: false,
					},
					{
						model: PullRequestReview,
						as: "reviews",
						required: false,
					},
				],
				order: [["githubCreatedAt", "DESC"]],
			})

			return pullRequests.map((pr) => ({
				...pr.toJSON(),
				fileCount: 0, // Will be populated by separate queries
				commentCount: pr.comments || 0,
				reviewCount: 0, // Will be populated by separate queries
			}))
		} catch (error: any) {
			logger.error("Error getting pull requests:", error)
			throw error
		}
	}

	/**
	 * Get pull requests for multiple repositories
	 */
	async getPullRequestsForRepositories(repositoryIds: number[], state?: string): Promise<any[]> {
		try {
			if (repositoryIds.length === 0) return []

			const whereClause: any = { repositoryId: repositoryIds }
			if (state) {
				whereClause.state = state
			}

			logger.info(`Querying PRs for repositories ${repositoryIds.join(", ")} with state: ${state || "all"}`)

			const pullRequests = await PullRequest.findAll({
				where: whereClause,
				order: [["githubCreatedAt", "DESC"]],
				raw: true,
			})

			logger.info(`Found ${pullRequests.length} PRs in database`)

			// Check for duplicates in database results
			const ids = pullRequests.map((pr: any) => pr.id)
			const uniqueIds = [...new Set(ids)]
			if (ids.length !== uniqueIds.length) {
				logger.warn(`Database returned ${ids.length - uniqueIds.length} duplicate PRs`)
				logger.warn(
					"Duplicate IDs from DB:",
					ids.filter((id: any, index: number) => ids.indexOf(id) !== index),
				)
			}

			return pullRequests as any[]
		} catch (error: any) {
			logger.error("Error getting pull requests for repositories:", error)
			throw error
		}
	}

	/**
	 * Get a specific pull request with all related data
	 */
	async getPullRequestDetails(pullRequestId: number, userId: number): Promise<any> {
		try {
			const pullRequest = await PullRequest.findByPk(pullRequestId, {
				include: [
					{
						model: Repository,
						as: "repository",
						where: { userId },
					},
					{
						model: PullRequestFile,
						as: "files",
						required: false,
					},
					{
						model: PullRequestComment,
						as: "prComments",
						required: false,
					},
					{
						model: PullRequestReview,
						as: "reviews",
						required: false,
					},
				],
			})

			if (!pullRequest) {
				throw new Error("Pull request not found or access denied")
			}

			const result = pullRequest.toJSON()
			logger.info(`Pull request ${pullRequestId} details:`, {
				id: result.id,
				githubPrId: result.githubPrId,
				title: result.title,
				changedFiles: result.changedFiles,
				filesCount: (result as any).files?.length || 0,
				files:
					(result as any).files?.map((f: any) => ({ id: f.id, filename: f.filename, status: f.status })) ||
					[],
			})

			return result
		} catch (error: any) {
			logger.error("Error getting pull request details:", error)
			throw error
		}
	}

	/**
	 * Get pull request statistics for a repository
	 */
	async getPullRequestStats(repositoryId: number, userId: number): Promise<any> {
		try {
			// Verify user has access to this repository
			const repository = await Repository.findOne({
				where: { id: repositoryId, userId },
			})

			if (!repository) {
				throw new Error("Repository not found or access denied")
			}

			const stats = await PullRequest.findAll({
				where: { repositoryId },
				attributes: ["state", "draft", "additions", "deletions", "changedFiles", "githubCreatedAt"],
				raw: true,
			})

			const overview = {
				totalPRs: stats.length,
				openPRs: stats.filter((s) => s.state === "open").length,
				closedPRs: stats.filter((s) => s.state === "closed").length,
				mergedPRs: stats.filter((s) => s.state === "merged").length,
				draftPRs: stats.filter((s) => s.draft).length,
				avgAdditions:
					stats.length > 0 ? Math.round(stats.reduce((sum, s) => sum + s.additions, 0) / stats.length) : 0,
				avgDeletions:
					stats.length > 0 ? Math.round(stats.reduce((sum, s) => sum + s.deletions, 0) / stats.length) : 0,
				avgChangedFiles:
					stats.length > 0 ? Math.round(stats.reduce((sum, s) => sum + s.changedFiles, 0) / stats.length) : 0,
				totalAdditions: stats.reduce((sum, s) => sum + s.additions, 0),
				totalDeletions: stats.reduce((sum, s) => sum + s.deletions, 0),
				totalChangedFiles: stats.reduce((sum, s) => sum + s.changedFiles, 0),
			}

			// Get recent activity (last 30 days)
			const thirtyDaysAgo = new Date()
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

			const recentStats = await PullRequest.findAll({
				where: {
					repositoryId,
					githubCreatedAt: {
						[require("sequelize").Op.gte]: thirtyDaysAgo,
					},
				},
				attributes: ["githubCreatedAt", "state"],
				raw: true,
			})

			// Group by date
			const recentActivity = recentStats.reduce((acc: any, stat: any) => {
				const date = stat.githubCreatedAt
					? new Date(stat.githubCreatedAt).toISOString().split("T")[0]
					: "unknown"
				const safeDate = date || "unknown"
				if (!acc[safeDate]) {
					acc[safeDate] = { prsCreated: 0, prsMerged: 0 }
				}
				acc[safeDate].prsCreated++
				if (stat.state === "merged") {
					acc[safeDate].prsMerged++
				}
				return acc
			}, {} as any)

			// Get top contributors
			const contributors = await PullRequest.findAll({
				where: { repositoryId },
				attributes: ["authorLogin", "state", "additions", "deletions"],
				raw: true,
			})

			const contributorStats = contributors.reduce((acc: any, pr) => {
				if (!acc[pr.authorLogin]) {
					acc[pr.authorLogin] = {
						prCount: 0,
						mergedCount: 0,
						totalAdditions: 0,
						totalDeletions: 0,
					}
				}
				acc[pr.authorLogin].prCount++
				if (pr.state === "merged") {
					acc[pr.authorLogin].mergedCount++
				}
				acc[pr.authorLogin].totalAdditions += pr.additions
				acc[pr.authorLogin].totalDeletions += pr.deletions
				return acc
			}, {})

			const topContributors = Object.entries(contributorStats)
				.map(([login, stats]: [string, any]) => ({ login, ...stats }))
				.sort((a, b) => b.prCount - a.prCount)
				.slice(0, 10)

			return {
				overview,
				recentActivity: Object.entries(recentActivity).map(([date, stats]) => ({
					date,
					prsCreated: (stats as any).prsCreated,
					prsMerged: (stats as any).prsMerged,
				})),
				topContributors,
			}
		} catch (error: any) {
			logger.error("Error getting pull request stats:", error)
			throw error
		}
	}
}

export const pullRequestService = new PullRequestService()
