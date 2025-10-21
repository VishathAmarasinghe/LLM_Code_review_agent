import OpenAI from "openai"
import { ToolManager } from "../core/toolManager"
import { ToolSchemaGenerator } from "./toolSchemaGenerator"
import { SystemPromptBuilder } from "./systemPromptBuilder"
import { XmlToolCallParser } from "./xmlToolCallParser"
import {
	OpenAIMessage,
	ConversationContext,
	ToolCallRecord,
	LLMConfiguration,
	ToolExecutionRequest,
	ToolExecutionResponse,
	ConversationState,
} from "./types"
import { logger } from "../utils/logger"
import { EventBus } from "../services/eventBus"

export class ConversationManager {
	private static instance: ConversationManager
	private toolManager: ToolManager
	private toolSchemaGenerator: ToolSchemaGenerator
	private systemPromptBuilder: SystemPromptBuilder
	private xmlToolCallParser: XmlToolCallParser
	private openai: OpenAI | null = null
	private configuration: LLMConfiguration | null = null

	private constructor() {
		this.toolManager = ToolManager.getInstance()
		this.toolSchemaGenerator = ToolSchemaGenerator.getInstance()
		this.systemPromptBuilder = SystemPromptBuilder.getInstance()
		this.xmlToolCallParser = XmlToolCallParser.getInstance()
	}

	public static getInstance(): ConversationManager {
		if (!ConversationManager.instance) {
			ConversationManager.instance = new ConversationManager()
		}
		return ConversationManager.instance
	}

	public initialize(configuration: LLMConfiguration): void {
		this.configuration = configuration
		this.openai = new OpenAI({
			apiKey: configuration.apiKey,
			baseURL: configuration.baseURL,
			timeout: configuration.timeout || 30000,
		})

		logger.info("ConversationManager initialized", {
			model: configuration.model,
			baseURL: configuration.baseURL,
		})
	}

