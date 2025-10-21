import { AgentState, WorkflowContext, WorkflowExecution } from "./types"
import { logger } from "../utils/logger"
import { EventEmitter } from "events"

export class StateManager extends EventEmitter {
	private static instance: StateManager
	private agentStates = new Map<number, AgentState>()
	private workflowContexts = new Map<string, WorkflowContext>()

	private constructor() {
		super()
	}

	public static getInstance(): StateManager {
		if (!StateManager.instance) {
			StateManager.instance = new StateManager()
		}
		return StateManager.instance
	}

	/**
	 * Initialize agent state
	 */
	public initializeAgentState(userId: number, context: WorkflowContext): AgentState {
		const state: AgentState = {
			activeTools: new Set(),
			toolResults: new Map(),
			context,
			isProcessing: false,
			lastActivity: new Date(),
			errorCount: 0,
			successCount: 0,
		}

		this.agentStates.set(userId, state)
		this.workflowContexts.set(context.workspacePath, context)

		logger.info("Agent state initialized", { userId, workspacePath: context.workspacePath })
		return state
	}

	/**
	 * Get agent state
	 */
	public getAgentState(userId: number): AgentState | undefined {
		return this.agentStates.get(userId)
	}

	/**
	 * Update agent state
	 */
	public updateAgentState(userId: number, updates: Partial<AgentState>): void {
		const state = this.agentStates.get(userId)
		if (state) {
			Object.assign(state, updates)
			state.lastActivity = new Date()

			this.emit("state_updated", { userId, state, updates })
			logger.debug("Agent state updated", { userId, updates })
		}
	}

	/**
	 * Set current workflow
	 */
	public setCurrentWorkflow(userId: number, workflow: WorkflowExecution): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.currentWorkflow = workflow
			state.isProcessing = true
			state.lastActivity = new Date()

