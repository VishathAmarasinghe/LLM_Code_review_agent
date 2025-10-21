import { CodeIndexStateManager, IndexingState } from "./state-manager"
import { IVectorStore, IDirectoryScanner, IFileWatcher } from "./interfaces"
import { DirectoryScanner } from "./processors/DirectoryScanner"
import { logger } from "../../utils/logger"

/**
 * Manages the code indexing workflow, coordinating between different services and managers.
 */
export class CodeIndexOrchestrator {
	private _isProcessing: boolean = false

	constructor(
		private readonly stateManager: CodeIndexStateManager,
		private readonly workspacePath: string,
		private readonly vectorStore: IVectorStore,
		private readonly scanner: IDirectoryScanner,
		private readonly fileWatcher?: IFileWatcher,
	) {}

	/**
	 * Initiates the indexing process (initial scan and starts watcher).
	 */
	public async startIndexing(): Promise<void> {
		if (this._isProcessing) {
			logger.warn(`Start rejected: Already processing.`)
			return
		}

		// Allow indexing to proceed even if state is not Standby
		// This handles cases where previous indexing completed but state wasn't reset properly
		if (this.stateManager.state === "Indexed") {
			logger.info(`Repository was previously indexed, starting fresh indexing process.`)
			// Reset state to allow new indexing
			this.stateManager.setSystemState("Standby", "Preparing for new indexing...")
		} else if (this.stateManager.state !== "Standby") {
			logger.info(`Current state is ${this.stateManager.state}, resetting to Standby and proceeding.`)
			this.stateManager.setSystemState("Standby", "Resetting state for new indexing...")
		}

		this._isProcessing = true
		this.stateManager.setSystemState("Indexing", "Initializing services...")

		logger.info(`Starting indexing process. Workspace path: ${this.workspacePath}`)

		try {
			logger.info(`Initializing vector store...`)
			const collectionCreated = await this.vectorStore.initialize(0) // Use 0 as default repository ID
			logger.info(`Vector store initialized. Collection created: ${collectionCreated}`)

			if (collectionCreated) {
				// Clear existing data if collection was created
				logger.info(`Clearing existing collection data...`)
				await this.vectorStore.clearCollection(0)
			}

			this.stateManager.setSystemState("Indexing", "Services ready. Starting workspace scan...")
			logger.info(`Starting workspace scan at: ${this.workspacePath}`)

			let cumulativeBlocksIndexed = 0
			let cumulativeBlocksFoundSoFar = 0
			let batchErrors: Error[] = []

			const handleFileParsed = (fileBlockCount: number) => {
				cumulativeBlocksFoundSoFar += fileBlockCount
				this.stateManager.reportBlockIndexingProgress(cumulativeBlocksIndexed, cumulativeBlocksFoundSoFar)
			}

			const handleBlocksIndexed = (indexedCount: number) => {
				cumulativeBlocksIndexed += indexedCount
				this.stateManager.reportBlockIndexingProgress(cumulativeBlocksIndexed, cumulativeBlocksFoundSoFar)
			}

			logger.info(`Calling scanner.scanDirectory with workspace path: ${this.workspacePath}`)
			const result = await this.scanner.scanDirectory(
				this.workspacePath,
				(batchError: Error) => {
					logger.error(`Error during initial scan batch: ${batchError.message}`, batchError)
					batchErrors.push(batchError)
				},
				handleBlocksIndexed,
				handleFileParsed,
			)

			logger.info(`Scanner.scanDirectory completed. Result:`, result ? "Success" : "Failed")

			if (!result) {
				throw new Error("Scan failed, is scanner initialized?")
			}

			const { stats } = result

			logger.info(`Indexing statistics:`, {
				cumulativeBlocksIndexed,
				cumulativeBlocksFoundSoFar,
				batchErrors: batchErrors.length,
				stats: stats || "No stats available",
			})

			// Check if any blocks were actually indexed successfully
			if (cumulativeBlocksIndexed === 0 && cumulativeBlocksFoundSoFar > 0) {
				if (batchErrors.length > 0) {
					const firstError = batchErrors[0]
					throw new Error(`Indexing failed: ${firstError.message}`)
				} else {
					throw new Error("Indexing failed: No blocks were indexed")
				}
			}

			// Check for partial failures
			const failureRate = (cumulativeBlocksFoundSoFar - cumulativeBlocksIndexed) / cumulativeBlocksFoundSoFar
			if (batchErrors.length > 0 && failureRate > 0.1) {
				const firstError = batchErrors[0]
				throw new Error(
					`Indexing partially failed: Only ${cumulativeBlocksIndexed} of ${cumulativeBlocksFoundSoFar} blocks were indexed. ${firstError.message}`,
				)
			}

			// If there were ANY batch errors and NO blocks were successfully indexed
			if (batchErrors.length > 0 && cumulativeBlocksIndexed === 0) {
				const firstError = batchErrors[0]
				throw new Error(`Indexing failed completely: ${firstError.message}`)
			}

			// Final sanity check
			if (cumulativeBlocksFoundSoFar > 0 && cumulativeBlocksIndexed === 0) {
				throw new Error("Indexing failed: Critical error - no blocks indexed")
			}

			// Start file watcher if available
			if (this.fileWatcher) {
				logger.info(`Starting file watcher...`)
				await this.fileWatcher.initialize()
				logger.info(`File watcher started successfully`)
			}

			logger.info(`Indexing process completed successfully. Final state: Indexed`)
			this.stateManager.setSystemState("Indexed", "File watcher started")
		} catch (error: any) {
			logger.error("Error during indexing:", error)
			try {
				await this.vectorStore.clearCollection(0)
			} catch (cleanupError) {
				logger.error("Failed to clean up after error:", cleanupError)
			}

			this.stateManager.setSystemState("Error", `Failed during initial scan: ${error.message || "Unknown error"}`)
			this.stopWatcher()
		} finally {
			this._isProcessing = false
		}
	}

	/**
	 * Stops the file watcher and cleans up resources.
	 */
	public stopWatcher(): void {
		if (this.fileWatcher) {
			this.fileWatcher.dispose()
		}

		if (this.stateManager.state !== "Error") {
			this.stateManager.setSystemState("Standby", "File watcher stopped")
		}
		this._isProcessing = false
	}

	/**
	 * Clears all index data by stopping the watcher, clearing the vector store,
	 * and resetting the cache file.
	 */
	public async clearIndexData(): Promise<void> {
		this._isProcessing = true

		try {
			await this.stopWatcher()

			try {
				await this.vectorStore.deleteCollection()
			} catch (error: any) {
				logger.error("Failed to clear vector collection:", error)
				this.stateManager.setSystemState("Error", `Failed to clear vector collection: ${error.message}`)
			}

			if (this.stateManager.state !== "Error") {
				this.stateManager.setSystemState("Standby", "Index data cleared successfully.")
			}
		} finally {
			this._isProcessing = false
		}
	}

	/**
	 * Gets the current state of the indexing system.
	 */
	public get state(): IndexingState["state"] {
		return this.stateManager.state
	}
}
