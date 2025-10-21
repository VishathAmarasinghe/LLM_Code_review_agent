import { logger } from "../utils/logger"

export interface CodeSuggestion {
	id: string
	type: "code_smell" | "anti_pattern" | "refactor" | "improvement"
	category: string
	file: string
	startLine: number
	endLine: number
	oldCode: string
	newCode: string
	description: string
	severity: "critical" | "high" | "medium" | "low"
	timestamp: Date
}

export interface SuggestionCollection {
	id: string
	prNumber: number
	repository: string
	suggestions: CodeSuggestion[]
	createdAt: Date
	updatedAt: Date
}

export class SuggestionCollector {
	private static instance: SuggestionCollector
	private collections: Map<string, SuggestionCollection> = new Map()

	private constructor() {}

	public static getInstance(): SuggestionCollector {
		if (!SuggestionCollector.instance) {
			SuggestionCollector.instance = new SuggestionCollector()
		}
		return SuggestionCollector.instance
	}

	/**
	 * Create a new suggestion collection for a PR
	 */
	public createCollection(prNumber: number, repository: string): string {
		const collectionId = `pr-${repository}-${prNumber}`

		const collection: SuggestionCollection = {
			id: collectionId,
			prNumber,
			repository,
			suggestions: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		this.collections.set(collectionId, collection)
		logger.info(`Created suggestion collection for PR #${prNumber} in ${repository}`)

		return collectionId
	}

	/**
	 * Add a suggestion to a collection
	 */
	public addSuggestion(collectionId: string, suggestion: Omit<CodeSuggestion, "id" | "timestamp">): string {
		const collection = this.collections.get(collectionId)
		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`)
		}

		const suggestionId = `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
		const fullSuggestion: CodeSuggestion = {
			...suggestion,
			id: suggestionId,
			timestamp: new Date(),
		}

		collection.suggestions.push(fullSuggestion)
		collection.updatedAt = new Date()

		logger.info(`Added suggestion ${suggestionId} to collection ${collectionId}`)
		return suggestionId
	}

	/**
	 * Get all suggestions for a collection
	 */
	public getSuggestions(collectionId: string): CodeSuggestion[] {
		const collection = this.collections.get(collectionId)
		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`)
		}

		return collection.suggestions
	}

	/**
	 * Get collection by ID
	 */
	public getCollection(collectionId: string): SuggestionCollection | undefined {
		return this.collections.get(collectionId)
	}

	/**
	 * Extract suggestions from LLM response text
	 */
	public extractSuggestionsFromResponse(responseText: string, collectionId: string): string[] {
		const suggestionIds: string[] = []

		// Look for suggestion blocks in the response
		const suggestionRegex = /```suggestion\n([\s\S]*?)\n```/g
		const fileLineRegex = /\[Code Smell\]|\[Anti-Pattern\]|\[Refactor\]/gi

		let match
		while ((match = suggestionRegex.exec(responseText)) !== null) {
			const suggestionCode = match[1].trim()

			// Try to extract file and line information from context
			const contextBefore = responseText.substring(0, match.index)
			const fileMatch = contextBefore.match(/(?:File|file):\s*([^\s\n]+)/i)
			const lineMatch = contextBefore.match(/(?:line|Line):\s*(\d+)(?:\s*to\s*(\d+))?/i)

			if (fileMatch && lineMatch) {
				const file = fileMatch[1]
				const startLine = parseInt(lineMatch[1], 10)
				const endLine = lineMatch[2] ? parseInt(lineMatch[2], 10) : startLine

				// Extract old code from context (this is a simplified approach)
				const oldCodeMatch = contextBefore.match(/(?:❌|Bad|Before)[\s\S]*?```[\s\S]*?\n([\s\S]*?)\n```/i)
				const oldCode = oldCodeMatch ? oldCodeMatch[1].trim() : "// Original code to be replaced"

				const suggestionId = this.addSuggestion(collectionId, {
					type: "code_smell",
					category: "Code Improvement",
					file,
					startLine,
					endLine,
					oldCode,
					newCode: suggestionCode,
					description: "Code suggestion extracted from LLM response",
					severity: "medium",
				})

				suggestionIds.push(suggestionId)
			}
		}

		logger.info(`Extracted ${suggestionIds.length} suggestions from response`)
		return suggestionIds
	}

	/**
	 * Generate formatted suggestions for LLM finalization
	 */
	public generateFinalizationPrompt(collectionId: string): string {
		const collection = this.collections.get(collectionId)
		if (!collection) {
			throw new Error(`Collection not found: ${collectionId}`)
		}

		if (collection.suggestions.length === 0) {
			return "No suggestions to finalize."
		}

		let prompt = `# Code Suggestions for Finalization

The following code suggestions have been collected during the code review process. Please review and finalize them for GitHub comment posting:

## Collected Suggestions (${collection.suggestions.length} total)

`

		collection.suggestions.forEach((suggestion, index) => {
			prompt += `### Suggestion ${index + 1}
**File**: ${suggestion.file}
**Lines**: ${suggestion.startLine}-${suggestion.endLine}
**Type**: ${suggestion.type}
**Category**: ${suggestion.category}
**Severity**: ${suggestion.severity}

**Description**: ${suggestion.description}

**Current Code**:
\`\`\`
${suggestion.oldCode}
\`\`\`

**Suggested Code**:
\`\`\`
${suggestion.newCode}
\`\`\`

---

`
		})

		prompt += `
## Finalization Instructions

Please review each suggestion and provide:
1. **Finalized GitHub comment text** with proper markdown formatting
2. **Refined code suggestion** if needed
3. **Severity assessment** (Critical/High/Medium/Low)
4. **Category classification** (Long Method, Magic Numbers, etc.)

Format your response as a JSON object with the following structure:
\`\`\`json
{
  "finalizedSuggestions": [
    {
      "id": "suggestion-id",
      "comment": "GitHub comment text with markdown",
      "suggestion": "refined code suggestion",
      "severity": "high",
      "category": "Magic Numbers"
    }
  ]
}
\`\`\`
`

		return prompt
	}

	/**
	 * Clear a collection (after posting comments)
	 */
	public clearCollection(collectionId: string): void {
		this.collections.delete(collectionId)
		logger.info(`Cleared suggestion collection ${collectionId}`)
	}

	/**
	 * Get all active collections
	 */
	public getActiveCollections(): SuggestionCollection[] {
		return Array.from(this.collections.values())
	}
}
