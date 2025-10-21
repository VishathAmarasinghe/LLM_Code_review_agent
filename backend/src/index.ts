// Load environment variables FIRST
import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import session from "express-session"

import { errorHandler } from "./middleware/errorHandler"
import { notFoundHandler } from "./middleware/notFoundHandler"
import { logger } from "./utils/logger"
import connectDB, { sequelize, createSequelizeInstance } from "./config/database"
import passport, { initializeGitHubStrategy } from "./config/passport"
// Import models to ensure they are initialized
import "./models"
import codeReviewRoutes from "./routes/codeReview"
import healthRoutes from "./routes/health"
import authRoutes from "./routes/auth"
import githubRoutes from "./routes/github"
import testRoutes from "./routes/test"
import authSimpleRoutes from "./routes/auth-simple"
import indexingRoutes from "./routes/indexing"
import searchRoutes from "./routes/search"
import repositoriesRoutes from "./routes/repositories"
import pullRequestRoutes from "./routes/pullRequests"
import eventsRoutes from "./routes/events"
import { LLMManager } from "./llm/llmManager"

// Initialize GitHub OAuth strategy after environment variables are loaded
initializeGitHubStrategy()

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())

// CORS configuration
app.use(
	cors({
		origin: process.env.CORS_ORIGIN || "http://localhost:3000",
		credentials: true,
		optionsSuccessStatus: 200,
	}),
)

// Session configuration (simplified for OAuth flow)
app.use(
	session({
		secret: process.env.SESSION_SECRET!,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: process.env.NODE_ENV === "production",
			httpOnly: true,
			maxAge: 24 * 60 * 60 * 1000, // 24 hours
		},
	}),
)

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

// Rate limiting
const limiter = rateLimit({
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
	max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // limit each IP to 100 requests per windowMs
	message: {
		error: "Too many requests from this IP, please try again later.",
	},
	standardHeaders: true,
	legacyHeaders: false,
})
app.use("/api/", limiter)

// Webhook middleware (must be before JSON parsing for signature verification)
app.use("/api/webhooks/github", express.raw({ type: "application/json", limit: "10mb" }))

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Logging middleware
app.use(
	morgan("combined", {
		stream: {
			write: (message: string) => logger.info(message.trim()),
		},
	}),
)

// Routes
app.use("/api/health", healthRoutes)
app.use("/api/auth", authRoutes)
app.use("/auth", authRoutes) // Add direct auth routes for OAuth callbacks
app.use("/auth-simple", authSimpleRoutes) // Simple OAuth without session store
app.use("/api/github", githubRoutes)
app.use("/api/code-review", codeReviewRoutes)
app.use("/api/indexing", indexingRoutes) // Code indexing routes
app.use("/api/search", searchRoutes) // Code search routes
app.use("/api/repositories", repositoriesRoutes) // Repository routes
app.use("/api", pullRequestRoutes) // Pull request routes
app.use("/api/test", testRoutes) // Test routes for debugging
app.use("/api/events", eventsRoutes)

// Root endpoint
app.get("/", (req, res) => {
	res.json({
		message: "Code Review Agent API",
		version: "1.0.0",
		status: "running",
	})
})

// Error handling middleware (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

// Connect to database and start server
const startServer = async () => {
	try {
		// Connect to database first
		await connectDB()

		// Initialize LLM manager
		try {
			const apiKey = process.env.OPENAI_API_KEY
			if (!apiKey) {
				logger.warn("OPENAI_API_KEY not set. LLM features will be disabled.")
			} else {
				LLMManager.getInstance().initialize({
					apiKey,
					model: process.env.LLM_MODEL || "gpt-4o-mini",
					baseURL: process.env.LLM_BASE_URL,
					temperature: Number(process.env.LLM_TEMPERATURE ?? 0.7),
					maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 4000),
					timeout: Number(process.env.LLM_TIMEOUT ?? 300000), // 5 minutes default
				} as any)
			}
		} catch (e) {
			logger.error("Failed to initialize LLMManager", e)
		}

		// Start server
		app.listen(PORT, () => {
			logger.info(`🚀 Server running on port ${PORT}`)
			logger.info(`📖 API Documentation: http://localhost:${PORT}/api/health`)
		})
	} catch (error) {
		logger.error("Failed to start server:", error)
		process.exit(1)
	}
}

startServer()

export default app