	public async processMessage(
		userMessage: string,
		context: ConversationContext,
		systemPromptSettings?: any,
	): Promise<{
		response: string
		toolCalls: ToolCallRecord[]
		updatedContext: ConversationContext
	}> {
		if (!this.openai || !this.configuration) {
			throw new Error("ConversationManager not initialized. Call initialize() first.")
		}

		const startTime = Date.now()
		const toolCalls: ToolCallRecord[] = []

		try {
			// Add user message to context
			const userMessageObj: OpenAIMessage = {
				role: "user",
				content: userMessage,
			}
			context.messages.push(userMessageObj)

			// Build system prompt with intelligence-first approach
			const systemPrompt = await this.systemPromptBuilder.buildSystemPrompt(context, {
				...systemPromptSettings,
				customInstructions: `
## 🧠 MANDATORY INTELLIGENCE REQUIREMENTS

**BEFORE making ANY tool call, you MUST:**

1. **Think Aloud**: Explain what you're trying to understand and why
2. **Strategic Reasoning**: Connect your tool usage to your analysis goals
3. **Context Awareness**: Explain how this fits into your overall review strategy

**Example of REQUIRED thinking before tool calls:**
"I need to understand how this TodoList manages state because complex state often leads to bugs. Let me examine the main component to see the data flow."

**NOT acceptable:**
"I'll use read_file to read the file"

## 🎯 INTELLIGENT ANALYSIS APPROACH

- Focus on high-impact areas first
- Ask strategic questions about the code
- Look for patterns and architectural concerns
- Connect findings to business implications
- Prioritize issues by risk and impact

## 🚨 CRITICAL: NO MECHANICAL TOOL USAGE

Every tool call must be driven by intelligent reasoning, not systematic coverage. You are an expert analyst, not a tool executor.

${systemPromptSettings?.customInstructions || ""}
          `,
			})

			// Generate tool schemas
			const toolSchemas = this.toolSchemaGenerator.generateAllToolSchemas()

			// Prepare messages for OpenAI
			const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
				{ role: "system", content: systemPrompt },
				...context.messages.map((msg) => {
					if (msg.tool_calls) {
						return {
							role: "assistant" as const,
							content: msg.content || "",
							tool_calls: msg.tool_calls,
						}
					}
					if (msg.tool_call_id) {
						return {
							role: "tool" as const,
							content: msg.content || "",
							tool_call_id: msg.tool_call_id,
							name: msg.name || "",
						}
					}

					return {
						role: msg.role as "user" | "assistant" | "system",
						content: msg.content || "",
					}
				}),
			]

			// Emit LLM input event
			const llmInput: any = {
				model: this.configuration.model,
				messages,
				tools: toolSchemas.length > 0 ? toolSchemas : undefined,
				tool_choice: toolSchemas.length > 0 ? "auto" : undefined,
				temperature: this.configuration.temperature || 0.7,
				max_tokens: this.configuration.maxTokens || 4000,
			}

			const taskId = (context as any).variables?.taskId || "global"
			logger.info("Publishing LLM input event", { taskId, channel: `task:${taskId}` })

			EventBus.getInstance().publish(`task:${taskId}`, {
				type: "llm_input",
				taskId: (context as any).variables?.taskId,
				timestamp: new Date().toISOString(),
				data: llmInput,
			})

			// Make API call
			const completion = await this.openai.chat.completions.create(llmInput)

			// Emit LLM output event
			const outputTaskId = (context as any).variables?.taskId || "global"
			logger.info("Publishing LLM output event", { taskId: outputTaskId, channel: `task:${outputTaskId}` })

			EventBus.getInstance().publish(`task:${outputTaskId}`, {
				type: "llm_output",
				taskId: (context as any).variables?.taskId,
				timestamp: new Date().toISOString(),
				data: {
					model: completion.model,
					usage: completion.usage,
					finish_reason: completion.choices[0]?.finish_reason,
					response: completion.choices[0]?.message,
				},
			})

			const assistantMessage = completion.choices[0]?.message
			if (!assistantMessage) {
				throw new Error("No response from OpenAI")
			}

			// Check for XML tool calls in the response content
			const responseContent = assistantMessage.content || ""
			const xmlToolCalls = this.xmlToolCallParser.parseToolCallsFromText(responseContent)
			const cleanContent = this.xmlToolCallParser.removeToolCallsFromText(responseContent)

			logger.info("Processing LLM response", {
				hasNativeToolCalls: !!(assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0),
				hasXmlToolCalls: xmlToolCalls.length > 0,
				xmlToolCallNames: xmlToolCalls.map((tc) => tc.name),
				responseLength: responseContent.length,
				cleanContentLength: cleanContent.length,
			})

			// Add assistant message to context
			const assistantMessageObj: OpenAIMessage = {
				role: "assistant",
				content: cleanContent,
				tool_calls: assistantMessage.tool_calls as any,
			}
			context.messages.push(assistantMessageObj)

			// Process native tool calls if any
			if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
				for (const toolCall of assistantMessage.tool_calls) {
					const toolCallRecord = await this.executeToolCall(toolCall, context)
					toolCalls.push(toolCallRecord)

					// Add tool result to context
					const toolResultMessage: OpenAIMessage = {
						role: "tool",
						content: toolCallRecord.result
							? JSON.stringify(toolCallRecord.result)
							: toolCallRecord.error || "No result",
						tool_call_id: toolCall.id,
						name: toolCall.function.name || "",
					}
					context.messages.push(toolResultMessage)
				}
			}

