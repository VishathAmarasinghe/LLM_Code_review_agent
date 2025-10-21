import { Router } from "express"
import { logger } from "../utils/logger"
import { requireJWT } from "../middleware/auth"
import { CodeIndexingService } from "../services/indexing/CodeIndexingService"
import { IndexingConfiguration } from "../models"
import { validation } from "../middleware/validation"
import * as Joi from "joi"

const router = Router()
const indexingService = CodeIndexingService.getInstance()

// Validation schemas
const startIndexingSchema = Joi.object({
	options: Joi.object({
		maxFileSize: Joi.number()
			.min(1024)
			.max(10 * 1024 * 1024)
			.optional(),
		batchSize: Joi.number().min(1).max(1000).optional(),
		includePatterns: Joi.array().items(Joi.string()).optional(),
		excludePatterns: Joi.array().items(Joi.string()).optional(),
		enableSecurityScanning: Joi.boolean().optional(),
		enablePerformanceAnalysis: Joi.boolean().optional(),
		enableCrossFileAnalysis: Joi.boolean().optional(),
	}).optional(),
})

const searchCodeSchema = Joi.object({
	query: Joi.string().min(1).max(1000).required(),
	limit: Joi.number().min(1).max(100).optional().default(50),
})

const updateConfigSchema = Joi.object({
	openaiApiKey: Joi.string().min(1).required(),
	qdrantUrl: Joi.string().uri().required(),
	qdrantApiKey: Joi.string().optional().allow(""),
	embeddingModel: Joi.string()
		.valid("text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002")
		.optional(),
	maxFileSize: Joi.number()
		.min(1024)
		.max(10 * 1024 * 1024)
		.optional(),
	batchSize: Joi.number().min(1).max(1000).optional(),
	maxConcurrentJobs: Joi.number().min(1).max(10).optional(),
	isEnabled: Joi.boolean().optional(),
})

const startIndexingBodySchema = Joi.object({
	repositoryId: Joi.number().integer().positive().required(),
	userId: Joi.number().integer().positive().required(),
	options: Joi.object({
		enablePerformanceAnalysis: Joi.boolean().optional(),
		enableCrossFileAnalysis: Joi.boolean().optional(),
	}).optional(),
})

/**
 * @route POST /api/indexing/start
 * @desc Start indexing a repository (frontend compatible)
 * @access Private
 */
router.post("/start", requireJWT, validation(startIndexingBodySchema, "body"), async (req: any, res) => {
	try {
		const { repositoryId, userId, options } = req.body
		const authenticatedUserId = req.user.id

		// Validate that the user can only start indexing for themselves
		if (userId !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only start indexing for your own repositories.",
			})
		}

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Start indexing
		const job = await indexingService.startIndexing(repoId, userId, options)

		return res.json({
			success: true,
			data: {
				jobId: job.id,
				repositoryId: repoId,
				status: job.status,
				message: "Indexing started successfully",
			},
		})
	} catch (error: any) {
		logger.error("Error starting indexing:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to start indexing",
		})
	}
})

/**
 * @route POST /api/indexing/stop
 * @desc Stop indexing a repository (frontend compatible)
 * @access Private
 */
router.post("/stop", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId, userId } = req.body
		const authenticatedUserId = req.user.id

		// Validate that the user can only stop indexing for themselves
		if (userId !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only stop indexing for your own repositories.",
			})
		}

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Stop indexing
		await indexingService.stopIndexing(repoId, userId)

		return res.json({
			success: true,
			message: "Indexing stopped successfully",
		})
	} catch (error: any) {
		logger.error("Error stopping indexing:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to stop indexing",
		})
	}
})

/**
 * @route POST /api/indexing/reindex
 * @desc Reindex a repository (clear existing index and create new one)
 * @access Private
 */
router.post("/reindex", requireJWT, validation(startIndexingBodySchema, "body"), async (req: any, res) => {
	try {
		const { repositoryId, userId, options } = req.body
		const authenticatedUserId = req.user.id

		// Validate that the user can only reindex for themselves
		if (userId !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only reindex your own repositories.",
			})
		}

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Reindex repository
		const job = await indexingService.reindexRepository(repoId, userId, options)

		return res.json({
			success: true,
			data: {
				jobId: job.id,
				repositoryId: repoId,
				status: job.status,
				message: "Reindexing started successfully",
			},
		})
	} catch (error: any) {
		logger.error("Error reindexing repository:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to reindex repository",
		})
	}
})

/**
 * @route POST /api/indexing/start/:repositoryId
 * @desc Start indexing a repository
 * @access Private
 */
