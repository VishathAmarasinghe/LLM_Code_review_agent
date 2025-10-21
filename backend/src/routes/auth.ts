import { Router } from "express"
import passport from "passport"
import { logger } from "../utils/logger"
import { generateToken, requireAuth, requireJWT } from "../middleware/auth"
import { githubService } from "../services/githubService"

const router = Router()

// GitHub OAuth login
router.get("/github", passport.authenticate("github", { scope: ["user:email", "repo", "read:user"] }))

// GitHub OAuth callback
router.get(
	"/github/callback",
	passport.authenticate("github", {
		failureRedirect: `${process.env.CORS_ORIGIN || "http://localhost:3000"}/auth/login?error=oauth_failed`,
	}),
	async (req: any, res) => {
		try {
			logger.info("GitHub OAuth callback processing")
			const user = req.user

			if (!user) {
				logger.error("No user found in OAuth callback")
				const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3000"
				return res.redirect(`${frontendUrl}/auth/login?error=no_user`)
			}

			logger.info(`User ${user.username} logged in successfully`)

			// Generate JWT token
			const token = generateToken(user.id.toString())

			// Redirect to frontend with token
			const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3000"
			logger.info(
				`Redirecting to frontend with token: ${frontendUrl}/auth/callback?token=${token.substring(0, 20)}...`,
			)
			res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
		} catch (error) {
			logger.error("GitHub OAuth callback error:", error)
			const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3000"
			res.redirect(`${frontendUrl}/auth/login?error=callback_error`)
		}
	},
)

// Get current user info (JWT version)
router.get("/me", requireJWT, async (req: any, res) => {
	try {
		const user = req.user

		res.json({
			success: true,
			data: {
				id: user.id,
				githubId: user.githubId,
				username: user.username,
				displayName: user.displayName,
				email: user.email,
				avatarUrl: user.avatarUrl,
				profileUrl: user.profileUrl,
				lastLoginAt: user.lastLoginAt,
				createdAt: user.createdAt,
			},
		})
	} catch (error) {
		logger.error("Error fetching user info:", error)
		res.status(500).json({
			success: false,
			error: "Failed to fetch user info",
		})
	}
})

// Logout (JWT version)
router.post("/logout", requireJWT, (req: any, res) => {
	// For JWT, we just return success since the token will expire
	res.json({
		success: true,
		message: "Logged out successfully",
	})
})

// Validate GitHub token
router.post("/validate-token", async (req, res) => {
	try {
		const { token } = req.body

		if (!token) {
			return res.status(400).json({
				success: false,
				error: "Token is required",
			})
		}

		const isValid = await githubService.validateToken(token)

		return res.json({
			success: true,
			data: {
				valid: isValid,
			},
		})
	} catch (error) {
		logger.error("Error validating token:", error)
		return res.status(500).json({
			success: false,
			error: "Token validation failed",
		})
	}
})

// Sync user repositories (async)
router.post("/sync-repos", requireJWT, async (req: any, res) => {
	try {
		const user = req.user

		if (!user.accessToken) {
			return res.status(400).json({
				success: false,
				error: "GitHub access token not found",
			})
		}

		logger.info(`Starting repository sync for user ${user.username}`)

		// Import sync service
		const { syncService } = await import("../services/syncService")

		// Start async sync job
		const syncStatus = await syncService.startRepositorySync(user.id)

		return res.json({
			success: true,
			data: {
				syncId: syncStatus.get("id"),
				status: syncStatus.get("status"),
				message: "Repository sync started",
				progress: syncStatus.get("progress"),
			},
		})
	} catch (error) {
		logger.error("Error starting repository sync:", error)
		return res.status(500).json({
			success: false,
			error: "Failed to start repository sync",
		})
	}
})

// Get sync status
router.get("/sync-status", requireJWT, async (req: any, res) => {
	try {
		const user = req.user
		const { type = "repositories" } = req.query

		const { syncService } = await import("../services/syncService")
		const syncStatus = await syncService.getSyncStatus(user.id, type)

		if (!syncStatus) {
			return res.json({
				success: true,
				data: {
					status: "not_found",
					message: "No sync status found",
				},
			})
		}

		return res.json({
			success: true,
			data: {
				syncId: syncStatus.get("id"),
				status: syncStatus.get("status"),
				progress: syncStatus.get("progress"),
				totalItems: syncStatus.get("totalItems"),
				processedItems: syncStatus.get("processedItems"),
				message: syncStatus.get("message"),
				error: syncStatus.get("error"),
				startedAt: syncStatus.get("startedAt"),
				completedAt: syncStatus.get("completedAt"),
			},
		})
	} catch (error) {
		logger.error("Error getting sync status:", error)
		return res.status(500).json({
			success: false,
			error: "Failed to get sync status",
		})
	}
})

// Get all sync statuses for user
router.get("/sync-statuses", requireJWT, async (req: any, res) => {
	try {
		const user = req.user

		const { syncService } = await import("../services/syncService")
		const syncStatuses = await syncService.getAllSyncStatuses(user.id)

		return res.json({
			success: true,
			data: {
				syncStatuses: syncStatuses.map((status) => ({
					syncId: status.get("id"),
					type: status.get("type"),
					status: status.get("status"),
					progress: status.get("progress"),
					totalItems: status.get("totalItems"),
					processedItems: status.get("processedItems"),
					message: status.get("message"),
					error: status.get("error"),
					startedAt: status.get("startedAt"),
					completedAt: status.get("completedAt"),
				})),
			},
		})
	} catch (error) {
		logger.error("Error getting sync statuses:", error)
		return res.status(500).json({
			success: false,
			error: "Failed to get sync statuses",
		})
	}
})

// Cancel sync
router.post("/cancel-sync", requireJWT, async (req: any, res) => {
	try {
		const user = req.user
		const { type = "repositories" } = req.body

		const { syncService } = await import("../services/syncService")
		const cancelled = await syncService.cancelSync(user.id, type)

		res.json({
			success: true,
			data: {
				cancelled,
				message: cancelled ? "Sync cancelled successfully" : "No active sync to cancel",
			},
		})
	} catch (error) {
		logger.error("Error cancelling sync:", error)
		res.status(500).json({
			success: false,
			error: "Failed to cancel sync",
		})
	}
})

export default router
