import { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger"
import { CodeReviewService } from "../services/codeReviewService"
import { CodeReviewRequest } from "../middleware/validation"
import { prReviewService } from "../services/prReviewService"

export interface CodeReviewResponse {
	id?: string
	code: string
	language: string
	filename?: string
	repository?: string
	branch?: string
	commitHash?: string
	reviewType: string
	customInstructions?: string
	analysis: {
		summary: string
		issues: Array<{
			type: "error" | "warning" | "suggestion" | "security" | "code_smell" | "anti_pattern"
			severity: "low" | "medium" | "high" | "critical"
			line?: number
			message: string
			suggestion?: string
			rule?: string
			codeSuggestion?: {
				oldCode: string
				newCode: string
				fileName?: string
			}
		}>
		metrics: {
			complexity: number
			maintainability: number
			security: number
			performance: number
		}
		suggestions: string[]
	}
	createdAt: Date
	updatedAt: Date
}

class CodeReviewController {
	private codeReviewService: CodeReviewService

	constructor() {
		this.codeReviewService = new CodeReviewService()
	}

	public analyzeCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const reviewRequest: CodeReviewRequest = req.body

			logger.info(`Analyzing code for language: ${reviewRequest.language}`)

			const analysis = await this.codeReviewService.analyzeCode(reviewRequest)

			res.json({
				success: true,
				data: analysis,
			})
		} catch (error) {
			logger.error("Error analyzing code:", error)
			next(error)
		}
	}

	public createReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const reviewRequest: CodeReviewRequest = req.body

			logger.info(`Creating new code review for: ${reviewRequest.filename || "unnamed file"}`)

			const review = await this.codeReviewService.createReview(reviewRequest)

			res.status(201).json({
				success: true,
				data: review,
			})
		} catch (error) {
			logger.error("Error creating review:", error)
			next(error)
		}
	}

	public getReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query

			logger.info(`Fetching reviews - page: ${page}, limit: ${limit}`)

			const reviews = await this.codeReviewService.getReviews({
				page: Number(page),
				limit: Number(limit),
				sortBy: sortBy as string,
				sortOrder: sortOrder as "asc" | "desc",
			})

			res.json({
				success: true,
				data: reviews,
			})
		} catch (error) {
			logger.error("Error fetching reviews:", error)
			next(error)
		}
	}

	public getReviewById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { id } = req.params as { id: string }

			logger.info(`Fetching review with ID: ${id}`)

			const review = await this.codeReviewService.getReviewById(id)

			if (!review) {
				res.status(404).json({
					success: false,
					error: "Review not found",
				})
				return
			}

			res.json({
				success: true,
				data: review,
			})
		} catch (error) {
			logger.error("Error fetching review by ID:", error)
			next(error)
		}
	}

	public updateReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { id } = req.params as { id: string }
			const updateData: Partial<CodeReviewRequest> = req.body

			logger.info(`Updating review with ID: ${id}`)

			const review = await this.codeReviewService.updateReview(id, updateData)

			if (!review) {
				res.status(404).json({
					success: false,
					error: "Review not found",
				})
				return
			}

			res.json({
				success: true,
				data: review,
			})
		} catch (error) {
			logger.error("Error updating review:", error)
			next(error)
		}
	}

	public deleteReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { id } = req.params as { id: string }

			logger.info(`Deleting review with ID: ${id}`)

			const deleted = await this.codeReviewService.deleteReview(id)

			if (!deleted) {
				res.status(404).json({
					success: false,
					error: "Review not found",
				})
				return
			}

			res.json({
				success: true,
				message: "Review deleted successfully",
			})
		} catch (error) {
			logger.error("Error deleting review:", error)
			next(error)
		}
	}

	public batchAnalyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { files } = req.body

			if (!Array.isArray(files) || files.length === 0) {
				res.status(400).json({
					success: false,
					error: "Files array is required and must not be empty",
				})
				return
			}

			logger.info(`Batch analyzing ${files.length} files`)

			const results = await this.codeReviewService.batchAnalyze(files)

			res.json({
				success: true,
				data: results,
			})
		} catch (error) {
			logger.error("Error in batch analysis:", error)
			next(error)
		}
	}

	public getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			logger.info("Fetching review statistics")

			const stats = await this.codeReviewService.getStats()

			res.json({
				success: true,
				data: stats,
			})
		} catch (error) {
			logger.error("Error fetching stats:", error)
			next(error)
		}
	}

	public startPrReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { owner, repo, prNumber } = req.params
			// Ensure userId is a number for downstream tools
			const rawUserId = (req as any).user?.id
			const userId = typeof rawUserId === "number" ? rawUserId : Number(rawUserId)
			const accessToken = (req as any).user?.accessToken

			if (!Number.isFinite(userId) || !accessToken) {
				res.status(401).json({ success: false, error: "Authentication required or GitHub token missing" })
				return
			}

			if (!owner || !repo || !prNumber) {
				res.status(400).json({ success: false, error: "Missing required parameters: owner, repo, prNumber" })
				return
			}

			logger.info(`Starting PR review for ${owner}/${repo} PR #${prNumber} by user ${userId}`)

			const task = await prReviewService.startPrReview({
				owner,
				repo,
				prNumber: Number(prNumber),
				userId,
				accessToken,
			})

			res.status(202).json({
				success: true,
				message: "PR review started",
				data: {
					taskId: task.id,
				},
			})
		} catch (error) {
			logger.error("Error starting PR review:", error)
			next(error)
		}
	}

	public getReviewResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { taskId } = req.params as any
			const result = await prReviewService.getReviewResult(taskId)
			if (!result) {
				res.status(404).json({ success: false, error: "Result not found" })
				return
			}
			res.json({ success: true, data: result })
		} catch (error) {
			logger.error("Error fetching review result:", error)
			next(error)
		}
	}
}

export const codeReviewController = new CodeReviewController()
