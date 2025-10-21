import { logger } from "../utils/logger"
import { SuggestionCollector, CodeSuggestion } from "./suggestionCollector"
import { LLMManager } from "../llm/llmManager"

export interface FinalizedSuggestion {
	id: string
	comment: string
	suggestion: string
	severity: "critical" | "high" | "medium" | "low"
	category: string
}

export interface FinalizationResponse {
	finalizedSuggestions: FinalizedSuggestion[]
}

export class SuggestionProcessor {
	private static instance: SuggestionProcessor
	private suggestionCollector: SuggestionCollector
	private llmManager: LLMManager

	private constructor() {
		this.suggestionCollector = SuggestionCollector.getInstance()
		this.llmManager = LLMManager.getInstance()
	}

	public static getInstance(): SuggestionProcessor {
		if (!SuggestionProcessor.instance) {
			SuggestionProcessor.instance = new SuggestionProcessor()
		}
		return SuggestionProcessor.instance
	}

	/**
	 * Process LLM response and extract suggestions
	 */
	public async processResponse(
		responseText: string,
		prNumber: number,
		repository: string,
	): Promise<{ collectionId: string; extractedCount: number }> {
		// Create or get collection for this PR
		const collectionId = this.suggestionCollector.createCollection(prNumber, repository)

		// Extract suggestions from response
		const extractedIds = this.extractSuggestionsFromResponse(responseText, collectionId)

		logger.info(`Processed response for PR #${prNumber}, extracted ${extractedIds.length} suggestions`)

		return {
			collectionId,
			extractedCount: extractedIds.length,
		}
	}

	/**
	 * Extract suggestions from LLM response text
	 */
	private extractSuggestionsFromResponse(responseText: string, collectionId: string): string[] {
		const suggestionIds: string[] = []

		// Look for collectible suggestions with [Code Smell], [Anti-Pattern], [Refactor] tags
		const collectibleRegex = /\[(Code Smell|Anti-Pattern|Refactor)\]\s*([\s\S]*?)(?=\[|$)/gi

		let match
		while ((match = collectibleRegex.exec(responseText)) !== null) {
			const type = match[1]?.toLowerCase().replace(" ", "_") as "code_smell" | "anti_pattern" | "refactor"
			const content = match[2]?.trim() || ""

			// Extract file and line information
			const fileMatch = content.match(/\*\*File\*\*:\s*`([^`]+)`/i)
			const lineMatch = content.match(/\*\*Lines\*\*:\s*(\d+)(?:-(\d+))?/i)
			const issueMatch = content.match(/\*\*Issue\*\*:\s*([^\n]+)/i)
			const solutionMatch = content.match(/\*\*Solution\*\*:\s*([^\n]+)/i)

			// Extract suggestion code block
			const suggestionMatch = content.match(/```suggestion\n([\s\S]*?)\n```/i)

			if (fileMatch && lineMatch && suggestionMatch && type) {
				const file = fileMatch[1] || ""
				const startLine = parseInt(lineMatch[1] || "1", 10)
				const endLine = lineMatch[2] ? parseInt(lineMatch[2], 10) : startLine
				const issue = issueMatch?.[1] || "Code improvement needed"
				const solution = solutionMatch?.[1] || "Apply suggested changes"
				const newCode = suggestionMatch[1]?.trim() || ""

				// Try to extract old code from context
				const oldCodeMatch = content.match(/```[\s\S]*?\n([\s\S]*?)\n```/i)
				const oldCode = oldCodeMatch?.[1]?.trim() || "// Original code to be replaced"

				const suggestionId = this.suggestionCollector.addSuggestion(collectionId, {
					type,
					category: this.categorizeSuggestion(type, issue),
					file,
					startLine,
					endLine,
					oldCode,
					newCode,
					description: `${issue}. ${solution}`,
					severity: this.assessSeverity(type, issue),
				})

				suggestionIds.push(suggestionId)
			}
		}

		return suggestionIds
	}

	/**
	 * Categorize suggestion based on type and issue
	 */
	private categorizeSuggestion(type: string, issue: string): string {
		const issueLower = issue.toLowerCase()

		if (issueLower.includes("long method") || issueLower.includes("function")) {
			return "Long Method"
		}
		if (issueLower.includes("magic number") || issueLower.includes("hardcoded")) {
			return "Magic Numbers"
		}
		if (issueLower.includes("global variable")) {
			return "Global Variables"
		}
		if (issueLower.includes("mutable") || issueLower.includes("shared state")) {
			return "Mutable Shared State"
		}
		if (issueLower.includes("complex") || issueLower.includes("nested")) {
			return "Complex Functions"
		}
		if (issueLower.includes("error handling") || issueLower.includes("async")) {
			return "Missing Error Handling"
		}
		if (issueLower.includes("duplicate")) {
			return "Duplicate Code"
		}

		return "Code Improvement"
	}

	/**
	 * Assess severity based on type and issue
	 */
	private assessSeverity(type: string, issue: string): "critical" | "high" | "medium" | "low" {
		const issueLower = issue.toLowerCase()

		if (issueLower.includes("security") || issueLower.includes("vulnerability")) {
			return "critical"
		}
		if (issueLower.includes("error handling") || issueLower.includes("crash")) {
			return "high"
		}
		if (issueLower.includes("performance") || issueLower.includes("memory")) {
			return "high"
		}
		if (issueLower.includes("long method") || issueLower.includes("complex")) {
			return "medium"
		}

		return "medium"
	}

	/**
	 * Finalize suggestions by sending them back to LLM
	 */
	public async finalizeSuggestions(collectionId: string): Promise<FinalizedSuggestion[]> {
		const collection = this.suggestionCollector.getCollection(collectionId)
		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`)
		}

