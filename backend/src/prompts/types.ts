export interface ToolArgs {
	cwd: string
	supportsComputerUse: boolean
	diffStrategy?: any
	browserViewportSize?: string
	mcpHub?: any
	toolOptions?: any
	partialReadsEnabled?: boolean
	settings?: Record<string, any>
	experiments?: Record<string, boolean>
	codeIndexManager?: any
}

export interface PromptSettings {
	includeToolDescriptions: boolean
	includeUsageRules: boolean
	includeCapabilities: boolean
	includeSystemInfo: boolean
	customInstructions?: string
	maxTokens?: number
	temperature?: number
	partialReadsEnabled?: boolean
	maxConcurrentFileReads?: number
	todoListEnabled?: boolean
	useAgentRules?: boolean
}

export interface ContextInjectionOptions {
	includeWorkspaceInfo: boolean
	includeRepositoryInfo: boolean
	includeUserInfo: boolean
	includeEnvironmentDetails: boolean
	includeRecentChanges: boolean
	includeCodebaseStats: boolean
}

export interface ResponseFormattingOptions {
	includeLineNumbers: boolean
	includeFilePaths: boolean
	includeCodeBlocks: boolean
	includeMarkdownLinks: boolean
	maxResponseLength: number
	includeToolResults: boolean
}