router.post("/start/:repositoryId", requireJWT, validation(startIndexingSchema, "body"), async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const { options } = req.body
		const userId = req.user.id

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Note: Using environment-based configuration, no database config check needed

		// Start indexing
		const job = await indexingService.startIndexing(repoId, userId, options)

		logger.info(`Started indexing for repository ${repoId} by user ${userId}`)

		return res.status(201).json({
			success: true,
			message: "Indexing started successfully",
			data: {
				jobId: job.id,
				repositoryId: job.repositoryId,
				status: job.status,
				stage: job.stage,
				progress: job.progress,
				message: job.message,
			},
		})
	} catch (error: any) {
		logger.error("Error starting indexing:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to start indexing",
		})
	}
})

/**
 * @route POST /api/indexing/stop/:repositoryId
 * @desc Stop indexing a repository
 * @access Private
 */
router.post("/stop/:repositoryId", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const userId = req.user.id

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Stop indexing
		const success = await indexingService.stopIndexing(repoId, userId)

		if (success) {
			logger.info(`Stopped indexing for repository ${repoId} by user ${userId}`)
			return res.json({
				success: true,
				message: "Indexing stopped successfully",
			})
		} else {
			return res.status(400).json({
				success: false,
				message: "No running indexing job found for this repository",
			})
		}
	} catch (error: any) {
		logger.error("Error stopping indexing:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to stop indexing",
		})
	}
})

/**
 * @route GET /api/indexing/status/:repositoryId/:userId
 * @desc Get indexing status for a repository
 * @access Private
 */
router.get("/status/:repositoryId/:userId", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId, userId: paramUserId } = req.params
		const authenticatedUserId = req.user.id

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Validate user ID parameter
		const userId = parseInt(paramUserId)
		if (isNaN(userId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid user ID",
			})
		}

		// Validate that the user can only access their own data
		if (userId !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only access your own data.",
			})
		}

		// Get indexing status
		const job = await indexingService.getIndexingStatus(repoId, userId)

		// Debug logging
		console.log(`Status API - Repository ID: ${repoId}, User ID: ${userId}`)
		console.log(`Status API - Found job:`, job ? "Yes" : "No")
		if (job) {
			console.log(`Status API - Job details:`, {
				id: job.id || job.dataValues?.id,
				status: job.status || job.dataValues?.status,
				stage: job.stage || job.dataValues?.stage,
				progress: job.progress || job.dataValues?.progress,
			})
		}

		if (!job) {
			return res.status(404).json({
				success: false,
				message: "No indexing job found for this repository",
			})
		}

		return res.json({
			success: true,
			data: {
				jobId: job.id || job.dataValues?.id,
				repositoryId: job.repositoryId || job.dataValues?.repositoryId,
				status: job.status || job.dataValues?.status,
				stage: job.stage || job.dataValues?.stage,
				progress: job.progress || job.dataValues?.progress,
				totalFiles: job.totalFiles || job.dataValues?.totalFiles,
				processedFiles: job.processedFiles || job.dataValues?.processedFiles,
				totalBlocks: job.totalBlocks || job.dataValues?.totalBlocks,
				indexedBlocks: job.indexedBlocks || job.dataValues?.indexedBlocks,
				message: job.message || job.dataValues?.message,
				error: job.error || job.dataValues?.error,
				startedAt: job.startedAt || job.dataValues?.startedAt,
				completedAt: job.completedAt || job.dataValues?.completedAt,
				repository: (job as any).repository || (job as any).dataValues?.repository,
			},
		})
	} catch (error: any) {
		logger.error("Error getting indexing status:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get indexing status",
		})
	}
})

/**
 * @route GET /api/indexing/jobs
 * @desc Get indexing jobs for a user
 * @access Private
 */
router.get("/jobs", requireJWT, async (req: any, res) => {
	try {
		const userId = req.user.id
		const limit = parseInt(req.query.limit) || 10

		// Get indexing jobs
		const jobs = await indexingService.getIndexingJobs(userId, limit)

		return res.json({
			success: true,
			data: jobs.map((job) => ({
				jobId: job.id,
				repositoryId: job.repositoryId,
				status: job.status,
				stage: job.stage,
				progress: job.progress,
				totalFiles: job.totalFiles,
				processedFiles: job.processedFiles,
				totalBlocks: job.totalBlocks,
				indexedBlocks: job.indexedBlocks,
				message: job.message,
				error: job.error,
				startedAt: job.startedAt,
				completedAt: job.completedAt,
				repository: job.repository,
			})),
		})
	} catch (error: any) {
		logger.error("Error getting indexing jobs:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get indexing jobs",
		})
	}
})

/**
 * @route GET /api/indexing/jobs/:userId
 * @desc Get indexing jobs for a user (frontend compatible)
 * @access Private
 */
