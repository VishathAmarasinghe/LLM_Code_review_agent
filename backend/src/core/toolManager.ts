import { ToolExecutor } from "./toolExecutor"
import { ToolRegistry } from "./toolRegistry"
import { ParameterValidator } from "./parameterValidator"
import { ToolErrorHandler } from "./errorHandler"
import { ToolUse, ToolName, ToolExecutionContext, ToolExecutionResult } from "../types/tools"
import { logger } from "../utils/logger"

/**
 * Central manager for all tool-related operations
 * Provides a unified interface for tool registration, validation, and execution
 */
export class ToolManager {
	private static instance: ToolManager
	private toolExecutor: ToolExecutor
	private toolRegistry: ToolRegistry
	private parameterValidator: ParameterValidator
	private errorHandler: ToolErrorHandler

	private constructor() {
		this.toolExecutor = ToolExecutor.getInstance()
		this.toolRegistry = ToolRegistry.getInstance()
		this.parameterValidator = ParameterValidator.getInstance()
		this.errorHandler = ToolErrorHandler.getInstance()
	}

	public static getInstance(): ToolManager {
		if (!ToolManager.instance) {
			ToolManager.instance = new ToolManager()
		}
		return ToolManager.instance
	}

	/**
	 * Execute a single tool
	 */
	public async executeTool(toolUse: ToolUse, context: ToolExecutionContext): Promise<ToolExecutionResult> {
		return await this.toolExecutor.executeTool(toolUse, context)
	}

	/**
	 * Execute multiple tools sequentially
	 */
	public async executeTools(toolUses: ToolUse[], context: ToolExecutionContext): Promise<ToolExecutionResult[]> {
		return await this.toolExecutor.executeMultipleTools(toolUses, context)
	}

	/**
	 * Validate a tool use before execution
	 */
	public validateToolUse(toolUse: ToolUse) {
		return this.parameterValidator.validateToolUse(toolUse)
	}

	/**
	 * Get all available tools
	 */
	public getAvailableTools(): ToolName[] {
		return this.toolRegistry.getAvailableTools()
	}

	/**
	 * Get tool description
	 */
	public getToolDescription(toolName: ToolName): string {
		return this.toolRegistry.getToolDescription(toolName)
	}

	/**
	 * Get tool handler (for schema generation or availability checks)
	 */
	public getHandler(toolName: ToolName) {
		return this.toolRegistry.getHandler(toolName)
	}

	/**
	 * Get tool parameters
	 */
	public getToolParameters(toolName: ToolName) {
		return this.toolRegistry.getToolParameters(toolName)
	}

	/**
	 * Check if a tool is available
	 */
	public isToolAvailable(toolName: ToolName): boolean {
		return this.toolRegistry.getHandler(toolName) !== undefined
	}

	/**
	 * Get tool schema for LLM integration
	 */
	public getToolSchema(toolName: ToolName) {
		const handler = this.toolRegistry.getHandler(toolName)
		if (!handler) {
			return null
		}

		const parameters = this.getToolParameters(toolName)
		const properties: Record<string, any> = {}
		const required: string[] = []

		for (const param of parameters) {
			properties[param.name] = {
				type: param.type,
				description: param.description,
			}

			if (param.required) {
				required.push(param.name)
			}
		}

		return {
			name: toolName,
			description: handler.description,
			parameters: {
				type: "object",
				properties,
				required,
			},
		}
	}

	/**
	 * Get all tool schemas for LLM integration
	 */
	public getAllToolSchemas() {
		const tools = this.getAvailableTools()
		return tools.map((toolName) => this.getToolSchema(toolName)).filter(Boolean)
	}

	/**
	 * Create a tool use from raw data
	 */
	public createToolUse(name: ToolName, params: Record<string, any>, partial: boolean = false): ToolUse {
		return {
			type: "tool_use",
			name,
			params,
			partial,
		}
	}

	/**
	 * Create tool execution context
	 */
	public createExecutionContext(
		cwd: string,
		pushToolResult: (content: any) => void,
		handleError: (action: string, error: Error) => Promise<void>,
		repositoryId?: number,
		userId?: number,
		workspaceManager?: any,
		accessToken?: string,
	): ToolExecutionContext {
		const context: ToolExecutionContext = {
			cwd,
			pushToolResult,
			handleError,
		}
		if (repositoryId !== undefined) {
			;(context as any).repositoryId = repositoryId
		}
		if (userId !== undefined) {
			;(context as any).userId = userId
		}
		if (workspaceManager !== undefined) {
			;(context as any).workspaceManager = workspaceManager
		}
		if (accessToken !== undefined) {
			;(context as any).accessToken = accessToken
		}
		return context
	}

	/**
	 * Get tool usage statistics (if implemented)
	 */
	public getToolUsageStats(): Record<ToolName, number> {
		// This could be implemented to track tool usage
		// For now, return empty object
		return {} as Record<ToolName, number>
	}

	/**
	 * Reset tool manager (useful for testing)
	 */
	public reset(): void {
		// Reset all singletons
		this.toolExecutor = ToolExecutor.getInstance()
		this.toolRegistry = ToolRegistry.getInstance()
		this.parameterValidator = ParameterValidator.getInstance()
		this.errorHandler = ToolErrorHandler.getInstance()
	}
}