			// Process XML tool calls if any
			if (xmlToolCalls.length > 0) {
				try {
					logger.info(`Processing ${xmlToolCalls.length} XML tool calls`, {
						toolNames: xmlToolCalls.map((tc) => tc.name),
					})

					// Create a synthetic assistant message with tool_calls for XML tools
					const xmlToolCallsForOpenAI = xmlToolCalls.map((xmlToolCall, index) => ({
						id: `xml_${Date.now()}_${index}`,
						type: "function" as const,
						function: {
							name: xmlToolCall.name,
							arguments: JSON.stringify(xmlToolCall.params),
						},
					}))

					// Add synthetic assistant message with tool_calls
					const xmlAssistantMessage: OpenAIMessage = {
						role: "assistant",
						content: "",
						tool_calls: xmlToolCallsForOpenAI,
					}
					context.messages.push(xmlAssistantMessage)

					for (let i = 0; i < xmlToolCalls.length; i++) {
						const xmlToolCall = xmlToolCalls[i]
						const xmlToolCallForOpenAI = xmlToolCallsForOpenAI[i]

						if (!xmlToolCall || !xmlToolCallForOpenAI) {
							logger.warn("Skipping XML tool call due to missing data", { index: i })
							continue
						}

						try {
							const toolCallRecord = await this.executeXmlToolCall(xmlToolCall, context)
							toolCalls.push(toolCallRecord)

							// Add tool result to context
							const toolResultMessage: OpenAIMessage = {
								role: "tool",
								content: toolCallRecord.result
									? JSON.stringify(toolCallRecord.result)
									: toolCallRecord.error || "No result",
								tool_call_id: xmlToolCallForOpenAI.id,
								name: xmlToolCall.name || "",
							}
							context.messages.push(toolResultMessage)
						} catch (error) {
							logger.error("Error executing XML tool call", {
								toolName: xmlToolCall.name,
								error: (error as Error).message,
							})

							// Add error result to context
							const errorResultMessage: OpenAIMessage = {
								role: "tool",
								content: `Error executing tool: ${(error as Error).message}`,
								tool_call_id: xmlToolCallForOpenAI.id,
								name: xmlToolCall.name || "",
							}
							context.messages.push(errorResultMessage)
						}
					}
				} catch (error) {
					logger.error("Error processing XML tool calls", {
						error: (error as Error).message,
						xmlToolCallsCount: xmlToolCalls.length,
					})
				}
			}

			// Update context
			context.updatedAt = new Date()

			const processingTime = Date.now() - startTime
			logger.info("Message processed successfully", {
				processingTimeMs: processingTime,
				toolCallsExecuted: toolCalls.length,
				responseLength: assistantMessage.content?.length || 0,
			})