			this.emit("workflow_started", { userId, workflow })
			logger.info("Current workflow set", { userId, workflowId: workflow.id })
		}
	}

	/**
	 * Clear current workflow
	 */
	public clearCurrentWorkflow(userId: number): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.currentWorkflow = undefined
			state.isProcessing = false
			state.lastActivity = new Date()

			this.emit("workflow_cleared", { userId })
			logger.info("Current workflow cleared", { userId })
		}
	}

	/**
	 * Add active tool
	 */
	public addActiveTool(userId: number, toolName: string): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.activeTools.add(toolName)
			state.lastActivity = new Date()

			this.emit("tool_started", { userId, toolName })
			logger.debug("Active tool added", { userId, toolName })
		}
	}

	/**
	 * Remove active tool
	 */
	public removeActiveTool(userId: number, toolName: string): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.activeTools.delete(toolName)
			state.lastActivity = new Date()

			this.emit("tool_completed", { userId, toolName })
			logger.debug("Active tool removed", { userId, toolName })
		}
	}

	/**
	 * Store tool result
	 */
	public storeToolResult(userId: number, toolName: string, result: any): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.toolResults.set(toolName, {
				result,
				timestamp: new Date(),
			})
			state.lastActivity = new Date()

			this.emit("tool_result_stored", { userId, toolName, result })
			logger.debug("Tool result stored", { userId, toolName })
		}
	}

	/**
	 * Get tool result
	 */
	public getToolResult(userId: number, toolName: string): any {
		const state = this.agentStates.get(userId)
		if (state) {
			const toolResult = state.toolResults.get(toolName)
			return toolResult?.result
		}
		return undefined
	}

	/**
	 * Increment error count
	 */
	public incrementErrorCount(userId: number): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.errorCount++
			state.lastActivity = new Date()

			this.emit("error_count_incremented", { userId, errorCount: state.errorCount })
			logger.debug("Error count incremented", { userId, errorCount: state.errorCount })
		}
	}

	/**
	 * Increment success count
	 */
	public incrementSuccessCount(userId: number): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.successCount++
			state.lastActivity = new Date()

			this.emit("success_count_incremented", { userId, successCount: state.successCount })
			logger.debug("Success count incremented", { userId, successCount: state.successCount })
		}
	}

	/**
	 * Update context
	 */
	public updateContext(userId: number, context: Partial<WorkflowContext>): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.context = { ...state.context, ...context }
			state.lastActivity = new Date()

			// Update workflow context if it exists
			this.workflowContexts.set(state.context.workspacePath, state.context)

			this.emit("context_updated", { userId, context })
			logger.debug("Context updated", { userId, context })
		}
	}

	/**
	 * Get context
	 */
	public getContext(userId: number): WorkflowContext | undefined {
		const state = this.agentStates.get(userId)
		return state?.context
	}

	/**
	 * Get workflow context by workspace path
	 */
	public getWorkflowContext(workspacePath: string): WorkflowContext | undefined {
		return this.workflowContexts.get(workspacePath)
	}

	/**
	 * Check if agent is processing
	 */
	public isAgentProcessing(userId: number): boolean {
		const state = this.agentStates.get(userId)
		return state?.isProcessing || false
	}

	/**
	 * Get agent statistics
	 */
	public getAgentStatistics(userId: number):
		| {
				isProcessing: boolean
				activeTools: string[]
				toolResultsCount: number
				errorCount: number
				successCount: number
				lastActivity: Date
				currentWorkflow?: string
		  }
		| undefined {
		const state = this.agentStates.get(userId)
		if (!state) {
			return undefined
		}

		return {
			isProcessing: state.isProcessing,
			activeTools: Array.from(state.activeTools),
			toolResultsCount: state.toolResults.size,
			errorCount: state.errorCount,
			successCount: state.successCount,
			lastActivity: state.lastActivity,
			currentWorkflow: state.currentWorkflow?.id,
		}
	}

	/**
	 * Get all agent states
	 */
	public getAllAgentStates(): Map<number, AgentState> {
		return new Map(this.agentStates)
	}

	/**
	 * Clean up inactive agents
	 */
	public cleanupInactiveAgents(maxInactiveTime: number = 30 * 60 * 1000): void {
		const now = Date.now()
		const inactiveAgents: number[] = []

		for (const [userId, state] of this.agentStates) {
			const inactiveTime = now - state.lastActivity.getTime()
			if (inactiveTime > maxInactiveTime) {
				inactiveAgents.push(userId)
			}
		}

		for (const userId of inactiveAgents) {
			this.cleanupAgentState(userId)
		}

		if (inactiveAgents.length > 0) {
			logger.info("Cleaned up inactive agents", { count: inactiveAgents.length, userIds: inactiveAgents })
		}
	}

	/**
	 * Clean up agent state
	 */
	public cleanupAgentState(userId: number): void {
		const state = this.agentStates.get(userId)
		if (state) {
			// Clean up workflow context
			this.workflowContexts.delete(state.context.workspacePath)

			// Remove agent state
			this.agentStates.delete(userId)

			this.emit("agent_cleaned_up", { userId })
			logger.info("Agent state cleaned up", { userId })
		}
	}

	/**
	 * Reset agent state
	 */
	public resetAgentState(userId: number): void {
		const state = this.agentStates.get(userId)
		if (state) {
			state.activeTools.clear()
			state.toolResults.clear()
			state.isProcessing = false
			state.errorCount = 0
			state.successCount = 0
			state.lastActivity = new Date()
			state.currentWorkflow = undefined

			this.emit("agent_reset", { userId })
			logger.info("Agent state reset", { userId })
		}
	}

	/**
	 * Get state summary
	 */
	public getStateSummary(): {
		totalAgents: number
		activeAgents: number
		processingAgents: number
		totalWorkflows: number
		totalToolResults: number
	} {
		let activeAgents = 0
		let processingAgents = 0
		let totalWorkflows = 0
		let totalToolResults = 0

		for (const state of this.agentStates.values()) {
			if (state.lastActivity.getTime() > Date.now() - 5 * 60 * 1000) {
				// Active in last 5 minutes
				activeAgents++
			}
			if (state.isProcessing) {
				processingAgents++
			}
			if (state.currentWorkflow) {
				totalWorkflows++
			}
			totalToolResults += state.toolResults.size
		}

		return {
			totalAgents: this.agentStates.size,
			activeAgents,
			processingAgents,
			totalWorkflows,
			totalToolResults,
		}
	}
}
