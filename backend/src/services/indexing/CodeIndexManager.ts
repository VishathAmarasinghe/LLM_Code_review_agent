import { Repository, IndexingJob, IndexingConfiguration } from "../../models"
import { CodeIndexStateManager } from "./state-manager"
import { CodeIndexServiceFactory } from "./service-factory"
import { CodeIndexOrchestrator } from "./orchestrator"
import { IEmbedder, IVectorStore, SearchResult, IndexingJobOptions, IndexingState } from "./interfaces"
import { logger } from "../../utils/logger"

export class CodeIndexManager {
	// Singleton Implementation
	private static instances = new Map<number, CodeIndexManager>() // Map repository ID to instance

	// Specialized class instances
	private _stateManager: CodeIndexStateManager
	private _serviceFactory: CodeIndexServiceFactory | undefined
	private _orchestrator: CodeIndexOrchestrator | undefined
	private _embedder: IEmbedder | undefined
	private _vectorStore: IVectorStore | undefined

	public static getInstance(repositoryId: number): CodeIndexManager {
		if (!CodeIndexManager.instances.has(repositoryId)) {
			CodeIndexManager.instances.set(repositoryId, new CodeIndexManager(repositoryId))
		}
		return CodeIndexManager.instances.get(repositoryId)!
	}

	public static disposeAll(): void {
		for (const instance of CodeIndexManager.instances.values()) {
			instance.dispose()
		}
		CodeIndexManager.instances.clear()
	}

	private readonly repositoryId: number

	// Private constructor for singleton pattern
	private constructor(repositoryId: number) {
		this.repositoryId = repositoryId
		this._stateManager = new CodeIndexStateManager()
	}

	// Public API

	public get onProgressUpdate() {
		return this._stateManager.onProgressUpdate
	}

	private assertInitialized() {
		if (!this._orchestrator || !this._embedder || !this._vectorStore) {
			throw new Error("CodeIndexManager not initialized. Call initialize() first.")
		}
	}

	public get state(): IndexingState["state"] {
		if (!this.isFeatureEnabled) {
			return "Standby"
		}
		this.assertInitialized()
		return this._orchestrator!.state
	}

	public get isFeatureEnabled(): boolean {
		return this._serviceFactory !== undefined
	}

	public get isFeatureConfigured(): boolean {
		return this._serviceFactory !== undefined
	}

	public get isInitialized(): boolean {
		try {
			this.assertInitialized()
			return true
		} catch (error) {
			return false
		}
	}

	/**
	 * Initializes the manager with configuration and dependent services.
	 */
	public async initialize(
		config: IndexingConfiguration,
		repository: Repository,
	): Promise<{ requiresRestart: boolean }> {
		try {
			// 1. ServiceFactory Initialization
			if (!this._serviceFactory) {
				// Get fullName from the repository (handle Sequelize model instance)
				const fullName = repository.fullName || repository.dataValues?.fullName
				if (!fullName) {
					throw new Error(`Repository ${repository.id} is missing fullName property`)
				}

				// Create a local workspace path for this repository
				const workspacePath = `/tmp/repos/${fullName.replace("/", "-")}`

				this._serviceFactory = new CodeIndexServiceFactory(
					{
						openaiApiKey: config.openaiApiKey,
						qdrantUrl: config.qdrantUrl,
						qdrantApiKey: config.qdrantApiKey || "",
						embeddingModel: config.embeddingModel,
						maxFileSize: config.maxFileSize,
						batchSize: config.batchSize,
						maxConcurrentJobs: config.maxConcurrentJobs,
						isEnabled: config.isEnabled,
					},
					workspacePath,
				)
			}

			// 2. Check if feature is enabled
			if (!this.isFeatureEnabled) {
				if (this._orchestrator) {
					this._orchestrator.stopWatcher()
				}
				return { requiresRestart: false }
			}

			// 3. Determine if Core Services Need Recreation
			const needsServiceRecreation = !this._orchestrator

			if (needsServiceRecreation) {
				await this._recreateServices(repository)
			}

			return { requiresRestart: false }
		} catch (error) {
			logger.error("Failed to initialize CodeIndexManager:", error)
			throw error
		}
	}

