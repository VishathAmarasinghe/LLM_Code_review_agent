import { ToolRegistry } from "./toolRegistry"
import { ParameterValidator } from "./parameterValidator"
import { ToolErrorHandler, ToolNotFoundError, ToolExecutionError } from "./errorHandler"
import { ToolUse, ToolName, ToolExecutionContext, ToolExecutionResult } from "../types/tools"
import { logger } from "../utils/logger"

export class ToolExecutor {
	private static instance: ToolExecutor
	private toolRegistry: ToolRegistry
	private parameterValidator: ParameterValidator
	private errorHandler: ToolErrorHandler

	private constructor() {
		this.toolRegistry = ToolRegistry.getInstance()
		this.parameterValidator = ParameterValidator.getInstance()
		this.errorHandler = ToolErrorHandler.getInstance()
	}

	public static getInstance(): ToolExecutor {
		if (!ToolExecutor.instance) {
			ToolExecutor.instance = new ToolExecutor()
		}
		return ToolExecutor.instance
	}

	public async executeTool(toolUse: ToolUse, context: ToolExecutionContext): Promise<ToolExecutionResult> {
		const startTime = Date.now()

		try {
			logger.info(`Executing tool: ${toolUse.name}`, {
				toolName: toolUse.name,
				params: toolUse.params,
				repositoryId: context.repositoryId,
				userId: context.userId,
			})

			// Validate the tool exists
			const handler = this.toolRegistry.getHandler(toolUse.name)
			if (!handler) {
				throw new ToolNotFoundError(toolUse.name)
			}

			// Validate parameters
			const validation = this.parameterValidator.validateToolUse(toolUse)
			if (!validation.isValid) {
				const errorMessage = validation.errors.join("; ")
				throw new Error(`Parameter validation failed: ${errorMessage}`)
			}

			// Create result container
			let result: any = null
			let error: string | undefined = undefined

			// Create pushToolResult function that captures the result
			const pushToolResult = (content: any) => {
				result = content
			}

			// Create handleError function that captures errors
			const handleError = async (action: string, err: Error) => {
				error = this.errorHandler.createErrorResponse(err, toolUse.name)
				await this.errorHandler.handleError(action, err, {
					toolName: toolUse.name,
					repositoryId: context.repositoryId,
					userId: context.userId,
				})
			}

			// Execute the tool
			await handler.handler(
				context.cwd,
				toolUse,
				pushToolResult,
				handleError,
				context.repositoryId,
				context.userId,
				context.workspaceManager,
				context.accessToken,
			)

			// Check if execution resulted in an error
			if (error) {
				return {
					success: false,
					error,
					toolName: toolUse.name,
				}
			}

			const executionTime = Date.now() - startTime
			logger.info(`Tool execution completed: ${toolUse.name}`, {
				toolName: toolUse.name,
				executionTimeMs: executionTime,
				hasResult: result !== null,
			})

			return {
				success: true,
				result,
				toolName: toolUse.name,
			}
		} catch (error) {
			const executionTime = Date.now() - startTime
			const errorMessage = error instanceof Error ? error.message : String(error)

			logger.error(`Tool execution failed: ${toolUse.name}`, {
				toolName: toolUse.name,
				error: errorMessage,
				executionTimeMs: executionTime,
			})

			await this.errorHandler.handleError(
				"tool_execution",
				error instanceof Error ? error : new Error(errorMessage),
				{
					toolName: toolUse.name,
					repositoryId: context.repositoryId,
					userId: context.userId,
				},
			)

			return {
				success: false,
				error: this.errorHandler.createErrorResponse(
					error instanceof Error ? error : new Error(errorMessage),
					toolUse.name,
				),
				toolName: toolUse.name,
			}
		}
	}

	public async executeMultipleTools(
		toolUses: ToolUse[],
		context: ToolExecutionContext,
	): Promise<ToolExecutionResult[]> {
		const results: ToolExecutionResult[] = []

		for (const toolUse of toolUses) {
			try {
				const result = await this.executeTool(toolUse, context)
				results.push(result)

				// If a tool fails, we might want to stop execution or continue
				// For now, we continue with other tools
				if (!result.success) {
					logger.warn(`Tool ${toolUse.name} failed, continuing with remaining tools`)
				}
			} catch (error) {
				logger.error(`Unexpected error executing tool ${toolUse.name}`, error)
				results.push({
					success: false,
					error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
					toolName: toolUse.name,
				})
			}
		}

		return results
	}

	public getAvailableTools(): ToolName[] {
		return this.toolRegistry.getAvailableTools()
	}

	public getToolDescription(toolName: ToolName): string {
		return this.toolRegistry.getToolDescription(toolName)
	}

	public getToolParameters(toolName: ToolName) {
		return this.toolRegistry.getToolParameters(toolName)
	}

	public validateToolUse(toolUse: ToolUse) {
		return this.parameterValidator.validateToolUse(toolUse)
	}

	public isToolAvailable(toolName: ToolName): boolean {
		return this.toolRegistry.getHandler(toolName) !== undefined
	}
}
