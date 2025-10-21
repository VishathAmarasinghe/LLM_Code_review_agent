export type ToolName =
	| "search_files"
	| "codebase_search"
	| "read_file"
	| "list_files"
	| "list_code_definition_names"
	| "analyze_architecture"
	| "identify_risks"
	| "strategic_analysis"
	| "pattern_recognition"

export type ToolParamName =
	| "path"
	| "regex"
	| "file_pattern"
	| "query"
	| "line_range"
	| "recursive"
	| "limit"
	| "analysis_focus"
	| "current_understanding"
	| "potential_issues"
	| "next_investigation"
	| "reasoning"
	| "component_type"
	| "patterns_found"
	| "strategic_question"
	| "analysis_stage"

export interface ToolUse {
	type: "tool_use"
	name: ToolName
	params: Partial<Record<ToolParamName, string>>
	partial: boolean
}

export type ToolResponse = string | object

export type AskApproval = (type: string, message: string, partial?: boolean) => Promise<boolean>

export type HandleError = (action: string, error: Error) => Promise<void>

export type PushToolResult = (content: ToolResponse) => void

export type RemoveClosingTag = (tag: ToolParamName, content?: string) => string

export interface ToolHandler {
	name: ToolName
	handler: (
		cwd: string,
		block: ToolUse,
		pushToolResult: PushToolResult,
		handleError: HandleError,
		repositoryId?: number,
		userId?: number,
		workspaceManager?: any,
		accessToken?: string,
	) => Promise<void>
	description: string
	parameters: ToolParameter[]
}

export interface ToolParameter {
	name: ToolParamName
	type: "string" | "number" | "boolean"
	required: boolean
	description: string
}

export interface ToolExecutionContext {
	cwd: string
	repositoryId?: number
	userId?: number
	pushToolResult: PushToolResult
	handleError: HandleError
	askApproval?: AskApproval
	removeClosingTag?: RemoveClosingTag
	workspaceManager?: any
	accessToken?: string
}

export interface ToolExecutionResult {
	success: boolean
	result?: ToolResponse
	error?: string
	toolName: ToolName
}
