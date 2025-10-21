import { ConversationContext, ToolCallRecord, ConversationState } from "./types"
import { logger } from "../utils/logger"

export class ContextManager {
	private static instance: ContextManager
	private contexts: Map<string, ConversationContext> = new Map()
	private maxContexts: number = 100
	private maxMessagesPerContext: number = 1000
	private maxToolCallsPerContext: number = 500

	private constructor() {}

	public static getInstance(): ContextManager {
		if (!ContextManager.instance) {
			ContextManager.instance = new ContextManager()
		}
		return ContextManager.instance
	}

	public createContext(workspacePath: string, repositoryId?: number, userId?: number, initialTask?: string): string {
		const contextId = this.generateContextId(workspacePath, repositoryId, userId)

		const context: ConversationContext = {
			messages: [],
			toolCallHistory: [],
			currentTask: initialTask,
			repositoryId,
			userId,
			workspacePath,
			workspaceManager: undefined,
			accessToken: undefined,
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		this.contexts.set(contextId, context)

		// Clean up old contexts if we exceed the limit
		this.cleanupOldContexts()

		logger.info("Context created", {
			contextId,
			workspacePath,
			repositoryId,
			userId,
		})

		return contextId
	}

	public getContext(contextId: string): ConversationContext | null {
		return this.contexts.get(contextId) || null
	}

	public updateContext(contextId: string, context: ConversationContext): void {
		context.updatedAt = new Date()
		this.contexts.set(contextId, context)

		logger.debug("Context updated", {
			contextId,
			messageCount: context.messages.length,
			toolCallCount: context.toolCallHistory.length,
		})
	}

	public addMessage(contextId: string, message: any): boolean {
		const context = this.getContext(contextId)
		if (!context) {
			logger.warn("Attempted to add message to non-existent context", { contextId })
			return false
		}

		context.messages.push(message)
		context.updatedAt = new Date()

		// Trim messages if we exceed the limit
		if (context.messages.length > this.maxMessagesPerContext) {
			context.messages = context.messages.slice(-this.maxMessagesPerContext)
			logger.warn("Context messages trimmed due to limit", {
				contextId,
				maxMessages: this.maxMessagesPerContext,
			})
		}

		this.updateContext(contextId, context)
		return true
	}

	public addToolCall(contextId: string, toolCall: ToolCallRecord): boolean {
		const context = this.getContext(contextId)
		if (!context) {
			logger.warn("Attempted to add tool call to non-existent context", { contextId })
			return false
		}

		context.toolCallHistory.push(toolCall)
		context.updatedAt = new Date()

		// Trim tool calls if we exceed the limit
		if (context.toolCallHistory.length > this.maxToolCallsPerContext) {
			context.toolCallHistory = context.toolCallHistory.slice(-this.maxToolCallsPerContext)
			logger.warn("Context tool calls trimmed due to limit", {
				contextId,
				maxToolCalls: this.maxToolCallsPerContext,
			})
		}

		this.updateContext(contextId, context)
		return true
	}

	public getContextState(contextId: string): ConversationState | null {
		const context = this.getContext(contextId)
		if (!context) return null

		const totalTokens = this.estimateTokenCount(context.messages)
		const totalToolCalls = context.toolCallHistory.length
		const isActive = context.messages.length > 0
		const lastActivity = context.updatedAt

		return {
			context,
			isActive,
			lastActivity,
			totalTokens,
			totalToolCalls,
		}
	}

	public getAllContexts(): Map<string, ConversationContext> {
		return new Map(this.contexts)
	}

	public getContextsByRepository(repositoryId: number): ConversationContext[] {
		const contexts: ConversationContext[] = []

		for (const context of this.contexts.values()) {
			if (context.repositoryId === repositoryId) {
				contexts.push(context)
			}
		}

		return contexts
	}

	public getContextsByUser(userId: number): ConversationContext[] {
		const contexts: ConversationContext[] = []

		for (const context of this.contexts.values()) {
			if (context.userId === userId) {
				contexts.push(context)
			}
		}

		return contexts
	}

	public deleteContext(contextId: string): boolean {
		const deleted = this.contexts.delete(contextId)

		if (deleted) {
			logger.info("Context deleted", { contextId })
		} else {
			logger.warn("Attempted to delete non-existent context", { contextId })
		}

		return deleted
	}

	public clearAllContexts(): void {
		const count = this.contexts.size
		this.contexts.clear()

		logger.info("All contexts cleared", { count })
	}

	public getContextStats(): {
		totalContexts: number
		activeContexts: number
		totalMessages: number
		totalToolCalls: number
		averageMessagesPerContext: number
		averageToolCallsPerContext: number
	} {
		const contexts = Array.from(this.contexts.values())
		const totalContexts = contexts.length
		const activeContexts = contexts.filter((c) => c.messages.length > 0).length
		const totalMessages = contexts.reduce((sum, c) => sum + c.messages.length, 0)
		const totalToolCalls = contexts.reduce((sum, c) => sum + c.toolCallHistory.length, 0)
		const averageMessagesPerContext = totalContexts > 0 ? totalMessages / totalContexts : 0
		const averageToolCallsPerContext = totalContexts > 0 ? totalToolCalls / totalContexts : 0

		return {
			totalContexts,
			activeContexts,
			totalMessages,
			totalToolCalls,
			averageMessagesPerContext,
			averageToolCallsPerContext,
		}
	}

	public exportContext(contextId: string): string | null {
		const context = this.getContext(contextId)
		if (!context) return null

		return JSON.stringify(
			{
				contextId,
				context,
				exportedAt: new Date().toISOString(),
			},
			null,
			2,
		)
	}

	public importContext(exportedData: string): string | null {
		try {
			const data = JSON.parse(exportedData)
			const { contextId, context } = data

			if (!contextId || !context) {
				throw new Error("Invalid export data format")
			}

			// Generate new context ID to avoid conflicts
			const newContextId = this.generateContextId(context.workspacePath, context.repositoryId, context.userId)

			this.contexts.set(newContextId, context)

			logger.info("Context imported", {
				originalContextId: contextId,
				newContextId,
				messageCount: context.messages.length,
				toolCallCount: context.toolCallHistory.length,
			})

			return newContextId
		} catch (error) {
			logger.error("Failed to import context", error)
			return null
		}
	}

	private generateContextId(workspacePath: string, repositoryId?: number, userId?: number): string {
		const timestamp = Date.now()
		const workspaceHash = this.hashString(workspacePath)
		const repoPart = repositoryId ? `-repo${repositoryId}` : ""
		const userPart = userId ? `-user${userId}` : ""

		return `ctx-${workspaceHash}${repoPart}${userPart}-${timestamp}`
	}

	private hashString(str: string): string {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(36)
	}

	private estimateTokenCount(messages: any[]): number {
		// Rough estimation: 1 token ≈ 4 characters
		const totalChars = messages.reduce((sum, msg) => {
			return sum + (msg.content?.length || 0)
		}, 0)

		return Math.ceil(totalChars / 4)
	}

	private cleanupOldContexts(): void {
		if (this.contexts.size <= this.maxContexts) return

		// Sort contexts by last update time (oldest first)
		const sortedContexts = Array.from(this.contexts.entries()).sort(
			([, a], [, b]) => a.updatedAt.getTime() - b.updatedAt.getTime(),
		)

		// Remove oldest contexts until we're under the limit
		const toRemove = sortedContexts.slice(0, this.contexts.size - this.maxContexts)

		for (const [contextId] of toRemove) {
			this.contexts.delete(contextId)
		}

		logger.info("Cleaned up old contexts", {
			removed: toRemove.length,
			remaining: this.contexts.size,
		})
	}

	public setLimits(maxContexts: number, maxMessagesPerContext: number, maxToolCallsPerContext: number): void {
		this.maxContexts = maxContexts
		this.maxMessagesPerContext = maxMessagesPerContext
		this.maxToolCallsPerContext = maxToolCallsPerContext

		logger.info("Context limits updated", {
			maxContexts,
			maxMessagesPerContext,
			maxToolCallsPerContext,
		})
	}
}
