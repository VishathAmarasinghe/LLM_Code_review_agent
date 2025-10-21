import { Router } from "express"
import { logger } from "../utils/logger"
import { requireJWT } from "../middleware/auth"
import { Repository } from "../models"

const router = Router()

/**
 * @route GET /api/repositories
 * @desc Get all repositories for a user
 * @access Private
 */
router.get("/", requireJWT, async (req: any, res) => {
	try {
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

		// Validate that the user can only access their own data
		if (userIdParam !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only access your own repositories.",
			})
		}

		// Get repositories for the user
		const repositories = await Repository.findAll({
			where: { userId: userIdParam },
			order: [["updatedAt", "DESC"]],
		})

		return res.json({
			success: true,
			data: repositories.map((repo) => ({
				id: repo.get("id"),
				githubId: repo.get("githubId"),
				name: repo.get("name"),
				fullName: repo.get("fullName"),
				description: repo.get("description"),
				language: repo.get("language"),
				starsCount: repo.get("starsCount"),
				forksCount: repo.get("forksCount"),
				watchersCount: repo.get("watchersCount"),
				isPrivate: repo.get("isPrivate"),
				isFork: repo.get("isFork"),
				updatedAt: repo.get("updatedAt"),
				pushedAt: repo.get("pushedAt"),
				htmlUrl: repo.get("htmlUrl"),
				owner: repo.get("owner"),
				defaultBranch: repo.get("defaultBranch"),
				size: repo.get("size"),
			})),
		})
	} catch (error: any) {
		logger.error("Error getting repositories:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get repositories",
		})
	}
})

/**
 * @route GET /api/repositories/:repositoryId
 * @desc Get a specific repository by ID
 * @access Private
 */
router.get("/:repositoryId", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const { userId } = req.query
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
		const userIdParam = parseInt(userId as string)
		if (isNaN(userIdParam)) {
			return res.status(400).json({
				success: false,
				message: "Invalid user ID",
			})
		}

		// Validate that the user can only access their own data
		if (userIdParam !== authenticatedUserId) {
			return res.status(403).json({
				success: false,
				message: "Access denied. You can only access your own repositories.",
			})
		}

		// Get the specific repository
		const repository = await Repository.findOne({
			where: {
				id: repoId,
				userId: userIdParam,
			},
		})

		if (!repository) {
			return res.status(404).json({
				success: false,
				message: "Repository not found",
			})
		}

		return res.json({
			success: true,
			data: {
				id: repository.get("id"),
				githubId: repository.get("githubId"),
				name: repository.get("name"),
				fullName: repository.get("fullName"),
				description: repository.get("description"),
				language: repository.get("language"),
				starsCount: repository.get("starsCount"),
				forksCount: repository.get("forksCount"),
				watchersCount: repository.get("watchersCount"),
				isPrivate: repository.get("isPrivate"),
				isFork: repository.get("isFork"),
				updatedAt: repository.get("updatedAt"),
				pushedAt: repository.get("pushedAt"),
				htmlUrl: repository.get("htmlUrl"),
				owner: repository.get("owner"),
				defaultBranch: repository.get("defaultBranch"),
				size: repository.get("size"),
			},
		})
	} catch (error: any) {
		logger.error("Error getting repository:", error)
		return res.status(500).json({
			success: false,
			message: error.message || "Failed to get repository",
		})
	}
})

export default router
