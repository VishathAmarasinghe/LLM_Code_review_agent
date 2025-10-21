import { Router } from "express"
import { logger } from "../utils/logger"

const router = Router()

// Test route to check if backend is working
router.get("/test", (req, res) => {
	res.json({
		message: "Backend is working!",
		timestamp: new Date().toISOString(),
		environment: {
			NODE_ENV: process.env.NODE_ENV,
			PORT: process.env.PORT,
			GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? "Set" : "Not set",
			GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? "Set" : "Not set",
			GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
		},
	})
})

// Test GitHub OAuth redirect
router.get("/test-github", (req, res) => {
	const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL || "")}&scope=user:email,repo,read:user`

	res.json({
		message: "GitHub OAuth URL generated",
		githubAuthUrl,
		environment: {
			GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
			GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
		},
	})
})

// Test simple OAuth route
router.get("/test-simple-oauth", (req, res) => {
	const simpleOAuthUrl = `${process.env.CORS_ORIGIN || "http://localhost:3000"}/auth-simple/github-simple`

	res.json({
		message: "Simple OAuth route test",
		simpleOAuthUrl,
		environment: {
			CORS_ORIGIN: process.env.CORS_ORIGIN,
			GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
			GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
		},
	})
})

export default router