			return {
				response: assistantMessage.content || "",
				toolCalls,
				updatedContext: context,
			}
		} catch (error) {
			const processingTime = Date.now() - startTime
			logger.error("Message processing failed", {
				error: error instanceof Error ? error.message : String(error),
				processingTimeMs: processingTime,
			})
			throw error
		}
	}

	private async executeToolCall(toolCall: any, context: ConversationContext): Promise<ToolCallRecord> {
		const startTime = Date.now()
		const toolName = toolCall.function.name
		const parameters = JSON.parse(toolCall.function.arguments)

		const toolCallRecord: ToolCallRecord = {
			id: toolCall.id,
			toolName,
			parameters,
			timestamp: new Date(),
			executionTimeMs: 0,
		}

		try {
			// Create tool execution context
			const executionContext = this.toolManager.createExecutionContext(
				context.workspacePath,
				(result) => {
					toolCallRecord.result = result
				},
				async (action, error) => {
					toolCallRecord.error = error.message || "Unknown error"
				},
				context.repositoryId,
				context.userId,
				context.workspaceManager,
				context.accessToken,
			)

			// Create tool use object
			const toolUse = this.toolManager.createToolUse(toolName as any, parameters)

			// Execute tool
			const result = await this.toolManager.executeTool(toolUse, executionContext)

			toolCallRecord.executionTimeMs = Date.now() - startTime

			if (result.success) {
				toolCallRecord.result = result.result
				logger.info(`Tool executed successfully: ${toolName}`, {
					executionTimeMs: toolCallRecord.executionTimeMs,
				})
			} else {
				toolCallRecord.error = result.error || "Unknown error"
				logger.warn(`Tool execution failed: ${toolName}`, {
					error: result.error,
					executionTimeMs: toolCallRecord.executionTimeMs,
				})
			}
		} catch (error) {
			toolCallRecord.executionTimeMs = Date.now() - startTime
			toolCallRecord.error = error instanceof Error ? error.message || "Unknown error" : String(error)

			logger.error(`Tool execution error: ${toolName}`, {
				error: toolCallRecord.error,
				executionTimeMs: toolCallRecord.executionTimeMs,
			})
		}

		// Add to context history
		context.toolCallHistory.push(toolCallRecord)

		return toolCallRecord
	}

	private async executeXmlToolCall(toolUse: any, context: ConversationContext): Promise<ToolCallRecord> {
		const startTime = Date.now()
		const toolName = toolUse.name
		const parameters = toolUse.params

		const toolCallRecord: ToolCallRecord = {
			id: `xml_${Date.now()}_${Math.random()}`,
			toolName,
			parameters,
			timestamp: new Date(),
			executionTimeMs: 0,
		}

		try {
			// Create tool execution context
			const executionContext = this.toolManager.createExecutionContext(
				context.workspacePath,
				(result) => {
					toolCallRecord.result = result
				},
				async (action, error) => {
					toolCallRecord.error = error.message || "Unknown error"
				},
				context.repositoryId,
				context.userId,
				context.workspaceManager,
				context.accessToken,
			)

			// Create tool use object
			const toolUseObj = this.toolManager.createToolUse(toolName as any, parameters)

			// Execute tool
			const result = await this.toolManager.executeTool(toolUseObj, executionContext)

			toolCallRecord.executionTimeMs = Date.now() - startTime

			if (result.success) {
				toolCallRecord.result = result.result
				logger.info(`XML Tool executed successfully: ${toolName}`, {
					executionTimeMs: toolCallRecord.executionTimeMs,
				})
			} else {
				toolCallRecord.error = result.error || "Unknown error"
				logger.warn(`XML Tool execution failed: ${toolName}`, {
					error: result.error,
					executionTimeMs: toolCallRecord.executionTimeMs,
				})
			}
		} catch (error) {
			toolCallRecord.executionTimeMs = Date.now() - startTime
			toolCallRecord.error = error instanceof Error ? error.message || "Unknown error" : String(error)

			logger.error(`XML Tool execution error: ${toolName}`, {
				error: toolCallRecord.error,
				executionTimeMs: toolCallRecord.executionTimeMs,
			})
		}

		// Add to context history
		context.toolCallHistory.push(toolCallRecord)

		return toolCallRecord
	}

	public createConversationContext(
		workspacePath: string,
		repositoryId?: number,
		userId?: number,
		initialTask?: string,
	): ConversationContext {
		const now = new Date()

		return {
			messages: [],
			toolCallHistory: [],
			currentTask: initialTask || "",
			repositoryId: repositoryId || 0,
			userId: userId || 0,
			workspacePath,
			createdAt: now,
			updatedAt: now,
		}
	}

	public getConversationState(context: ConversationContext): ConversationState {
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

	private estimateTokenCount(messages: OpenAIMessage[]): number {
		// Rough estimation: 1 token ≈ 4 characters
		const totalChars = messages.reduce((sum, msg) => {
			return sum + (msg.content?.length || 0)
		}, 0)

		return Math.ceil(totalChars / 4)
	}

	public clearConversationHistory(context: ConversationContext): void {
		context.messages = []
		context.toolCallHistory = []
		context.updatedAt = new Date()

		logger.info("Conversation history cleared", {
			repositoryId: context.repositoryId,
			userId: context.userId,
		})
	}

	public exportConversationHistory(context: ConversationContext): string {
		return JSON.stringify(
			{
				context,
				exportedAt: new Date().toISOString(),
			},
			null,
			2,
		)
	}

	public getToolUsageStats(context: ConversationContext): Record<string, number> {
		const stats: Record<string, number> = {}

		for (const toolCall of context.toolCallHistory) {
			stats[toolCall.toolName] = (stats[toolCall.toolName] || 0) + 1
		}

		return stats
	}

	public getAverageToolExecutionTime(context: ConversationContext): number {
		if (context.toolCallHistory.length === 0) return 0

		const totalTime = context.toolCallHistory.reduce((sum, toolCall) => sum + toolCall.executionTimeMs, 0)

		return totalTime / context.toolCallHistory.length
	}
}
