import { logger } from "../utils/logger"

export interface ErrorContext {
	toolName: string
	action: string
	repositoryId?: number
	userId?: number
	timestamp: Date
}

export class ToolErrorHandler {
	private static instance: ToolErrorHandler

	private constructor() {}

	public static getInstance(): ToolErrorHandler {
		if (!ToolErrorHandler.instance) {
			ToolErrorHandler.instance = new ToolErrorHandler()
		}
		return ToolErrorHandler.instance
	}

	public async handleError(action: string, error: Error, context?: Partial<ErrorContext>): Promise<void> {
		const errorContext: ErrorContext = {
			toolName: context?.toolName || "unknown",
			action: action,
			repositoryId: context?.repositoryId,
			userId: context?.userId,
			timestamp: new Date(),
		}

		// Log the error with context
		logger.error(`Tool Error [${errorContext.toolName}]: ${action}`, {
			error: error.message,
			stack: error.stack,
			context: errorContext,
		})

		// Handle specific error types
		if (error.name === "ValidationError") {
			await this.handleValidationError(error, errorContext)
		} else if (error.name === "FileSystemError") {
			await this.handleFileSystemError(error, errorContext)
		} else if (error.name === "NetworkError") {
			await this.handleNetworkError(error, errorContext)
		} else {
			await this.handleGenericError(error, errorContext)
		}
	}

	private async handleValidationError(error: Error, context: ErrorContext): Promise<void> {
		logger.warn(`Validation error in ${context.toolName}: ${error.message}`)
		// Could send specific validation error responses to user
	}

	private async handleFileSystemError(error: Error, context: ErrorContext): Promise<void> {
		logger.error(`File system error in ${context.toolName}: ${error.message}`)
		// Could handle file permission issues, missing files, etc.
	}

	private async handleNetworkError(error: Error, context: ErrorContext): Promise<void> {
		logger.error(`Network error in ${context.toolName}: ${error.message}`)
		// Could handle API timeouts, connection issues, etc.
	}

	private async handleGenericError(error: Error, context: ErrorContext): Promise<void> {
		logger.error(`Generic error in ${context.toolName}: ${error.message}`)
		// Handle unexpected errors
	}

	public createErrorResponse(error: Error, toolName: string): string {
		if (error.name === "ValidationError") {
			return `Validation error in ${toolName}: ${error.message}`
		} else if (error.name === "FileSystemError") {
			return `File system error in ${toolName}: ${error.message}`
		} else if (error.name === "NetworkError") {
			return `Network error in ${toolName}: ${error.message}`
		} else {
			return `Error in ${toolName}: ${error.message}`
		}
	}

	public createMissingParameterError(toolName: string, paramName: string): string {
		return `Missing required parameter '${paramName}' for tool '${toolName}'`
	}

	public createInvalidParameterError(toolName: string, paramName: string, reason: string): string {
		return `Invalid parameter '${paramName}' for tool '${toolName}': ${reason}`
	}

	public createToolNotFoundError(toolName: string): string {
		return `Tool '${toolName}' not found or not available`
	}

	public createExecutionError(toolName: string, reason: string): string {
		return `Failed to execute tool '${toolName}': ${reason}`
	}
}

// Custom error classes
export class ValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "ValidationError"
	}
}

export class FileSystemError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "FileSystemError"
	}
}

export class NetworkError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "NetworkError"
	}
}

export class ToolNotFoundError extends Error {
	constructor(toolName: string) {
		super(`Tool '${toolName}' not found`)
		this.name = "ToolNotFoundError"
	}
}

export class ToolExecutionError extends Error {
	constructor(toolName: string, reason: string) {
		super(`Tool '${toolName}' execution failed: ${reason}`)
		this.name = "ToolExecutionError"
	}
}
