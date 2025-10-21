import { logger } from "../utils/logger"
import { SuggestionCollector } from "./suggestionCollector"
import { SuggestionProcessor, FinalizedSuggestion } from "./suggestionProcessor"
import { PullRequestService } from "./pullRequestService"

export interface SuggestionWorkflowResult {
	success: boolean
	collectionId: string
	extractedCount: number
	finalizedCount: number
	postedCount: number
	errors: string[]
}

export class SuggestionWorkflowService {
	private static instance: SuggestionWorkflowService
	private suggestionCollector: SuggestionCollector
	private suggestionProcessor: SuggestionProcessor
	private pullRequestService: PullRequestService

	private constructor() {
		this.suggestionCollector = SuggestionCollector.getInstance()
		this.suggestionProcessor = SuggestionProcessor.getInstance()
		this.pullRequestService = new PullRequestService()
	}

	public static getInstance(): SuggestionWorkflowService {
		if (!SuggestionWorkflowService.instance) {
			SuggestionWorkflowService.instance = new SuggestionWorkflowService()
		}
		return SuggestionWorkflowService.instance
	}

	/**
	 * Process LLM response and extract suggestions (Step 1)
	 */
	public async processResponse(
		responseText: string,
		prNumber: number,
		repository: string,
	): Promise<{ collectionId: string; extractedCount: number }> {
		logger.info(`Processing response for PR #${prNumber} in ${repository}`)

		const result = await this.suggestionProcessor.processResponse(responseText, prNumber, repository)

		logger.info(`Extracted ${result.extractedCount} suggestions for PR #${prNumber}`)
		return result
	}

	/**
	 * Finalize suggestions by sending them back to LLM (Step 2)
	 */
	public async finalizeSuggestions(collectionId: string): Promise<FinalizedSuggestion[]> {
		logger.info(`Finalizing suggestions for collection ${collectionId}`)

		const finalizedSuggestions = await this.suggestionProcessor.finalizeSuggestions(collectionId)

		logger.info(`Finalized ${finalizedSuggestions.length} suggestions`)
		return finalizedSuggestions
	}

	/**
	 * Post finalized suggestions as GitHub comments (Step 3)
	 */
	public async postSuggestionsAsComments(
		accessToken: string,
		owner: string,
		repo: string,
		pullNumber: number,
		finalizedSuggestions: FinalizedSuggestion[],
	): Promise<{ postedCount: number; errors: string[] }> {
		logger.info(`Posting ${finalizedSuggestions.length} suggestions as GitHub comments`)

		const errors: string[] = []
		let postedCount = 0

		// Group suggestions by file for batch processing
		const suggestionsByFile = this.groupSuggestionsByFile(finalizedSuggestions)

		for (const [filePath, suggestions] of Object.entries(suggestionsByFile)) {
			try {
				const comments = suggestions.map((suggestion) => ({
					body: suggestion.comment,
					path: filePath,
					line: this.extractLineNumber(suggestion.comment),
					side: "RIGHT" as const,
				}))

				const results = await this.pullRequestService.createMultipleReviewComments(
					accessToken,
					owner,
					repo,
					pullNumber,
					comments,
				)

				postedCount += results.length
				logger.info(`Posted ${results.length} comments for file ${filePath}`)
			} catch (error) {
				const errorMessage = `Failed to post comments for file ${filePath}: ${error}`
				errors.push(errorMessage)
				logger.error(errorMessage)
			}
		}

		logger.info(`Posted ${postedCount}/${finalizedSuggestions.length} suggestions as comments`)
		return { postedCount, errors }
	}