router.get("/jobs/:userId", requireJWT, async (req: any, res) => {
	try {
		const { userId } = req.params
		const authenticatedUserId = req.user.id
		const limit = parseInt(req.query.limit) || 10

		// Validate that the user can only access their own jobs
		const userIdParam = parseInt(userId)
		if (userIdParam !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only access your own jobs.",
			})
		}

		// Get indexing jobs
		const jobs = await indexingService.getIndexingJobs(userIdParam, limit)

		return res.json({
			success: true,
			data: jobs.map((job) => ({
				jobId: job.get("id"),
				repositoryId: job.get("repositoryId"),
				status: job.get("status"),
				stage: job.get("stage"),
				progress: job.get("progress"),
				totalFiles: job.get("totalFiles"),
				processedFiles: job.get("processedFiles"),
				totalBlocks: job.get("totalBlocks"),
				indexedBlocks: job.get("indexedBlocks"),
				message: job.get("message"),
				error: job.get("error"),
				startedAt: job.get("startedAt"),
				completedAt: job.get("completedAt"),
				repository: job.get("repository"),
			})),
		})
	} catch (error: any) {
		logger.error("Error getting indexing jobs:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get indexing jobs",
		})
	}
})

/**
 * @route GET /api/indexing/jobs/:jobId
 * @desc Get a specific indexing job (frontend compatible)
 * @access Private
 */
router.get("/jobs/:jobId", requireJWT, async (req: any, res) => {
	try {
		const { jobId } = req.params
		const { userId } = req.query
		const authenticatedUserId = req.user.id

		// Validate user ID parameter
		const userIdParam = parseInt(userId as string)
		if (isNaN(userIdParam)) {
			return res.status(400).json({
				success: false,
				message: "Invalid user ID",
			})
		}

		// Validate that the user can only access their own jobs
		if (userIdParam !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only access your own jobs.",
			})
		}

		// Get all jobs and find the specific one
		const jobs = await indexingService.getIndexingJobs(userIdParam, 100)
		const job = jobs.find((j) => j.get("id") === parseInt(jobId))

		if (!job) {
			return res.status(404).json({
				success: false,
				message: "Indexing job not found",
			})
		}

		return res.json({
			success: true,
			data: {
				jobId: job.get("id"),
				repositoryId: job.get("repositoryId"),
				status: job.get("status"),
				stage: job.get("stage"),
				progress: job.get("progress"),
				totalFiles: job.get("totalFiles"),
				processedFiles: job.get("processedFiles"),
				totalBlocks: job.get("totalBlocks"),
				indexedBlocks: job.get("indexedBlocks"),
				message: job.get("message"),
				error: job.get("error"),
				startedAt: job.get("startedAt"),
				completedAt: job.get("completedAt"),
				repository: job.get("repository"),
			},
		})
	} catch (error: any) {
		logger.error("Error getting indexing job:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get indexing job",
		})
	}
})

/**
 * @route DELETE /api/indexing/jobs/:jobId
 * @desc Delete an indexing job
 * @access Private
 */
router.delete("/jobs/:jobId", requireJWT, async (req: any, res) => {
	try {
		const { jobId } = req.params
		const userId = req.user.id

		// Validate job ID
		const id = parseInt(jobId)
		if (isNaN(id)) {
			return res.status(400).json({
				success: false,
				message: "Invalid job ID",
			})
		}

		// Delete job
		const success = await indexingService.deleteIndexingJob(id, userId)

		if (success) {
			logger.info(`Deleted indexing job ${id} by user ${userId}`)
			return res.json({
				success: true,
				message: "Indexing job deleted successfully",
			})
		} else {
			return res.status(404).json({
				success: false,
				message: "Indexing job not found",
			})
		}
	} catch (error: any) {
		logger.error("Error deleting indexing job:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to delete indexing job",
		})
	}
})

/**
 * @route POST /api/indexing/search/:repositoryId
 * @desc Search indexed code in a repository
 * @access Private
 */
router.post("/search/:repositoryId", requireJWT, validation(searchCodeSchema, "body"), async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const { query, limit } = req.body
		const userId = req.user.id

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Search code
		const results = await indexingService.searchCode(query, repoId, userId, limit)

		logger.info(`Code search for repository ${repoId} by user ${userId}: "${query}" - ${results.length} results`)

		return res.json({
			success: true,
			data: {
				query,
				results: results.map((result) => ({
					id: result.id,
					filePath: result.filePath,
					content: result.content,
					startLine: result.startLine,
					endLine: result.endLine,
					blockType: result.blockType,
					identifier: result.identifier,
					score: result.score,
					repositoryId: result.repositoryId,
					repositoryName: result.repositoryName,
				})),
				totalResults: results.length,
			},
		})
	} catch (error: any) {
		logger.error("Error searching code:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to search code",
		})
	}
})

