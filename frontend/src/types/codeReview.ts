export interface CodeReviewRequest {
	code: string
	language: string
	filename?: string
	repository?: string
	branch?: string
	commitHash?: string
	reviewType?: "security" | "performance" | "style" | "comprehensive"
	customInstructions?: string
}

export interface CodeIssue {
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
}

export interface CodeMetrics {
	complexity: number
	maintainability: number
	security: number
	performance: number
}

export interface CodeAnalysis {
	summary: string
	issues: CodeIssue[]
	metrics: CodeMetrics
	suggestions: string[]
}

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
	analysis: CodeAnalysis
	createdAt: Date
	updatedAt: Date
}

export interface ReviewStats {
	totalReviews: number
	reviewsByLanguage: Record<string, number>
	reviewsByType: Record<string, number>
	averageIssuesPerReview: number
	criticalIssuesCount: number
	recentReviews: number
}

export interface PaginationOptions {
	page: number
	limit: number
	sortBy: string
	sortOrder: "asc" | "desc"
}

export interface PaginatedReviews {
	reviews: CodeReviewResponse[]
	pagination: {
		page: number
		limit: number
		total: number
		totalPages: number
	}
}

export interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
	details?: Array<{
		field: string
		message: string
	}>
}

export type SupportedLanguage =
	| "javascript"
	| "typescript"
	| "python"
	| "java"
	| "cpp"
	| "csharp"
	| "go"
	| "rust"
	| "php"
	| "ruby"
	| "swift"
	| "kotlin"
	| "scala"
	| "html"
	| "css"
	| "sql"
	| "yaml"
	| "json"
	| "markdown"
	| "dockerfile"
	| "shell"

export type ReviewType = "security" | "performance" | "style" | "comprehensive"
export type IssueType = "error" | "warning" | "suggestion" | "security"
export type Severity = "low" | "medium" | "high" | "critical"
