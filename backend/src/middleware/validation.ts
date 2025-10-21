import { Request, Response, NextFunction } from "express"
import * as Joi from "joi"
import { logger } from "../utils/logger"

export interface CodeReviewRequest {
	code: string
	language: string
	filename?: string
	repository?: string
	branch?: string
	commitHash?: string
	reviewType?: "security" | "performance" | "style" | "comprehensive"
	customInstructions?: string
}

const codeReviewSchema = Joi.object({
	code: Joi.string().required().min(1).max(1000000), // 1MB limit
	language: Joi.string()
		.required()
		.valid(
			"javascript",
			"typescript",
			"python",
			"java",
			"cpp",
			"csharp",
			"go",
			"rust",
			"php",
			"ruby",
			"swift",
			"kotlin",
			"scala",
			"html",
			"css",
			"sql",
			"yaml",
			"json",
			"markdown",
			"dockerfile",
			"shell",
		),
	filename: Joi.string().optional().max(255),
	repository: Joi.string().optional().max(255),
	branch: Joi.string().optional().max(255),
	commitHash: Joi.string().optional().max(64),
	reviewType: Joi.string()
		.optional()
		.valid("security", "performance", "style", "comprehensive")
		.default("comprehensive"),
	customInstructions: Joi.string().optional().max(5000),
})

export const validateCodeReviewRequest = (req: Request, res: Response, next: NextFunction): void => {
	const { error, value } = codeReviewSchema.validate(req.body, {
		abortEarly: false,
		stripUnknown: true,
	})

	if (error) {
		logger.warn("Validation error:", error.details)
		res.status(400).json({
			success: false,
			error: "Validation failed",
			details: error.details.map((detail) => ({
				field: detail.path.join("."),
				message: detail.message,
			})),
		})
		return
	}

	req.body = value
	next()
}

export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
	const pageSchema = Joi.object({
		page: Joi.number().integer().min(1).default(1),
		limit: Joi.number().integer().min(1).max(100).default(10),
		sortBy: Joi.string().valid("createdAt", "updatedAt", "language", "filename").default("createdAt"),
		sortOrder: Joi.string().valid("asc", "desc").default("desc"),
	})

	const { error, value } = pageSchema.validate(req.query, {
		abortEarly: false,
		stripUnknown: true,
	})

	if (error) {
		res.status(400).json({
			success: false,
			error: "Invalid pagination parameters",
			details: error.details.map((detail) => ({
				field: detail.path.join("."),
				message: detail.message,
			})),
		})
		return
	}

	req.query = value
	next()
}

// Generic validation middleware
export const validation = (schema: Joi.ObjectSchema, property: "body" | "query" | "params" = "body") => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const { error, value } = schema.validate(req[property], {
			abortEarly: false,
			stripUnknown: true,
		})

		if (error) {
			logger.warn("Validation error:", error.details)
			res.status(400).json({
				success: false,
				error: "Validation failed",
				details: error.details.map((detail) => ({
					field: detail.path.join("."),
					message: detail.message,
				})),
			})
			return
		}

		req[property] = value
		next()
	}
}
