import { Router } from "express"
import { logger } from "../utils/logger"
import { requireJWT, requireGitHubToken } from "../middleware/auth"
import { githubService } from "../services/githubService"
import { Repository } from "../models"
import { Op } from "sequelize"

const router = Router()

// Get user's repositories from database
router.get("/repos", requireJWT, async (req: any, res) => {
	try {
		const {
			page = 1,
			limit = 1000,
			search,
			language,
			isPrivate,
			isFork,
			sortBy = "repoUpdatedAt",
			sortOrder = "desc",
		} = req.query
		const userId = req.user.id

		// Build where clause
		const where: any = { userId }

		if (search) {
			where[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ fullName: { [Op.like]: `%${search}%` } },
				{ description: { [Op.like]: `%${search}%` } },
			]
		}

		if (language) {
			where.language = language
		}

		// Add private repository filter
		if (isPrivate !== undefined) {
			where.isPrivate = isPrivate === "true"
		}

		// Add fork filter
		if (isFork !== undefined) {
			where.isFork = isFork === "true"
		}

		// Map frontend field names to model field names
		const fieldMapping: Record<string, string> = {
			updatedAt: "updatedAt", // Now properly mapped to updated_at in DB
			createdAt: "createdAt", // Now properly mapped to created_at in DB
			pushedAt: "repoPushedAt",
			stars: "starsCount",
			forks: "forksCount",
			watchers: "watchersCount",
		}

		const mappedSortBy = fieldMapping[sortBy as string] || sortBy

		// Build order clause
		const order: any = [[mappedSortBy, sortOrder.toUpperCase()]]

		// Execute query
		const { count, rows: repositories } = await Repository.findAndCountAll({
			where,
			order,
			limit: parseInt(limit),
			offset: (parseInt(page) - 1) * parseInt(limit),
		})

		const total = count

		res.json({
			success: true,
			data: {
				repositories,
				pagination: {
					page: parseInt(page),
					limit: parseInt(limit),
					total,
					totalPages: Math.ceil(total / limit),
				},
			},
		})
	} catch (error) {
		logger.error("Error fetching repositories:", error)
		res.status(500).json({
			success: false,
			error: "Failed to fetch repositories",
		})
	}
})

// Get specific repository
router.get("/repos/:owner/:repo", requireJWT, async (req: any, res) => {
	try {
		const { owner, repo } = req.params
		const fullName = `${owner}/${repo}`
		const userId = req.user.id

		const repository = await Repository.findOne({ where: { fullName, userId } })

		if (!repository) {
			return res.status(404).json({
				success: false,
				error: "Repository not found",
			})
		}

		return res.json({
			success: true,
			data: repository,
		})
	} catch (error) {
		logger.error("Error fetching repository:", error)
		return res.status(500).json({
			success: false,
			error: "Failed to fetch repository",
		})
	}
})

// Get repository contents
router.get("/repos/:owner/:repo/contents", requireJWT, requireGitHubToken, async (req: any, res) => {
	try {
		const { owner, repo } = req.params
		const { path = "" } = req.query
		const accessToken = req.user.accessToken

		const contents = await githubService.getRepositoryContents(accessToken, owner, repo, path)

		res.json({
			success: true,
			data: contents,
		})
	} catch (error) {
		logger.error("Error fetching repository contents:", error)
		res.status(500).json({
			success: false,
			error: "Failed to fetch repository contents",
		})
	}
})

// Get file content
router.get("/repos/:owner/:repo/file", requireJWT, requireGitHubToken, async (req: any, res) => {
	try {
		const { owner, repo } = req.params
		const { path } = req.query
		const accessToken = req.user.accessToken

		if (!path) {
			return res.status(400).json({
				success: false,
				error: "File path is required",
			})
		}

		const content = await githubService.getFileContent(accessToken, owner, repo, path)

		res.json({
			success: true,
			data: {
				content,
				path,
				owner,
				repo,
			},
		})
	} catch (error) {
		logger.error("Error fetching file content:", error)
		res.status(500).json({
			success: false,
			error: "Failed to fetch file content",
		})
	}
})

