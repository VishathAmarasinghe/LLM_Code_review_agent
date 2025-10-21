export interface OpenAIMessage {
	role: "system" | "user" | "assistant" | "tool"
	content: string | null
	tool_calls?: OpenAIToolCall[]
	tool_call_id?: string
	name?: string
}

export interface OpenAIToolCall {
	id: string
	type: "function"
	function: {
		name: string
		arguments: string
	}
}

export interface OpenAITool {
	type: "function"
	function: {
		name: string
		description: string
		parameters: {
			type: "object"
			properties: Record<string, any>
			required: string[]
		}
	}
}

export interface ConversationContext {
	messages: OpenAIMessage[]
	toolCallHistory: ToolCallRecord[]
	currentTask?: string
	repositoryId?: number
	userId?: number
	workspacePath: string
	workspaceManager?: any
	accessToken?: string
	createdAt: Date
	updatedAt: Date
}

export interface ToolCallRecord {
	id: string
	toolName: string
	parameters: Record<string, any>
	result?: any
	error?: string
	timestamp: Date
	executionTimeMs: number
}

export interface SystemPromptSettings {
	includeToolDescriptions: boolean
	includeUsageRules: boolean
	includeCapabilities: boolean
	includeSystemInfo: boolean
	customInstructions?: string
	maxTokens?: number
	temperature?: number
}

export interface LLMConfiguration {
	apiKey: string
	baseURL?: string
	model: string
	temperature?: number
	maxTokens?: number
	timeout?: number
}

export interface ToolExecutionRequest {
	toolName: string
	parameters: Record<string, any>
	context: ConversationContext
}

export interface ToolExecutionResponse {
	success: boolean
	result?: any
	error?: string
	executionTimeMs: number
}

export interface ConversationState {
	context: ConversationContext
	isActive: boolean
	lastActivity: Date
	totalTokens: number
	totalToolCalls: number
}
