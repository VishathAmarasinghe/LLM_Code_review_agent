export interface FeatureFlags {
	// Tool availability flags
	readFileEnabled: boolean
	searchFilesEnabled: boolean
	codebaseSearchEnabled: boolean
	listFilesEnabled: boolean
	listCodeDefinitionNamesEnabled: boolean

	// Advanced features
	partialReadsEnabled: boolean
	multipleFileReadsEnabled: boolean
	recursiveFileListingEnabled: boolean
	semanticSearchEnabled: boolean

	// Security features
	securityValidationEnabled: boolean
	ignorePatternsEnabled: boolean
	pathValidationEnabled: boolean

	// Performance features
	cachingEnabled: boolean
	rateLimitingEnabled: boolean
	batchProcessingEnabled: boolean
}

export interface ToolLimits {
	// Rate limiting
	maxRequestsPerMinute: number
	maxRequestsPerHour: number
	maxConcurrentRequests: number

	// Resource constraints
	maxFileSize: number
	maxFilesPerRequest: number
	maxSearchResults: number
	maxDirectoryDepth: number

	// Memory limits
	maxCacheSize: number
	maxMemoryUsage: number

	// Timeout limits
	requestTimeout: number
	toolExecutionTimeout: number
	cacheTimeout: number
}

export interface EnvironmentDependencies {
	// Required tools
	ripgrep: {
		available: boolean
		version?: string
		path?: string
	}
	node: {
		available: boolean
		version?: string
		path?: string
	}
	git: {
		available: boolean
		version?: string
		path?: string
	}

	// Optional tools
	fzf?: {
		available: boolean
		version?: string
		path?: string
	}

	// System requirements
	minMemoryGB: number
	minDiskSpaceGB: number
	supportedOS: string[]
}

export interface IndexingStatus {
	enabled: boolean
	configured: boolean
	initialized: boolean
	state: "Standby" | "Indexing" | "Indexed" | "Error"
	progress: number
	totalFiles: number
	indexedFiles: number
	lastIndexed?: Date
	error?: string
}

export interface AgentConfiguration {
	featureFlags: FeatureFlags
	toolLimits: ToolLimits
	environmentDependencies: EnvironmentDependencies
	indexingStatus: IndexingStatus

	// Global settings
	debugMode: boolean
	logLevel: "error" | "warn" | "info" | "debug"
	telemetryEnabled: boolean

	// Workspace settings
	defaultWorkspacePath: string
	maxWorkspaces: number
	workspaceTimeout: number
}

export interface ToolRequirement {
	toolName: string
	required: boolean
	reason?: string
	alternatives?: string[]
}

export interface ToolGroup {
	name: string
	tools: string[]
	description: string
	alwaysAvailable?: boolean
}

export interface ModeConfiguration {
	name: string
	description: string
	toolGroups: string[]
	toolRequirements: Record<string, boolean>
	customInstructions?: string
	maxTokens?: number
	temperature?: number
}

export interface ConfigurationValidation {
	isValid: boolean
	errors: string[]
	warnings: string[]
	missingDependencies: string[]
	recommendations: string[]
}
