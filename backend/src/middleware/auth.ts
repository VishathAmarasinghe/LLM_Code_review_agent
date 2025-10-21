import { Request, Response, NextFunction } from "express"
import * as jwt from "jsonwebtoken"
import { User } from "../models"
import { logger } from "../utils/logger"

export interface AuthenticatedRequest extends Request {
	user?: any
}

// Session-based authentication middleware
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
	if (req.isAuthenticated && req.isAuthenticated()) {
		return next()
	}

	res.status(401).json({
		success: false,
		error: "Authentication required",
	})
}

// JWT authentication middleware
export const requireJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
	try {
		const token = req.header("Authorization")?.replace("Bearer ", "")

		if (!token) {
			res.status(401).json({
				success: false,
				error: "Access token required",
			})
			return
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
		const user = await User.findByPk(decoded.userId)

		if (!user) {
			res.status(401).json({
				success: false,
				error: "Invalid token",
			})
			return
		}

		req.user = user
		next()
	} catch (error) {
		logger.error("JWT authentication error:", error)
		res.status(401).json({
			success: false,
			error: "Invalid token",
		})
	}
}

// Optional authentication middleware (doesn't fail if no auth)
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
	try {
		const token = req.header("Authorization")?.replace("Bearer ", "")

		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
			const user = await User.findByPk(decoded.userId)
			req.user = user
		}

		next()
	} catch (error) {
		// Continue without authentication
		next()
	}
}

// Generate JWT token
export const generateToken = (userId: string): string => {
	return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" })
}

// Check if user has GitHub access token
export const requireGitHubToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
	if (!req.user?.accessToken) {
		res.status(401).json({
			success: false,
			error: "GitHub access token required",
		})
		return
	}

	next()
}