		if (collection.suggestions.length === 0) {
			logger.info(`No suggestions to finalize for collection ${collectionId}`)
			return []
		}

		// Generate finalization prompt
		const finalizationPrompt = this.suggestionCollector.generateFinalizationPrompt(collectionId)

		try {
			// Send to LLM for finalization
			const contextId = this.llmManager.createConversationContext(
				"/tmp",
				1,
				1,
				`Suggestion finalization for PR #${collection.prNumber}`,
			)

			const response = await this.llmManager.processMessage(finalizationPrompt, contextId)

			// Parse the JSON response
			const jsonMatch = response.response.match(/```json\n([\s\S]*?)\n```/i)
			if (!jsonMatch || !jsonMatch[1]) {
				throw new Error("No JSON response found in LLM finalization")
			}

			const finalizationResponse: FinalizationResponse = JSON.parse(jsonMatch[1])

			logger.info(`Finalized ${finalizationResponse.finalizedSuggestions.length} suggestions`)

			return finalizationResponse.finalizedSuggestions
		} catch (error) {
			logger.error("Error finalizing suggestions:", error)
			// Fallback: return basic finalized suggestions
			return collection.suggestions.map((suggestion) => ({
				id: suggestion.id,
				comment: this.generateFallbackComment(suggestion),
				suggestion: suggestion.newCode,
				severity: suggestion.severity,
				category: suggestion.category,
			}))
		}
	}

	/**
	 * Generate fallback comment if LLM finalization fails
	 */
	private generateFallbackComment(suggestion: CodeSuggestion): string {
		return `## 🚨 ${suggestion.category} Detected

**File**: \`${suggestion.file}\`
**Lines**: ${suggestion.startLine}-${suggestion.endLine}

**Issue**: ${suggestion.description}

**Solution**: Apply the suggested changes below:

\`\`\`suggestion
${suggestion.newCode}
\`\`\`

**Severity**: ${suggestion.severity}
**Category**: ${suggestion.category}`
	}

	/**
	 * Get suggestions ready for GitHub posting
	 */
	public async getSuggestionsForPosting(collectionId: string): Promise<FinalizedSuggestion[]> {
		return await this.finalizeSuggestions(collectionId)
	}

	/**
	 * Clear collection after posting
	 */
	public clearCollection(collectionId: string): void {
		this.suggestionCollector.clearCollection(collectionId)
	}
}