/**
 * @route GET /api/indexing/config/:userId
 * @desc Get indexing configuration for a user
 * @access Private
 */
router.get("/config/:userId", requireJWT, async (req: any, res) => {
	try {
		const { userId } = req.params
		const authenticatedUserId = req.user.id

		// Validate that the user can only access their own config
		if (parseInt(userId) !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only access your own configuration.",
			})
		}

		const config = await IndexingConfiguration.findOne({
			where: { userId: parseInt(userId) },
		})

		if (!config) {
			return res.status(404).json({
				success: false,
				message: "Indexing configuration not found",
			})
		}

		return res.json({
			success: true,
			data: {
				id: config.id,
				qdrantUrl: config.qdrantUrl,
				qdrantApiKey: config.qdrantApiKey ? "***" : null,
				embeddingModel: config.embeddingModel,
				maxFileSize: config.maxFileSize,
				batchSize: config.batchSize,
				maxConcurrentJobs: config.maxConcurrentJobs,
				isEnabled: config.isEnabled,
				createdAt: config.createdAt,
				updatedAt: config.updatedAt,
			},
		})
	} catch (error: any) {
		logger.error("Error getting indexing configuration:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get indexing configuration",
		})
	}
})

/**
 * @route PUT /api/indexing/config/:userId
 * @desc Create or update indexing configuration
 * @access Private
 */
router.put("/config/:userId", requireJWT, validation(updateConfigSchema), async (req: any, res) => {
	try {
		const { userId } = req.params
		const authenticatedUserId = req.user.id
		const configData = req.body

		// Validate that the user can only update their own config
		if (parseInt(userId) !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only update your own configuration.",
			})
		}

		// Check if configuration already exists
		const existingConfig = await IndexingConfiguration.findOne({
			where: { userId: parseInt(userId) },
		})

		let config: IndexingConfiguration

		if (existingConfig) {
			// Update existing configuration
			await existingConfig.update(configData)
			config = existingConfig
		} else {
			// Create new configuration
			config = await IndexingConfiguration.create({
				userId: parseInt(userId),
				...configData,
			})
		}

		logger.info(`Updated indexing configuration for user ${userId}`)

		return res.json({
			success: true,
			message: "Indexing configuration saved successfully",
			data: {
				id: config.id,
				qdrantUrl: config.qdrantUrl,
				qdrantApiKey: config.qdrantApiKey ? "***" : null,
				embeddingModel: config.embeddingModel,
				maxFileSize: config.maxFileSize,
				batchSize: config.batchSize,
				maxConcurrentJobs: config.maxConcurrentJobs,
				isEnabled: config.isEnabled,
				createdAt: config.createdAt,
				updatedAt: config.updatedAt,
			},
		})
	} catch (error: any) {
		logger.error("Error saving indexing configuration:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to save indexing configuration",
		})
	}
})

/**
 * @route GET /api/indexing/stats/:userId
 * @desc Get indexing statistics for a user (frontend compatible)
 * @access Private
 */
router.get("/stats/:userId", requireJWT, async (req: any, res) => {
	try {
		const { userId } = req.params
		const authenticatedUserId = req.user.id

		// Validate that the user can only access their own stats
		const userIdParam = parseInt(userId)
		if (userIdParam !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only access your own statistics.",
			})
		}

		// Get indexing statistics by calculating from jobs
		const jobs = await indexingService.getIndexingJobs(userIdParam, 1000)

		const stats = {
			totalJobs: jobs.length,
			completedJobs: jobs.filter((job) => job.get("status") === "completed").length,
			failedJobs: jobs.filter((job) => job.get("status") === "failed").length,
			runningJobs: jobs.filter((job) => job.get("status") === "running").length,
			totalRepositories: new Set(jobs.map((job) => job.get("repositoryId"))).size,
			indexedRepositories: new Set(
				jobs.filter((job) => job.get("status") === "completed").map((job) => job.get("repositoryId")),
			).size,
			totalFiles: jobs.reduce((sum, job) => sum + (job.get("totalFiles") || 0), 0),
			totalBlocks: jobs.reduce((sum, job) => sum + (job.get("totalBlocks") || 0), 0),
			averageJobDuration: 0, // TODO: Calculate from job durations
			lastIndexedAt:
				jobs.length > 0 ? Math.max(...jobs.map((job) => new Date(job.get("startedAt") || 0).getTime())) : null,
		}

		return res.json({
			success: true,
			data: stats,
		})
	} catch (error: any) {
		logger.error("Error getting indexing stats:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get indexing statistics",
		})
	}
})

export default router
