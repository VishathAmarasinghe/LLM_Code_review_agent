import { Router } from "express"
import { logger } from "../utils/logger"
import { requireJWT } from "../middleware/auth"
import { CodeIndexingService } from "../services/indexing/CodeIndexingService"
import { validation } from "../middleware/validation"
import * as Joi from "joi"

const router = Router()
const indexingService = CodeIndexingService.getInstance()

// Validation schemas
const searchCodeSchema = Joi.object({
	query: Joi.string().min(1).max(1000).required(),
	repositoryId: Joi.number().optional(),
	repositoryIds: Joi.array().items(Joi.number()).optional(),
	limit: Joi.number().min(1).max(100).optional().default(50),
	minScore: Joi.number().min(0).max(1).optional().default(0.7),
})

/**
 * @route POST /api/search/code
 * @desc Search indexed code across repositories
 * @access Private
 */
router.post("/code", requireJWT, validation(searchCodeSchema), async (req: any, res) => {
	try {
		const { query, repositoryId, repositoryIds, limit, minScore } = req.body
		const userId = req.user.id

		// Determine which repositories to search
		let repositoriesToSearch: number[] = []

		if (repositoryId) {
			// Single repository search
			repositoriesToSearch = [repositoryId]
		} else if (repositoryIds && repositoryIds.length > 0) {
			// Multiple repositories search
			repositoriesToSearch = repositoryIds
		} else {
			return res.status(400).json({
				success: false,
				message: "Please specify either repositoryId or repositoryIds to search",
			})
		}

		// Search across specified repositories
		const allResults = []

		for (const repoId of repositoriesToSearch) {
			try {
				const results = await indexingService.searchCode(query, repoId, userId, limit)
				allResults.push(...results)
			} catch (error) {
				logger.warn(`Error searching repository ${repoId}:`, error)
				// Continue with other repositories
			}
		}

		// Sort results by score (highest first)
		allResults.sort((a, b) => b.score - a.score)

		// Apply minimum score filter
		const filteredResults = allResults.filter((result) => result.score >= minScore)

		// Limit results
		const limitedResults = filteredResults.slice(0, limit)

		logger.info(
			`Code search by user ${userId}: "${query}" - ${limitedResults.length} results across ${repositoriesToSearch.length} repositories`,
		)

		res.json({
			success: true,
			data: {
				query,
				results: limitedResults.map((result) => ({
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
				totalResults: limitedResults.length,
				searchedRepositories: repositoriesToSearch.length,
			},
		})
	} catch (error: any) {
		logger.error("Error in code search:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to search code",
		})
	}
})

/**
 * @route POST /api/search/repositories/:repositoryId/code
 * @desc Search indexed code in a specific repository
 * @access Private
 */
router.post("/repositories/:repositoryId/code", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const { query, limit = 50, minScore = 0.7 } = req.body
		const userId = req.user.id

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Validate query
		if (!query || typeof query !== "string" || query.trim().length === 0) {
			return res.status(400).json({
				success: false,
				message: "Query is required and must be a non-empty string",
			})
		}

		// Search in the specific repository
		const results = await indexingService.searchCode(query.trim(), repoId, userId, limit)

		// Apply minimum score filter
		const filteredResults = results.filter((result) => result.score >= minScore)

		logger.info(
			`Repository code search by user ${userId} in repo ${repoId}: "${query}" - ${filteredResults.length} results`,
		)

		res.json({
			success: true,
			data: {
				query: query.trim(),
				repositoryId: repoId,
				results: filteredResults.map((result) => ({
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
				totalResults: filteredResults.length,
			},
		})
	} catch (error: any) {
		logger.error("Error in repository code search:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to search code in repository",
		})
	}
})

/**
 * @route GET /api/search/repositories/:repositoryId/files
 * @desc Get indexed files for a repository
 * @access Private
 */
router.get("/repositories/:repositoryId/files", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const userId = req.user.id
		const page = parseInt(req.query.page) || 1
		const limit = parseInt(req.query.limit) || 50
		const filePath = req.query.filePath

		// Validate repository ID
		const repoId = parseInt(repositoryId)
		if (isNaN(repoId)) {
			return res.status(400).json({
				success: false,
				message: "Invalid repository ID",
			})
		}

		// Import CodeBlock model
		const { CodeBlock } = require("../../models")

		// Build where clause
		const where: any = { repositoryId: repoId }
		if (filePath) {
			where.filePath = { [require("sequelize").Op.like]: `%${filePath}%` }
		}

		// Get files with pagination
		const offset = (page - 1) * limit
		const { count, rows: files } = await CodeBlock.findAndCountAll({
			where,
			attributes: [
				"filePath",
				"fileName",
				"fileExtension",
				"language",
				"blockType",
				"startLine",
				"endLine",
				"createdAt",
			],
			group: ["filePath", "fileName", "fileExtension", "language"],
			order: [["filePath", "ASC"]],
			limit,
			offset,
			distinct: true,
		})

		// Get file statistics
		const fileStats = await CodeBlock.findAll({
			where: { repositoryId: repoId },
			attributes: [
				"filePath",
				[require("sequelize").fn("COUNT", require("sequelize").col("id")), "blockCount"],
				[require("sequelize").fn("MAX", require("sequelize").col("endLine")), "maxLine"],
			],
			group: ["filePath"],
			raw: true,
		})

		// Create a map of file stats
		const statsMap = new Map()
		fileStats.forEach((stat) => {
			statsMap.set(stat.filePath, {
				blockCount: parseInt(stat.blockCount),
				maxLine: parseInt(stat.maxLine),
			})
		})

		// Add stats to files
		const filesWithStats = files.map((file) => ({
			...file.toJSON(),
			...statsMap.get(file.filePath),
		}))

		res.json({
			success: true,
			data: {
				files: filesWithStats,
				pagination: {
					page,
					limit,
					total: count.length,
					totalPages: Math.ceil(count.length / limit),
				},
			},
		})
	} catch (error: any) {
		logger.error("Error getting indexed files:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get indexed files",
		})
	}
})

