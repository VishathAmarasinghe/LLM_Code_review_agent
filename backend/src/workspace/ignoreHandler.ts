import { WorkspaceContext } from "./types"
import * as path from "path"

export class IgnoreHandler {
	private workspaceContext: WorkspaceContext
	private ignorePatterns: string[] = []

	constructor(workspaceContext: WorkspaceContext) {
		this.workspaceContext = workspaceContext
	}

	/**
	 * Initialize ignore patterns from workspace context
	 */
	public async initialize(): Promise<void> {
		// Load ignore patterns from workspace context
		this.ignorePatterns = this.workspaceContext.ignorePatterns || []

		// Add default ignore patterns for GitHub workspaces
		this.addDefaultIgnorePatterns()
	}

	/**
	 * Add default ignore patterns for GitHub workspaces
	 */
	private addDefaultIgnorePatterns(): void {
		const defaultPatterns = [
			"node_modules/**",
			".git/**",
			"build/**",
			"target/**",
			"*.log",
			"*.tmp",
			".DS_Store",
			"Thumbs.db",
			"*.swp",
			"*.swo",
			"*~",
			".vscode/**",
			".idea/**",
			"*.pyc",
			"__pycache__/**",
			".pytest_cache/**",
			"coverage/**",
			".nyc_output/**",
			"*.min.js",
			"*.min.css",
			"*.bundle.js",
			"*.chunk.js",
		]

		this.ignorePatterns.push(...defaultPatterns)
	}

	/**
	 * Check if a file should be ignored
	 */
	public shouldIgnore(filePath: string): { ignored: boolean; reason?: string } {
		const relativePath = this.getRelativePath(filePath)

		for (const pattern of this.ignorePatterns) {
			if (this.matchesPattern(relativePath, pattern)) {
				return {
					ignored: true,
					reason: `File matches ignore pattern: ${pattern}`,
				}
			}
		}

		return { ignored: false }
	}

	/**
	 * Get relative path from workspace root
	 */
	private getRelativePath(filePath: string): string {
		return filePath.startsWith("/") ? filePath.substring(1) : filePath
	}

	/**
	 * Check if a file path matches an ignore pattern
	 */
	private matchesPattern(filePath: string, pattern: string): boolean {
		// Convert pattern to regex
		const regexPattern = this.patternToRegex(pattern)
		const regex = new RegExp(regexPattern)

		return regex.test(filePath)
	}

	/**
	 * Convert glob pattern to regex
	 */
	private patternToRegex(pattern: string): string {
		// Escape special regex characters except * and ?
		let regex = pattern
			.replace(/[.+^${}()|[\]\\]/g, "\\$&")
			.replace(/\*/g, ".*")
			.replace(/\?/g, ".")

		// Handle ** pattern (match any number of directories)
		regex = regex.replace(/\.\*\.\*/g, ".*")

		// Anchor to start of string
		if (!regex.startsWith("^")) {
			regex = "^" + regex
		}

		// Anchor to end of string if pattern doesn't end with **
		if (!pattern.endsWith("**") && !regex.endsWith("$")) {
			regex = regex + "$"
		}

		return regex
	}

	/**
	 * Filter a list of file paths based on ignore patterns
	 */
	public filterPaths(filePaths: string[]): string[] {
		return filePaths.filter((filePath) => {
			const result = this.shouldIgnore(filePath)
			return !result.ignored
		})
	}

	/**
	 * Add a custom ignore pattern
	 */
	public addIgnorePattern(pattern: string): void {
		if (!this.ignorePatterns.includes(pattern)) {
			this.ignorePatterns.push(pattern)
		}
	}

	/**
	 * Remove an ignore pattern
	 */
	public removeIgnorePattern(pattern: string): void {
		const index = this.ignorePatterns.indexOf(pattern)
		if (index > -1) {
			this.ignorePatterns.splice(index, 1)
		}
	}

	/**
	 * Get all ignore patterns
	 */
	public getIgnorePatterns(): string[] {
		return [...this.ignorePatterns]
	}

	/**
	 * Clear all ignore patterns
	 */
	public clearIgnorePatterns(): void {
		this.ignorePatterns = []
	}
}