	/**
	 * Complete workflow: Process response, finalize suggestions, and post comments
	 */
	public async executeCompleteWorkflow(
		responseText: string,
		prNumber: number,
		repository: string,
		accessToken: string,
		owner: string,
		repo: string,
	): Promise<SuggestionWorkflowResult> {
		const errors: string[] = []

		try {
			// Step 1: Process response and extract suggestions
			const { collectionId, extractedCount } = await this.processResponse(responseText, prNumber, repository)

			if (extractedCount === 0) {
				logger.info(`No suggestions extracted for PR #${prNumber}`)
				return {
					success: true,
					collectionId,
					extractedCount: 0,
					finalizedCount: 0,
					postedCount: 0,
					errors: [],
				}
			}

			// Step 2: Finalize suggestions
			const finalizedSuggestions = await this.finalizeSuggestions(collectionId)
			const finalizedCount = finalizedSuggestions.length

			if (finalizedCount === 0) {
				logger.warn(`No suggestions finalized for PR #${prNumber}`)
				return {
					success: true,
					collectionId,
					extractedCount,
					finalizedCount: 0,
					postedCount: 0,
					errors: ["No suggestions were finalized"],
				}
			}

			// Step 3: Post suggestions as GitHub comments
			const { postedCount, errors: postErrors } = await this.postSuggestionsAsComments(
				accessToken,
				owner,
				repo,
				prNumber,
				finalizedSuggestions,
			)

			errors.push(...postErrors)

			// Step 4: Clean up collection
			this.suggestionCollector.clearCollection(collectionId)

			const success = errors.length === 0

			logger.info(`Completed suggestion workflow for PR #${prNumber}: ${postedCount} comments posted`)

			return {
				success,
				collectionId,
				extractedCount,
				finalizedCount,
				postedCount,
				errors,
			}
		} catch (error) {
			const errorMessage = `Suggestion workflow failed for PR #${prNumber}: ${error}`
			errors.push(errorMessage)
			logger.error(errorMessage)

			return {
				success: false,
				collectionId: "",
				extractedCount: 0,
				finalizedCount: 0,
				postedCount: 0,
				errors,
			}
		}
	}

	/**
	 * Group suggestions by file path
	 */
	private groupSuggestionsByFile(suggestions: FinalizedSuggestion[]): Record<string, FinalizedSuggestion[]> {
		const grouped: Record<string, FinalizedSuggestion[]> = {}

		for (const suggestion of suggestions) {
			// Extract file path from comment (assuming format: **File**: `path`)
			const fileMatch = suggestion.comment.match(/\*\*File\*\*:\s*`([^`]+)`/i)
			if (fileMatch) {
				const filePath = fileMatch[1]
				if (!grouped[filePath]) {
					grouped[filePath] = []
				}
				grouped[filePath].push(suggestion)
			}
		}

		return grouped
	}

	/**
	 * Extract line number from comment (assuming format: **Lines**: 19-27 or **Line**: 42)
	 */
	private extractLineNumber(comment: string): number {
		const lineMatch = comment.match(/\*\*Lines?\*\*:\s*(\d+)(?:-(\d+))?/i)
		if (lineMatch) {
			return parseInt(lineMatch[1], 10)
		}

		// Fallback: try to extract from file path format
		const fileLineMatch = comment.match(/`([^`]+):(\d+)`/i)
		if (fileLineMatch) {
			return parseInt(fileLineMatch[2], 10)
		}

		// Default fallback
		return 1
	}

	/**
	 * Get workflow status for a collection
	 */
	public getWorkflowStatus(collectionId: string): {
		collectionId: string
		suggestionCount: number
		isActive: boolean
	} {
		const collection = this.suggestionCollector.getCollection(collectionId)

		return {
			collectionId,
			suggestionCount: collection?.suggestions.length || 0,
			isActive: !!collection,
		}
	}

	/**
	 * Get all active workflows
	 */
	public getActiveWorkflows(): Array<{
		collectionId: string
		prNumber: number
		repository: string
		suggestionCount: number
		createdAt: Date
	}> {
		const collections = this.suggestionCollector.getActiveCollections()

		return collections.map((collection) => ({
			collectionId: collection.id,
			prNumber: collection.prNumber,
			repository: collection.repository,
			suggestionCount: collection.suggestions.length,
			createdAt: collection.createdAt,
		}))
	}
}