/**
 * @route GET /api/search/repositories/:repositoryId/stats
 * @desc Get indexing statistics for a repository
 * @access Private
 */
router.get("/repositories/:repositoryId/stats", requireJWT, async (req: any, res) => {
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

		// Import models
		const { CodeBlock, IndexingJob } = require("../../models")

		// Get code block statistics
		const blockStats = await CodeBlock.findAll({
			where: { repositoryId: repoId },
			attributes: [
				"language",
				"blockType",
				[require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
			],
			group: ["language", "blockType"],
			raw: true,
		})

		// Get file statistics
		const fileStats = await CodeBlock.findAll({
			where: { repositoryId: repoId },
			attributes: ["filePath", [require("sequelize").fn("COUNT", require("sequelize").col("id")), "blockCount"]],
			group: ["filePath"],
			raw: true,
		})

		// Get total counts
		const totalBlocks = await CodeBlock.count({ where: { repositoryId: repoId } })
		const totalFiles = fileStats.length

		// Get language distribution
		const languageStats = blockStats.reduce((acc: any, stat: any) => {
			const lang = stat.language
			if (!acc[lang]) {
				acc[lang] = 0
			}
			acc[lang] += parseInt(stat.count)
			return acc
		}, {})

		// Get block type distribution
		const blockTypeStats = blockStats.reduce((acc: any, stat: any) => {
			const type = stat.blockType
			if (!acc[type]) {
				acc[type] = 0
			}
			acc[type] += parseInt(stat.count)
			return acc
		}, {})

		// Get latest indexing job
		const latestJob = await IndexingJob.findOne({
			where: { repositoryId: repoId, userId },
			order: [["startedAt", "DESC"]],
		})

		res.json({
			success: true,
			data: {
				totalBlocks,
				totalFiles,
				languageDistribution: languageStats,
				blockTypeDistribution: blockTypeStats,
				latestIndexingJob: latestJob
					? {
							id: latestJob.id,
							status: latestJob.status,
							stage: latestJob.stage,
							progress: latestJob.progress,
							startedAt: latestJob.startedAt,
							completedAt: latestJob.completedAt,
						}
					: null,
			},
		})
	} catch (error: any) {
		logger.error("Error getting repository stats:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get repository statistics",
		})
	}
})

export default router
