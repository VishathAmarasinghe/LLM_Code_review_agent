// Core interfaces matching RooCode exactly

export interface CodeBlock {
	file_path: string
	identifier: string | null
	type: string
	start_line: number
	end_line: number
	content: string
	fileHash: string
	segmentHash: string
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

export interface VectorStoreSearchResult {
	id: string
	score: number
	payload: {
		file_path: string
		content: string
		start_line: number
		end_line: number
		block_type: string
		identifier?: string | null
		repository_id: number
		repository_name: string
	}
}

// Embedder interface matching RooCode exactly
export interface IEmbedder {
	createEmbeddings(texts: string[], model?: string): Promise<EmbeddingResponse>
	validateConfiguration(): Promise<{ valid: boolean; error?: string }>
	get embedderInfo(): EmbedderInfo
}

export interface EmbeddingResponse {
	embeddings: number[][]
	usage?: {
		promptTokens: number
		totalTokens: number
	}
}

export interface EmbedderInfo {
	name: string
}

// Vector store interface matching RooCode
export interface IVectorStore {
	initialize(repositoryId: number): Promise<boolean>
	upsertPoints(points: PointStruct[]): Promise<void>
	search(
		queryVector: number[],
		repositoryId: number,
		minScore?: number,
		maxResults?: number,
	): Promise<VectorStoreSearchResult[]>
	deletePointsByRepository(repositoryId: number): Promise<void>
	clearCollection(repositoryId: number): Promise<void>
	deleteCollection(): Promise<void>
}

export interface PointStruct {
	id: string
	vector: number[]
	payload: Record<string, any>
}

// Code parser interface matching RooCode exactly
export interface ICodeParser {
	parseFile(
		filePath: string,
		options?: {
			minBlockLines?: number
			maxBlockLines?: number
			content?: string
			fileHash?: string
		},
	): Promise<CodeBlock[]>
}

// Directory scanner interface matching RooCode
export interface IDirectoryScanner {
	scanDirectory(
		directory: string,
		onError?: (error: Error) => void,
		onBlocksIndexed?: (indexedCount: number) => void,
		onFileParsed?: (fileBlockCount: number) => void,
	): Promise<{
		stats: {
			processed: number
			skipped: number
		}
		totalBlockCount: number
	}>
}

// File watcher interface (simplified for web app)
export interface IFileWatcher {
	initialize(): Promise<void>
	dispose(): void
	processFile(filePath: string): Promise<FileProcessingResult>
}

export interface FileProcessingResult {
	path: string
	status: "success" | "skipped" | "error" | "processed_for_batching" | "local_error"
	error?: Error
	reason?: string
	newHash?: string
	pointsToUpsert?: PointStruct[]
}

export interface BatchProcessingSummary {
	processedFiles: FileProcessingResult[]
	batchError?: Error
}

// State management interface
export interface IndexingState {
	state: "Standby" | "Indexing" | "Indexed" | "Error"
	message: string
	progress?: number
	processedFiles?: number
	totalFiles?: number
	indexedBlocks?: number
	totalBlocks?: number
	currentFile?: string
}

// Repository scanner interface (for GitHub integration)
export interface IRepositoryScanner {
	scanRepository(repository: any, accessToken?: string): Promise<string[]>
	filterSupportedFiles(files: string[]): string[]
	validateFileSize(fileSize: number): boolean
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
