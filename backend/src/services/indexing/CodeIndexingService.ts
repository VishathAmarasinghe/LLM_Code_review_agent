import { Repository, IndexingJob, IndexingConfiguration } from "../../models"
import { CodeIndexManager } from "./CodeIndexManager"
import { SearchResult, IndexingJobOptions } from "./interfaces"
import { logger } from "../../utils/logger"
import * as fs from "fs/promises"
import * as path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export class CodeIndexingService {
	private static instance: CodeIndexingService
	private runningJobs = new Map<number, AbortController>()
	private progressHandlers = new Map<number, (progress: any) => void>()

	public static getInstance(): CodeIndexingService {
		if (!CodeIndexingService.instance) {
			CodeIndexingService.instance = new CodeIndexingService()
		}
		return CodeIndexingService.instance
	}

	/**
	 * Start indexing a repository
	 * @param repositoryId Repository ID
	 * @param userId User ID
	 * @param options Indexing options
	 * @returns Promise resolving to indexing job
	 */
	async startIndexing(repositoryId: number, userId: number, options: IndexingJobOptions = {}): Promise<IndexingJob> {
		try {
			// Check if there's already a running job for this repository
			if (this.runningJobs.has(repositoryId)) {
				const existingJob = await IndexingJob.findOne({
					where: { repositoryId, status: "running" },
					order: [["startedAt", "DESC"]],
				})

				if (existingJob) {
					logger.info(`Indexing already in progress for repository ${repositoryId}`)
					return existingJob
				}
			}

			// Check for any existing running jobs in the database
			const existingRunningJob = await IndexingJob.findOne({
				where: { repositoryId, userId, status: "running" },
				order: [["startedAt", "DESC"]],
			})

			if (existingRunningJob) {
				logger.info(`Found existing running job ${existingRunningJob.id} for repository ${repositoryId}`)
				return existingRunningJob
			}

			// Get repository and user
			const repository = await Repository.findByPk(repositoryId)
			if (!repository) {
				throw new Error("Repository not found")
			}

			// Debug: Log repository properties
			logger.info(`Repository properties:`, {
				id: repository.id,
				fullName: repository.fullName,
				name: repository.name,
				ownerLogin: repository.ownerLogin,
				htmlUrl: repository.htmlUrl,
				cloneUrl: repository.cloneUrl,
				dataValues: repository.dataValues,
			})

			// Get fullName from the repository (handle Sequelize model instance)
			const fullName = repository.fullName || repository.dataValues?.fullName

			// Validate repository has required properties
			if (!fullName) {
				// Try to construct fullName from ownerLogin and name
				const ownerLogin = repository.ownerLogin || repository.dataValues?.ownerLogin
				const name = repository.name || repository.dataValues?.name

				if (ownerLogin && name) {
					const constructedFullName = `${ownerLogin}/${name}`
					logger.info(`Constructed fullName from ownerLogin and name: ${constructedFullName}`)
					// Update the repository object for consistency
					repository.fullName = constructedFullName
				} else {
					throw new Error(
						`Repository ${repositoryId} is missing fullName property. Available properties: ${Object.keys(repository).join(", ")}`,
					)
				}
			}

			// Validate required environment variables
			if (!process.env.OPENAI_API_KEY) {
				throw new Error("OPENAI_API_KEY environment variable is required for indexing")
			}

			// Create a default configuration object using environment variables
			const config = {
				id: 0,
				userId,
				openaiApiKey: process.env.OPENAI_API_KEY,
				qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
				qdrantApiKey: process.env.QDRANT_API_KEY || "",
				embeddingModel: "text-embedding-3-small",
				maxFileSize: parseInt(process.env.INDEXING_MAX_FILE_SIZE || "1048576"),
				batchSize: parseInt(process.env.INDEXING_BATCH_SIZE || "100"),
				maxConcurrentJobs: parseInt(process.env.INDEXING_MAX_CONCURRENT_JOBS || "3"),
				isEnabled: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as IndexingConfiguration

			logger.info(`Using environment-based configuration for indexing user ${userId}`)

			// Clone repository to local directory if needed
			const actualFullName = repository.fullName || repository.dataValues?.fullName
			const safeFullName = actualFullName.replace("/", "-")
			const workspacePath = `/tmp/repos/${safeFullName}`
			await this.ensureRepositoryCloned(repository, workspacePath)

			// Create indexing job
			const job = await IndexingJob.create({
				repositoryId,
				userId,
				status: "pending",
				progress: 0,
				totalFiles: 0,
				processedFiles: 0,
				totalBlocks: 0,
				indexedBlocks: 0,
				stage: "initializing",
				message: "Starting indexing process...",
				startedAt: new Date(),
			})

			logger.info(`Created indexing job:`, {
				jobId: job.id || job.dataValues?.id,
				repositoryId: job.repositoryId || job.dataValues?.repositoryId,
				userId: job.userId || job.dataValues?.userId,
				status: job.status || job.dataValues?.status,
			})

			// Create abort controller for this job
			const abortController = new AbortController()
			this.runningJobs.set(repositoryId, abortController)

			// Start indexing process in background
			this.performIndexing(job, repository, config, options, abortController.signal)
				.catch((error) => {
					logger.error(`Indexing failed for repository ${repositoryId}:`, error)
					this.updateJobStatus(job.id, "failed", 0, error.message)
				})
				.finally(() => {
					this.runningJobs.delete(repositoryId)
				})

			return job
		} catch (error) {
			logger.error("Error starting indexing:", error)
			throw error
		}
	}

	/**
	 * Stop indexing a repository
	 * @param repositoryId Repository ID
	 * @param userId User ID
	 * @returns Promise resolving to boolean indicating success
	 */
	async stopIndexing(repositoryId: number, userId: number): Promise<boolean> {
		try {
			const abortController = this.runningJobs.get(repositoryId)
			if (abortController) {
				abortController.abort()
				this.runningJobs.delete(repositoryId)
			}

			// Get the manager and stop it
			const manager = CodeIndexManager.getInstance(repositoryId)
			manager.stopWatcher()

			// Update job status to cancelled
			await IndexingJob.update(
				{
					status: "cancelled",
					completedAt: new Date(),
					message: "Indexing cancelled by user",
				},
				{
					where: { repositoryId, userId, status: "running" },
				},
			)

			return true
		} catch (error) {
			logger.error("Error stopping indexing:", error)
			return false
		}
	}

	/**
	 * Get indexing status for a repository
	 * @param repositoryId Repository ID
	 * @param userId User ID
	 * @returns Promise resolving to indexing job or null
	 */
	async getIndexingStatus(repositoryId: number, userId: number): Promise<IndexingJob | null> {
		try {
			logger.info(`Getting indexing status for repository ${repositoryId}, user ${userId}`)

			const job = await IndexingJob.findOne({
				where: { repositoryId, userId },
				order: [["startedAt", "DESC"]],
				include: ["repository"],
			})

			// Check if there's a stale running job (running for more than 1 hour without progress)
			if (job && job.status === "running") {
				const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
				const startedAt = job.startedAt || job.dataValues?.startedAt

				if (startedAt && new Date(startedAt) < oneHourAgo) {
					logger.warn(`Found stale running job ${job.id}, marking as failed`)
					await this.updateJobStatus(job.id, "failed", 0, "Job timed out - no progress for over 1 hour")

					// Return the updated job
					return await IndexingJob.findByPk(job.id, { include: ["repository"] })
				}
			}

			logger.info(`Found job:`, job ? "Yes" : "No")
			if (job) {
				logger.info(`Job details:`, {
					id: job.id || job.dataValues?.id,
					status: job.status || job.dataValues?.status,
					stage: job.stage || job.dataValues?.stage,
					progress: job.progress || job.dataValues?.progress,
				})
			}

			return job
		} catch (error) {
			logger.error("Error getting indexing status:", error)
			return null
		}
	}

	/**
	 * Search indexed code
	 * @param query Search query
	 * @param repositoryId Repository ID
	 * @param userId User ID
	 * @param limit Maximum number of results
	 * @returns Promise resolving to search results
	 */
	async searchCode(query: string, repositoryId: number, userId: number, limit: number = 50): Promise<SearchResult[]> {
		try {
			// Get the manager and search
			const manager = CodeIndexManager.getInstance(repositoryId)
			const results = await manager.searchIndex(query)

			// Limit results
			return results.slice(0, limit)
		} catch (error) {
			logger.error("Error searching code:", error)
			throw error
		}
	}

	/**
	 * Get indexing jobs for a user
	 * @param userId User ID
	 * @param limit Maximum number of jobs
	 * @returns Promise resolving to array of indexing jobs
	 */
	async getIndexingJobs(userId: number, limit: number = 10): Promise<IndexingJob[]> {
		try {
			return await IndexingJob.findAll({
				where: { userId },
				order: [["startedAt", "DESC"]],
				limit,
				include: ["repository"],
			})
		} catch (error) {
			logger.error("Error getting indexing jobs:", error)
			return []
		}
	}

	/**
	 * Delete an indexing job
	 * @param jobId Job ID
	 * @param userId User ID
	 * @returns Promise resolving to boolean indicating success
	 */
	async deleteIndexingJob(jobId: number, userId: number): Promise<boolean> {
		try {
			const job = await IndexingJob.findOne({
				where: { id: jobId, userId },
			})

			if (!job) {
				return false
			}

			// If job is running, stop it first
			if (job.status === "running") {
				await this.stopIndexing(job.repositoryId, userId)
			}

			// Delete the job
			await job.destroy()
			return true
		} catch (error) {
			logger.error("Error deleting indexing job:", error)
			return false
		}
	}

	/**
	 * Reindex a repository (clear existing index and create new one)
	 * @param repositoryId Repository ID
	 * @param userId User ID
	 * @param options Indexing options
	 * @returns Promise resolving to indexing job
	 */
	async reindexRepository(
		repositoryId: number,
		userId: number,
		options: IndexingJobOptions = {},
	): Promise<IndexingJob> {
		try {
			logger.info(`Starting reindexing for repository ${repositoryId} by user ${userId}`)

			// Get repository
			const repository = await Repository.findByPk(repositoryId)
			if (!repository) {
				throw new Error("Repository not found")
			}

			// Stop any running indexing job for this repository
			const runningJob = await IndexingJob.findOne({
				where: { repositoryId, userId, status: "running" },
				order: [["startedAt", "DESC"]],
			})

			if (runningJob) {
				logger.info(`Stopping running indexing job ${runningJob.id} before reindexing`)
				await this.stopIndexing(repositoryId, userId)
			}

			// Clear existing vector store data for this repository
			logger.info(`Clearing existing vector store data for repository ${repositoryId}`)
			const manager = CodeIndexManager.getInstance(repositoryId)
			await manager.clearIndex()

			// Clear existing database records for this repository
			logger.info(`Clearing existing database records for repository ${repositoryId}`)
			await this.clearRepositoryIndexData(repositoryId, userId)

			// Start fresh indexing
			logger.info(`Starting fresh indexing for repository ${repositoryId}`)
			const reindexingOptions: IndexingJobOptions = {
				...options,
				isReindexing: true,
			}
			const job = await this.startIndexing(repositoryId, userId, reindexingOptions)

			logger.info(`Reindexing started successfully for repository ${repositoryId}, job ID: ${job.id}`)
			return job
		} catch (error) {
			logger.error("Error reindexing repository:", error)
			throw error
		}
	}

	/**
	 * Clear all index data for a repository
	 * @param repositoryId Repository ID
	 * @param userId User ID
	 */
	private async clearRepositoryIndexData(repositoryId: number, userId: number): Promise<void> {
		try {
			// Clear code blocks for this repository
			const { CodeBlock } = await import("../../models")
			await CodeBlock.destroy({
				where: { repositoryId },
			})

			// Mark all indexing jobs for this repository as cancelled (except running ones)
			await IndexingJob.update(
				{
					status: "cancelled",
					message: "Cancelled due to reindexing",
					completedAt: new Date(),
				},
				{
					where: {
						repositoryId,
						userId,
						status: { [require("sequelize").Op.ne]: "running" },
					},
				},
			)

			logger.info(`Cleared index data for repository ${repositoryId}`)
		} catch (error) {
			logger.error("Error clearing repository index data:", error)
			throw error
		}
	}

	/**
	 * Perform the actual indexing work
	 * @param job Indexing job
	 * @param repository Repository
	 * @param config Indexing configuration
	 * @param options Indexing options
	 * @param signal Abort signal
	 */
	private async performIndexing(
		job: IndexingJob,
		repository: Repository,
		config: IndexingConfiguration,
		options: IndexingJobOptions,
		signal: AbortSignal,
	): Promise<void> {
		try {
			// Get the manager for this repository
			const manager = CodeIndexManager.getInstance(repository.id)

			// Initialize the manager
			await manager.initialize(config, repository)

			// Update job status to running
			await this.updateJobStatus(job.id, "running", 0, "Initializing services...")

			// Set up progress tracking
			this.setupProgressTracking(manager, job.id)

			// Start indexing
			logger.info(`Starting indexing process for repository ${repository.id}...`)
			await manager.startIndexing()
			logger.info(`Indexing process completed for repository ${repository.id}`)

			// Wait a moment to ensure all progress updates are processed
			await new Promise((resolve) => setTimeout(resolve, 1000))

			// Complete the job
			await this.updateJobStatus(job.id, "completed", 100, "Indexing completed successfully")

			logger.info(`Indexing completed for repository ${repository.id}`)
		} catch (error) {
			logger.error("Indexing failed:", error)
			await this.updateJobStatus(job.id, "failed", 0, error instanceof Error ? error.message : "Unknown error")
			throw error
		}
	}

	/**
	 * Set up progress tracking for the indexing job
	 */
	private setupProgressTracking(manager: CodeIndexManager, jobId: number): void {
		const progressUpdateHandler = async (progress: any) => {
			try {
				// Map state manager progress to job status
				const stage = this.mapStateToStage(progress.stage || progress.state)
				const progressPercent = Math.round(progress.progress || 0)

				await this.updateJobStatus(
					jobId,
					"running",
					progressPercent,
					progress.message || "Processing...",
					stage,
					progress.processedFiles || 0,
					progress.totalFiles || 0,
					progress.indexedBlocks || 0,
					progress.totalBlocks || 0,
				)

				logger.info(`Progress update for job ${jobId}:`, {
					stage,
					progress: progressPercent,
					processedFiles: progress.processedFiles,
					totalFiles: progress.totalFiles,
					indexedBlocks: progress.indexedBlocks,
					totalBlocks: progress.totalBlocks,
				})
			} catch (error) {
				logger.error("Error updating job progress:", error)
			}
		}

		// Listen to progress updates
		manager.onProgressUpdate.on("progressUpdate", progressUpdateHandler)

		// Store the handler so we can remove it later if needed
		this.progressHandlers.set(jobId, progressUpdateHandler)
	}

	/**
	 * Map state manager state to job stage
	 */
	private mapStateToStage(state: string): IndexingJob["stage"] {
		switch (state) {
			case "scanning":
				return "scanning"
			case "parsing":
				return "parsing"
			case "embedding":
				return "embedding"
			case "storing":
				return "storing"
			case "completed":
				return "completed"
			case "Indexing":
				return "scanning"
			case "Parsing":
				return "parsing"
			case "Embedding":
				return "embedding"
			case "Storing":
				return "storing"
			case "Completed":
				return "completed"
			default:
				return "initializing"
		}
	}

	/**
	 * Update job status
	 * @param jobId Job ID
	 * @param status Job status
	 * @param progress Progress percentage
	 * @param message Status message
	 * @param stage Indexing stage
	 * @param processedFiles Number of processed files
	 * @param totalFiles Total number of files
	 * @param indexedBlocks Number of indexed blocks
	 * @param totalBlocks Total number of blocks
	 */
	private async updateJobStatus(
		jobId: number,
		status: IndexingJob["status"],
		progress: number,
		message?: string,
		stage?: IndexingJob["stage"],
		processedFiles?: number,
		totalFiles?: number,
		indexedBlocks?: number,
		totalBlocks?: number,
	): Promise<void> {
		try {
			const updateData: Partial<IndexingJob> = {
				status,
				progress,
				...(message && { message }),
				...(stage && { stage }),
				...(processedFiles !== undefined && { processedFiles }),
				...(totalFiles !== undefined && { totalFiles }),
				...(indexedBlocks !== undefined && { indexedBlocks }),
				...(totalBlocks !== undefined && { totalBlocks }),
			}

			if (status === "completed" || status === "failed" || status === "cancelled") {
				updateData.completedAt = new Date()
			}

			await IndexingJob.update(updateData, { where: { id: jobId } })
		} catch (error) {
			logger.error("Error updating job status:", error)
		}
	}

	/**
	 * Ensures the repository is cloned to the local workspace directory
	 */
	private async ensureRepositoryCloned(repository: Repository, workspacePath: string): Promise<void> {
		try {
			// Check if directory already exists and has content
			try {
				const stats = await fs.stat(workspacePath)
				if (stats.isDirectory()) {
					// Check if it's a git repository
					try {
						await fs.access(path.join(workspacePath, ".git"))
						logger.info(`Repository already cloned at ${workspacePath}`)
						return
					} catch {
						// Directory exists but not a git repo, remove it
						await fs.rm(workspacePath, { recursive: true, force: true })
					}
				}
			} catch {
				// Directory doesn't exist, that's fine
			}

			// Create parent directory if it doesn't exist
			const parentDir = path.dirname(workspacePath)
			await fs.mkdir(parentDir, { recursive: true })

			// Get cloneUrl from the repository (handle Sequelize model instance)
			const cloneUrl = repository.cloneUrl || repository.dataValues?.cloneUrl
			logger.info(`Clone URL for repository:`, {
				cloneUrl,
				repositoryCloneUrl: repository.cloneUrl,
				dataValuesCloneUrl: repository.dataValues?.cloneUrl,
			})

			if (!cloneUrl) {
				throw new Error(
					`Repository ${repository.fullName || repository.dataValues?.fullName} is missing cloneUrl property`,
				)
			}

			// Clone the repository
			logger.info(
				`Cloning repository ${repository.fullName || repository.dataValues?.fullName} to ${workspacePath}`,
			)
			await execAsync(`git clone ${cloneUrl} ${workspacePath}`)

			logger.info(`Successfully cloned repository to ${workspacePath}`)
		} catch (error) {
			const repoName = repository.fullName || repository.dataValues?.fullName || "unknown"
			logger.error(`Failed to clone repository ${repoName}:`, error)
			throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : "Unknown error"}`)
		}
	}
}