// Get repository languages
router.get("/repos/:owner/:repo/languages", requireJWT, requireGitHubToken, async (req: any, res) => {
	try {
		const { owner, repo } = req.params
		const accessToken = req.user.accessToken

		const languages = await githubService.getRepositoryLanguages(accessToken, owner, repo)

		return res.json({
			success: true,
			data: languages,
		})
	} catch (error) {
		logger.error("Error fetching repository languages:", error)
		return res.status(500).json({
			success: false,
			error: "Failed to fetch repository languages",
		})
	}
})

// Get repository statistics
router.get("/repos/:owner/:repo/stats", requireJWT, async (req: any, res) => {
	try {
		const { owner, repo } = req.params
		const fullName = `${owner}/${repo}`
		const userId = req.user.id

		const repository = await Repository.findOne({ where: { fullName, userId } })

		if (!repository) {
			return res.status(404).json({
				success: false,
				error: "Repository not found",
			})
		}

		// Get language statistics
		const languageStats = repository.languages || {}
		const totalBytes = Object.values(languageStats).reduce((sum: number, bytes: number) => sum + bytes, 0)

		const languagePercentages = Object.entries(languageStats).map(([language, bytes]) => ({
			language,
			bytes,
			percentage: ((bytes / totalBytes) * 100).toFixed(2),
		}))

		return res.json({
			success: true,
			data: {
				repository: {
					name: repository.name,
					fullName: repository.fullName,
					description: repository.description,
					language: repository.language,
					stars: repository.starsCount,
					forks: repository.forksCount,
					watchers: repository.watchersCount,
					size: repository.size,
					isPrivate: repository.isPrivate,
					isFork: repository.isFork,
					createdAt: repository.createdAt,
					updatedAt: repository.updatedAt,
					pushedAt: repository.repoPushedAt,
				},
				languages: languagePercentages,
				lastSyncedAt: repository.lastSyncedAt,
			},
		})
	} catch (error) {
		logger.error("Error fetching repository statistics:", error)
		return res.status(500).json({
			success: false,
			error: "Failed to fetch repository statistics",
		})
	}
})

// Get user's repository languages summary
router.get("/repos/languages", requireJWT, async (req: any, res) => {
	try {
		const userId = req.user.id

		// Get all repositories for the user
		const repositories = await Repository.findAll({
			where: { userId },
			attributes: ["languages"],
		})

		// Aggregate language statistics
		const languageStats: Record<string, number> = {}

		repositories.forEach((repo) => {
			if (repo.languages) {
				Object.entries(repo.languages).forEach(([language, bytes]) => {
					languageStats[language] = (languageStats[language] || 0) + bytes
				})
			}
		})

		// Convert to array and sort by total bytes
		const sortedLanguages = Object.entries(languageStats)
			.map(([language, totalBytes]) => ({ language, totalBytes }))
			.sort((a, b) => b.totalBytes - a.totalBytes)
			.slice(0, 10)

		res.json({
			success: true,
			data: sortedLanguages,
		})
	} catch (error) {
		logger.error("Error fetching language statistics:", error)
		res.status(500).json({
			success: false,
			error: "Failed to fetch language statistics",
		})
	}
})

// Get available languages for filtering
router.get("/repos/languages", requireJWT, async (req: any, res) => {
	try {
		const userId = req.user.id

		const languages = await Repository.findAll({
			where: { userId },
			attributes: ["language"],
			group: ["language"],
			order: [["language", "ASC"]],
			raw: true,
		})

		const languageList = languages
			.map((item) => item.language)
			.filter((lang) => lang !== null && lang !== undefined && lang.trim() !== "")
			.sort()

		res.json({
			success: true,
			data: {
				languages: languageList,
			},
		})
	} catch (error) {
		logger.error("Error fetching languages:", error)
		res.status(500).json({
			success: false,
			error: "Failed to fetch languages",
		})
	}
})

export default router
