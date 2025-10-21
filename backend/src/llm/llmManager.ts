import { ConversationManager } from "./conversationManager"
import { ContextManager } from "./contextManager"
import { SystemPromptBuilder } from "./systemPromptBuilder"
import { ToolSchemaGenerator } from "./toolSchemaGenerator"
import { ConversationContext, LLMConfiguration, SystemPromptSettings, ConversationState } from "./types"
import { logger } from "../utils/logger"

/**
 * Central manager for all LLM-related operations
 * Provides a unified interface for conversation management, context handling, and tool integration
 */
export class LLMManager {
	private static instance: LLMManager
	private conversationManager: ConversationManager
	private contextManager: ContextManager
	private systemPromptBuilder: SystemPromptBuilder
	private toolSchemaGenerator: ToolSchemaGenerator
	private isInitialized: boolean = false

	private constructor() {
		this.conversationManager = ConversationManager.getInstance()
		this.contextManager = ContextManager.getInstance()
		this.systemPromptBuilder = SystemPromptBuilder.getInstance()
		this.toolSchemaGenerator = ToolSchemaGenerator.getInstance()
	}

	public static getInstance(): LLMManager {
		if (!LLMManager.instance) {
			LLMManager.instance = new LLMManager()
		}
		return LLMManager.instance
	}

	/**
	 * Initialize the LLM manager with OpenAI configuration
	 */
	public initialize(configuration: LLMConfiguration): void {
		this.conversationManager.initialize(configuration)
		this.isInitialized = true

		logger.info("LLMManager initialized", {
			model: configuration.model,
			baseURL: configuration.baseURL,
		})
	}

	/**
	 * Check if the manager is initialized
	 */
	public getInitialized(): boolean {
		return this.isInitialized
	}

	/**
	 * Create a new conversation context
	 */
	public createConversationContext(
		workspacePath: string,
		repositoryId?: number,
		userId?: number,
		initialTask?: string,
	): string {
		return this.contextManager.createContext(workspacePath, repositoryId, userId, initialTask)
	}

	/**
	 * Process a user message and get AI response
	 */
	public async processMessage(
		contextId: string,
		userMessage: string,
		systemPromptSettings?: SystemPromptSettings,
	): Promise<{
		response: string
		toolCalls: any[]
		updatedContext: ConversationContext
	}> {
		if (!this.isInitialized) {
			throw new Error("LLMManager not initialized. Call initialize() first.")
		}

		const context = this.contextManager.getContext(contextId)
		if (!context) {
			throw new Error(`Context not found: ${contextId}`)
		}

		const result = await this.conversationManager.processMessage(userMessage, context, systemPromptSettings)

		// Update context in manager
		this.contextManager.updateContext(contextId, result.updatedContext)

		return result
	}

	/**
	 * Get conversation context
	 */
	public getContext(contextId: string): ConversationContext | null {
		return this.contextManager.getContext(contextId)
	}

	/**
	 * Get conversation state
	 */
	public getConversationState(contextId: string): ConversationState | null {
		return this.contextManager.getContextState(contextId)
	}

	/**
	 * Get all contexts for a repository
	 */
	public getContextsByRepository(repositoryId: number): ConversationContext[] {
		return this.contextManager.getContextsByRepository(repositoryId)
	}

	/**
	 * Get all contexts for a user
	 */
	public getContextsByUser(userId: number): ConversationContext[] {
		return this.contextManager.getContextsByUser(userId)
	}

	/**
	 * Delete a conversation context
	 */
	public deleteContext(contextId: string): boolean {
		return this.contextManager.deleteContext(contextId)
	}

	/**
	 * Clear all conversation contexts
	 */
	public clearAllContexts(): void {
		this.contextManager.clearAllContexts()
	}

	/**
	 * Get system prompt for a context
	 */
	public async getSystemPrompt(contextId: string, settings?: SystemPromptSettings): Promise<string> {
		const context = this.contextManager.getContext(contextId)
		if (!context) {
			throw new Error(`Context not found: ${contextId}`)
		}

		return await this.systemPromptBuilder.buildSystemPrompt(context, settings)
	}

	/**
	 * Get tool schemas for OpenAI
	 */
	public getToolSchemas(): any[] {
		return this.toolSchemaGenerator.generateAllToolSchemas()
	}

	/**
	 * Get tool schemas for a specific mode
	 */
	public getToolSchemasForMode(mode: "code_review" | "analysis" | "exploration"): any[] {
		return this.toolSchemaGenerator.generateToolSchemasForMode(mode)
	}

	/**
	 * Get tool usage statistics for a context
	 */
	public getToolUsageStats(contextId: string): Record<string, number> {
		const context = this.contextManager.getContext(contextId)
		if (!context) {
			return {}
		}

		return this.conversationManager.getToolUsageStats(context)
	}

	/**
	 * Get average tool execution time for a context
	 */
	public getAverageToolExecutionTime(contextId: string): number {
		const context = this.contextManager.getContext(contextId)
		if (!context) {
			return 0
		}

		return this.conversationManager.getAverageToolExecutionTime(context)
	}

	/**
	 * Export conversation context
	 */
	public exportContext(contextId: string): string | null {
		return this.contextManager.exportContext(contextId)
	}

	/**
	 * Import conversation context
	 */
	public importContext(exportedData: string): string | null {
		return this.contextManager.importContext(exportedData)
	}

	/**
	 * Get context statistics
	 */
	public getContextStats(): {
		totalContexts: number
		activeContexts: number
		totalMessages: number
		totalToolCalls: number
		averageMessagesPerContext: number
		averageToolCallsPerContext: number
	} {
		return this.contextManager.getContextStats()
	}

	/**
	 * Set context limits
	 */
	public setContextLimits(maxContexts: number, maxMessagesPerContext: number, maxToolCallsPerContext: number): void {
		this.contextManager.setLimits(maxContexts, maxMessagesPerContext, maxToolCallsPerContext)
	}

	/**
	 * Get tool schema summary
	 */
	public getToolSchemaSummary(): Record<string, any> {
		return this.toolSchemaGenerator.getToolSchemaSummary()
	}

	/**
	 * Export tool schemas as JSON
	 */
	public exportToolSchemasAsJSON(): string {
		return this.toolSchemaGenerator.exportToolSchemasAsJSON()
	}

	/**
	 * Export tool schemas for OpenAI
	 */
	public exportToolSchemasForOpenAI(): string {
		return this.toolSchemaGenerator.exportToolSchemasForOpenAI()
	}

	/**
	 * Validate tool schema
	 */
	public validateToolSchema(schema: any): boolean {
		return this.toolSchemaGenerator.validateToolSchema(schema)
	}

	/**
	 * Get all available contexts
	 */
	public getAllContexts(): Map<string, ConversationContext> {
		return this.contextManager.getAllContexts()
	}

	/**
	 * Reset the manager (useful for testing)
	 */
	public reset(): void {
		this.conversationManager = ConversationManager.getInstance()
		this.contextManager = ContextManager.getInstance()
		this.systemPromptBuilder = SystemPromptBuilder.getInstance()
		this.toolSchemaGenerator = ToolSchemaGenerator.getInstance()
		this.isInitialized = false

		logger.info("LLMManager reset")
	}
}
