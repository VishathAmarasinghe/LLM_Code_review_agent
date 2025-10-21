import { Router } from "express"
import { logger } from "../utils/logger"
import { generateToken } from "../middleware/auth"
import { User } from "../models"

const router = Router()

// Simple GitHub OAuth login (without session store)
router.get("/github-simple", async (req, res) => {
	try {
		logger.info("Simple OAuth route called")

		// This is a simplified version that doesn't use Passport sessions
		// Instead, we'll redirect to GitHub directly and handle the callback manually

		const clientId = process.env.GITHUB_CLIENT_ID
		const redirectUri = process.env.GITHUB_CALLBACK_URL?.replace(
			"/auth/github/callback",
			"/auth-simple/github-simple/callback",
		)

		logger.info("OAuth config:", { clientId: !!clientId, redirectUri })

		if (!clientId || !redirectUri) {
			logger.error("GitHub OAuth not configured")
			return res.status(500).json({
				success: false,
				error: "GitHub OAuth not configured",
			})
		}

		const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email,repo,read:user`

		logger.info("Redirecting to GitHub OAuth:", githubAuthUrl)
		return res.redirect(githubAuthUrl)
	} catch (error) {
		logger.error("GitHub OAuth redirect error:", error)
		res.status(500).json({
			success: false,
			error: "OAuth redirect failed",
		})
	}
})

// Simple GitHub OAuth callback (without session store)
router.get("/github-simple/callback", async (req, res) => {
	try {
		logger.info("Simple OAuth callback called")
		const { code } = req.query

		logger.info("OAuth callback params:", { code: !!code })

		if (!code) {
			logger.error("No authorization code provided")
			return res.status(400).json({
				success: false,
				error: "Authorization code not provided",
			})
		}

		// Exchange code for access token
		const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client_id: process.env.GITHUB_CLIENT_ID,
				client_secret: process.env.GITHUB_CLIENT_SECRET,
				code: code,
			}),
		})

		const tokenData = (await tokenResponse.json()) as any

		if (tokenData.error) {
			throw new Error(tokenData.error_description || tokenData.error)
		}

		const accessToken = tokenData.access_token

		// Get user info from GitHub
		const userResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${accessToken}`,
				Accept: "application/vnd.github.v3+json",
			},
		})

		const githubUser = (await userResponse.json()) as any

		if (!githubUser.id) {
			throw new Error("Failed to get user info from GitHub")
		}

		// Check if database is connected
		if (!User.sequelize) {
			logger.error("Database not connected")
			throw new Error("Database not connected")
		}

		// Test database connection
		try {
			await User.sequelize.authenticate()
			logger.info("Database connection verified")
		} catch (dbError) {
			logger.error("Database connection test failed:", dbError)
			throw new Error("Database connection failed")
		}

		// Find or create user
		logger.info("Looking up user in database:", { githubId: githubUser.id })
		let user = await User.findOne({ where: { githubId: githubUser.id } })
		logger.info("User lookup result:", {
			found: !!user,
			userId: user ? user.get("id") : null,
		})

		if (user) {
			// Update existing user
			logger.info("Updating existing user:", {
				userId: user.get("id"),
				username: user.get("username"),
			})

			user.set("accessToken", accessToken)
			user.set("refreshToken", tokenData.refresh_token)
			user.set("lastLoginAt", new Date())
			user.set("avatarUrl", githubUser.avatar_url || user.get("avatarUrl"))
			user.set("displayName", githubUser.name || githubUser.login)
			user.set("email", githubUser.email || user.get("email"))

			await user.save()
			logger.info(`Updated existing user: ${githubUser.login}`)
		} else {
			// Create new user
			logger.info("Creating new user:", {
				githubId: githubUser.id,
				username: githubUser.login,
				email: githubUser.email,
			})

			try {
				user = await User.create({
					githubId: githubUser.id,
					username: githubUser.login,
					displayName: githubUser.name || githubUser.login,
					email: githubUser.email,
					avatarUrl: githubUser.avatar_url || `https://github.com/${githubUser.login}.png`,
					profileUrl: githubUser.html_url,
					accessToken,
					refreshToken: tokenData.refresh_token,
					lastLoginAt: new Date(),
				})

				logger.info(`Created new user successfully: ${githubUser.login}`, {
					userId: user.get("id"),
				})
			} catch (createError) {
				logger.error("Failed to create user:", createError)
				throw new Error(
					`User creation failed: ${createError instanceof Error ? createError.message : "Unknown error"}`,
				)
			}
		}

		// Check if user was created successfully
		if (!user) {
			logger.error("User creation failed - user is null/undefined")
			throw new Error("User creation failed")
		}

		// Get user ID using .get() method to avoid shadowing issues
		const userId = user.get("id")
		if (!userId) {
			logger.error("User creation failed - user.id is undefined:", {
				userData: user.toJSON(),
				userId: userId,
			})
			throw new Error("User creation failed - no ID")
		}

		logger.info("User created/updated successfully:", {
			id: userId,
			username: user.get("username"),
			githubId: user.get("githubId"),
		})

		// Generate JWT token
		const token = generateToken(userId.toString())
		logger.info("JWT token generated successfully")

		// Redirect to frontend with token
		const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3000"
		logger.info(`Redirecting to frontend: ${frontendUrl}/auth/callback`)
		return res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
	} catch (error) {
		logger.error("GitHub OAuth callback error:", error)
		const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:3000"
		return res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`)
	}
})

export default router
