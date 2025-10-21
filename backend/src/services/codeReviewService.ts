import { logger } from "../utils/logger"
import { CodeReviewRequest } from "../middleware/validation"
import { CodeReviewResponse } from "../controllers/codeReviewController"
import { AIAnalysisService } from "./aiAnalysisService"
import { AgentOrchestrator } from "../orchestration"
import { WorkspaceManager } from "../workspace/workspaceManager"
import { githubService } from "./githubService"
import { ResultCache } from "./resultCache"

interface PaginationOptions {
	page: number
	limit: number
	sortBy: string
	sortOrder: "asc" | "desc"
}

interface ReviewStats {
	totalReviews: number
	reviewsByLanguage: Record<string, number>
	reviewsByType: Record<string, number>
	averageIssuesPerReview: number
	criticalIssuesCount: number
	recentReviews: number
}

export class CodeReviewService {
	private aiAnalysisService: AIAnalysisService
	private reviews: Map<string, CodeReviewResponse>

	constructor() {
		this.aiAnalysisService = new AIAnalysisService()
		this.reviews = new Map()
	}

	public async analyzeCode(request: CodeReviewRequest): Promise<CodeReviewResponse> {
		try {
			logger.info(`Starting code analysis for ${request.language} code`)

			// Perform AI analysis
			const analysis = await this.aiAnalysisService.analyzeCode(request)

			// Create review response
			const review: CodeReviewResponse = {
				id: this.generateId(),
				code: request.code,
				language: request.language,
				filename: request.filename,
				repository: request.repository,
				branch: request.branch,
				commitHash: request.commitHash,
				reviewType: request.reviewType || "comprehensive",
				customInstructions: request.customInstructions,
				analysis,
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			logger.info(`Code analysis completed for ${request.language} code`)
			return review
		} catch (error) {
			logger.error("Error in code analysis:", error)
			throw error
		}
	}

	public async createReview(request: CodeReviewRequest): Promise<CodeReviewResponse> {
		try {
			const review = await this.analyzeCode(request)
			this.reviews.set(review.id!, review)

			logger.info(`Review created with ID: ${review.id}`)
			return review
		} catch (error) {
			logger.error("Error creating review:", error)
			throw error
		}
	}

	public async getReviews(options: PaginationOptions): Promise<{
		reviews: CodeReviewResponse[]
		pagination: {
			page: number
			limit: number
			total: number
			totalPages: number
		}
	}> {
		try {
			const allReviews = Array.from(this.reviews.values())

			// Sort reviews
			allReviews.sort((a, b) => {
				const aValue = (a as any)[options.sortBy]
				const bValue = (b as any)[options.sortBy]

				if (options.sortOrder === "asc") {
					return aValue > bValue ? 1 : -1
				} else {
					return aValue < bValue ? 1 : -1
				}
			})

			// Paginate
			const startIndex = (options.page - 1) * options.limit
			const endIndex = startIndex + options.limit
			const paginatedReviews = allReviews.slice(startIndex, endIndex)

			return {
				reviews: paginatedReviews,
				pagination: {
					page: options.page,
					limit: options.limit,
					total: allReviews.length,
					totalPages: Math.ceil(allReviews.length / options.limit),
				},
			}
		} catch (error) {
			logger.error("Error getting reviews:", error)
			throw error
		}
	}

	public async getReviewById(id: string): Promise<CodeReviewResponse | null> {
		try {
			return this.reviews.get(id) || null
		} catch (error) {
			logger.error("Error getting review by ID:", error)
			throw error
		}
	}

	public async updateReview(id: string, updateData: Partial<CodeReviewRequest>): Promise<CodeReviewResponse | null> {
		try {
			const existingReview = this.reviews.get(id)
			if (!existingReview) {
				return null
			}

			// Create new review with updated data
			const updatedReview = await this.analyzeCode({
				code: updateData.code || existingReview.code,
				language: updateData.language || existingReview.language,
				filename: updateData.filename || existingReview.filename,
				repository: updateData.repository || existingReview.repository,
				branch: updateData.branch || existingReview.branch,
				commitHash: updateData.commitHash || existingReview.commitHash,
				reviewType: updateData.reviewType || existingReview.reviewType,
				customInstructions: updateData.customInstructions || existingReview.customInstructions,
			})

			// Preserve original ID and timestamps
			updatedReview.id = id
			updatedReview.createdAt = existingReview.createdAt
			updatedReview.updatedAt = new Date()

			this.reviews.set(id, updatedReview)

			logger.info(`Review updated with ID: ${id}`)
			return updatedReview
		} catch (error) {
			logger.error("Error updating review:", error)
			throw error
		}
	}

	public async deleteReview(id: string): Promise<boolean> {
		try {
			const deleted = this.reviews.delete(id)

			if (deleted) {
				logger.info(`Review deleted with ID: ${id}`)
			}

			return deleted
		} catch (error) {
			logger.error("Error deleting review:", error)
			throw error
		}
	}

	public async batchAnalyze(files: CodeReviewRequest[]): Promise<CodeReviewResponse[]> {
		try {
			logger.info(`Starting batch analysis for ${files.length} files`)

			const results: CodeReviewResponse[] = []

			for (const file of files) {
				try {
					const review = await this.analyzeCode(file)
					results.push(review)
				} catch (error) {
					logger.error(`Error analyzing file ${file.filename || "unnamed"}:`, error)
					// Continue with other files even if one fails
				}
			}

			logger.info(`Batch analysis completed. ${results.length}/${files.length} files analyzed successfully`)
			return results
		} catch (error) {
			logger.error("Error in batch analysis:", error)
			throw error
		}
	}

	public async getStats(): Promise<ReviewStats> {
		try {
			const allReviews = Array.from(this.reviews.values())

			const stats: ReviewStats = {
				totalReviews: allReviews.length,
				reviewsByLanguage: {},
				reviewsByType: {},
				averageIssuesPerReview: 0,
				criticalIssuesCount: 0,
				recentReviews: 0,
			}

			let totalIssues = 0
			const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

			allReviews.forEach((review) => {
				// Count by language
				stats.reviewsByLanguage[review.language] = (stats.reviewsByLanguage[review.language] || 0) + 1

				// Count by type
				stats.reviewsByType[review.reviewType] = (stats.reviewsByType[review.reviewType] || 0) + 1

				// Count issues
				totalIssues += review.analysis.issues.length
				stats.criticalIssuesCount += review.analysis.issues.filter(
					(issue) => issue.severity === "critical",
				).length

				// Count recent reviews
				if (review.createdAt > sevenDaysAgo) {
					stats.recentReviews++
				}
			})

			stats.averageIssuesPerReview = allReviews.length > 0 ? totalIssues / allReviews.length : 0

			return stats
		} catch (error) {
			logger.error("Error getting stats:", error)
			throw error
		}
	}

	public async startPrReview(params: {
		owner: string
		repo: string
		prNumber: number
		userId: number
		accessToken: string
	}): Promise<{ id: string }> {
		const { owner, repo, prNumber, userId, accessToken } = params

		// Generate a task id for UI correlation
		const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

		// Fetch PR details
		const pr = await githubService.getPullRequest(accessToken, owner, repo, prNumber)
		const repository = await githubService.getRepository(accessToken, owner, repo)

		// Create a workspace for this PR
		const workspaceManager = await WorkspaceManager.getInstance().createPRWorkspace(
			{
				owner,
				repo,
				fullName: `${owner}/${repo}`,
				defaultBranch: repository.default_branch || "",
				cloneUrl: repository.clone_url || "",
				sshUrl: repository.ssh_url || "",
				htmlUrl: repository.html_url || "",
				isPrivate: !!repository.private,
				language: repository.language || undefined,
				description: repository.description || undefined,
			},
			{
				number: pr.number,
				title: pr.title,
				body: pr.body || "",
				state: (pr.state === "open" ? "open" : pr.merged_at ? "merged" : "closed") as any,
				head: {
					ref: pr.head.ref,
					sha: pr.head.sha,
					repo: {
						owner,
						repo,
						fullName: `${owner}/${repo}`,
						defaultBranch: repository.default_branch || "",
						cloneUrl: repository.clone_url || "",
						sshUrl: repository.ssh_url || "",
						htmlUrl: repository.html_url || "",
						isPrivate: !!repository.private,
						language: repository.language || undefined,
						description: repository.description || undefined,
					},
				},
				base: {
					ref: pr.base.ref,
					sha: pr.base.sha,
					repo: {
						owner,
						repo,
						fullName: `${owner}/${repo}`,
						defaultBranch: repository.default_branch || "",
						cloneUrl: repository.clone_url || "",
						sshUrl: repository.ssh_url || "",
						htmlUrl: repository.html_url || "",
						isPrivate: !!repository.private,
						language: repository.language || undefined,
						description: repository.description || undefined,
					},
				},
				user: {
					login: pr.user.login,
					id: pr.user.id,
					avatar_url: pr.user.avatar_url,
				},
				created_at: pr.created_at,
				updated_at: pr.updated_at,
				merged_at: pr.merged_at,
				closed_at: pr.closed_at,
			},
			accessToken,
		)

		// Build workflow context
		const context = {
			workspacePath: workspaceManager.getWorkspaceContext().workspacePath,
			userId,
			pullRequestId: pr.number,
			variables: { taskId, owner, repo, prNumber },
			results: new Map<string, any>(),
			metadata: { workflowType: "code_review", repo: `${owner}/${repo}` },
		}

		// Kick off orchestrated code review asynchronously
		const orchestrator = AgentOrchestrator.getInstance()
		orchestrator
			.executeCodeReview(userId, context as any)
			.then((workflowResult) => {
				// Cache final result by taskId
				ResultCache.getInstance().set(taskId, workflowResult)
			})
			.catch((err) => {
				ResultCache.getInstance().set(taskId, { success: false, error: err?.message || "failed" })
			})

		return { id: taskId }
	}

	public async getReviewResult(taskId: string): Promise<any | null> {
		return ResultCache.getInstance().get(taskId) || null
	}

	private generateId(): string {
		return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
	}
}
