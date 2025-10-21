// Indexing Types

export interface IndexingJob {
	id: number
	repositoryId: number
	userId: number
	status: "pending" | "running" | "completed" | "failed" | "cancelled"
	progress: number
	stage: "initializing" | "scanning" | "parsing" | "embedding" | "storing" | "completed"
	message?: string
	error?: string
	totalFiles: number
	processedFiles: number
	indexedBlocks: number
	totalBlocks: number
	startedAt: Date
	completedAt?: Date
	createdAt: Date
	updatedAt: Date
	repository?: Repository
}

export interface Repository {
	id: number
	name: string
	fullName: string
	ownerLogin: string // GitHub owner/org login
	description?: string
	language?: string
	cloneUrl: string
	htmlUrl: string
	isPrivate: boolean
	size: number
	defaultBranch: string
	createdAt: Date
	updatedAt: Date
	userId: number
}

export interface IndexingProgress {
	jobId: number
	status: "pending" | "running" | "completed" | "failed" | "cancelled"
	progress: number
	processedFiles: number
	totalFiles: number
	indexedBlocks: number
	totalBlocks: number
	stage: "initializing" | "scanning" | "parsing" | "embedding" | "storing" | "completed"
	message?: string
	error?: string
	currentFile?: string
}

export interface IndexingConfiguration {
	id: number
	userId: number
	openaiApiKey: string
	qdrantUrl: string
	qdrantApiKey?: string
	embeddingModel: string
	maxFileSize: number
	batchSize: number
	maxConcurrentJobs: number
	isEnabled: boolean
	createdAt: Date
	updatedAt: Date
}

export interface SearchResult {
	id: string
	filePath: string
	content: string
	startLine: number
	endLine: number
	blockType: string
	identifier?: string | null
	score: number
	repositoryId: number
	repositoryName: string
}

export interface IndexingJobOptions {
	maxFileSize?: number
	batchSize?: number
	includePatterns?: string[]
	excludePatterns?: string[]
	enableSecurityScanning?: boolean
	enablePerformanceAnalysis?: boolean
	enableCrossFileAnalysis?: boolean
	isReindexing?: boolean
}

export interface IndexingStats {
	totalJobs: number
	completedJobs: number
	runningJobs: number
	failedJobs: number
	totalFilesIndexed: number
	totalBlocksIndexed: number
	averageIndexingTime: number
	lastIndexedAt?: Date
}

export interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
	message?: string
}

export interface PaginatedResponse<T> {
	data: T[]
	pagination: {
		page: number
		limit: number
		total: number
		totalPages: number
	}
}