	/**
	 * Initiates the indexing process (initial scan and starts watcher).
	 */
	public async startIndexing(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}
		this.assertInitialized()
		await this._orchestrator!.startIndexing()
	}

	/**
	 * Stops the file watcher and potentially cleans up resources.
	 */
	public stopWatcher(): void {
		if (!this.isFeatureEnabled) {
			return
		}
		if (this._orchestrator) {
			this._orchestrator.stopWatcher()
		}
	}

	/**
	 * Cleans up the manager instance.
	 */
	public dispose(): void {
		if (this._orchestrator) {
			this.stopWatcher()
		}
		this._stateManager.dispose()
	}

	/**
	 * Clears all index data by stopping the watcher, clearing the Qdrant collection,
	 * and deleting the cache file.
	 */
	public async clearIndexData(): Promise<void> {
		if (!this.isFeatureEnabled) {
			return
		}
		this.assertInitialized()
		await this._orchestrator!.clearIndexData()
	}

	public getCurrentStatus() {
		const status = this._stateManager.getCurrentStatus()
		return {
			...status,
			repositoryId: this.repositoryId,
		}
	}

	public async searchIndex(query: string): Promise<SearchResult[]> {
		if (!this.isFeatureEnabled) {
			return []
		}
		this.assertInitialized()

		try {
			// Generate query embedding
			const embeddingResponse = await this._embedder!.createEmbeddings([query])
			const queryVector = embeddingResponse.embeddings[0]

			if (!queryVector) {
				throw new Error("Failed to generate query embedding")
			}

			// Search vector store
			const results = await this._vectorStore!.search(queryVector, this.repositoryId, 0.7, 50)

			// Convert to search results with enhanced metadata
			return results.map((result) => {
				const payload = result.payload as any // Type assertion for enhanced metadata
				return {
					// Core search result data
					id: result.id,
					filePath: payload.file_path,
					content: payload.content,
					startLine: payload.start_line,
					endLine: payload.end_line,
					blockType: payload.block_type,
					identifier: payload.identifier || null,
					score: result.score,

					// Repository information
					repositoryId: payload.repository_id,
					repositoryName: payload.repository_name,
					repositoryOwner: payload.repository_owner,
					repositoryUrl: payload.repository_url,
					repositoryLanguage: payload.repository_language,
					repositoryIsPrivate: payload.repository_is_private,
					repositoryIsFork: payload.repository_is_fork,
					repositoryStars: payload.repository_stars,
					repositoryForks: payload.repository_forks,
					repositorySize: payload.repository_size,
					repositoryCreatedAt: payload.repository_created_at,
					repositoryUpdatedAt: payload.repository_updated_at,
					repositoryPushedAt: payload.repository_pushed_at,
					defaultBranch: payload.default_branch,

					// GitHub URLs
					githubFileUrl: payload.github_file_url,
					githubFileUrlWithLines: payload.github_file_url_with_lines,
					githubBlameUrl: payload.github_blame_url,
					githubHistoryUrl: payload.github_history_url,
					githubRawUrl: payload.github_raw_url,

					// File metadata
					fileExtension: payload.file_extension,
					fileDirectory: payload.file_directory,
					fileName: payload.file_name,
					fileNameWithoutExt: payload.file_name_without_ext,
					fileHash: payload.file_hash,
					segmentHash: payload.segment_hash,

					// Additional metadata
					indexedAt: payload.indexed_at,
					contentLength: payload.content_length,
					lineCount: payload.line_count,
				}
			})
		} catch (error) {
			logger.error("Error searching index:", error)
			throw error
		}
	}

	/**
	 * Clear all index data for this repository
	 */
	public async clearIndex(): Promise<void> {
		try {
			logger.info(`Clearing index for repository ${this.repositoryId}`)

			if (this._vectorStore) {
				// Clear vector store data
				await this._vectorStore.clearCollection(this.repositoryId)
				logger.info(`Cleared vector store data for repository ${this.repositoryId}`)
			}

			// Clear database records
			const { CodeBlock } = await import("../../models")
			await CodeBlock.destroy({
				where: { repositoryId: this.repositoryId },
			})
			logger.info(`Cleared database records for repository ${this.repositoryId}`)

			// Reset state
			this._stateManager.setSystemState("Standby", "Index cleared successfully")

			logger.info(`Successfully cleared index for repository ${this.repositoryId}`)
		} catch (error) {
			logger.error(`Error clearing index for repository ${this.repositoryId}:`, error)
			this._stateManager.setSystemState(
				"Error",
				`Failed to clear index: ${error instanceof Error ? error.message : "Unknown error"}`,
			)
			throw error
		}
	}

	// Private Helpers

	/**
	 * Private helper method to recreate services with current configuration.
	 */
	private async _recreateServices(repository: Repository): Promise<void> {
		// Stop watcher if it exists
		if (this._orchestrator) {
			this.stopWatcher()
		}

		// Clear existing services to ensure clean state
		this._orchestrator = undefined
		this._embedder = undefined
		this._vectorStore = undefined

		// Create services
		const fullName = repository.fullName || repository.dataValues?.fullName
		if (!fullName) {
			throw new Error(`Repository ${repository.id} is missing fullName property`)
		}
		const workspacePath = `/tmp/repos/${fullName.replace("/", "-")}`
		const services = this._serviceFactory!.createServices(fullName, workspacePath, repository)
		this._embedder = services.embedder
		this._vectorStore = services.vectorStore

		// Initialize the vector store (create collection if needed)
		const repositoryId = repository.id || repository.dataValues?.id
		if (!repositoryId) {
			throw new Error(`Repository ${repository.id} is missing id property`)
		}
		await this._vectorStore.initialize(repositoryId)

		// Validate embedder configuration before proceeding
		const validationResult = await this._serviceFactory!.validateEmbedder(this._embedder)
		if (!validationResult.valid) {
			const errorMessage = validationResult.error || "Embedder configuration validation failed"
			this._stateManager.setSystemState("Error", errorMessage)
			throw new Error(errorMessage)
		}

		// Initialize orchestrator with local workspace path
		this._orchestrator = new CodeIndexOrchestrator(
			this._stateManager,
			workspacePath,
			this._vectorStore,
			services.scanner,
		)

		// Clear any error state after successful recreation
		this._stateManager.setSystemState("Standby", "")
	}
}
