import { DecisionCriteria, WorkflowExecution, AgentState } from "./types"
import { logger } from "../utils/logger"

export class DecisionEngine {
	private static instance: DecisionEngine
	private decisionCriteria: Map<string, DecisionCriteria> = new Map()

	private constructor() {
		this.initializeDefaultCriteria()
	}

	public static getInstance(): DecisionEngine {
		if (!DecisionEngine.instance) {
			DecisionEngine.instance = new DecisionEngine()
		}
		return DecisionEngine.instance
	}

	/**
	 * Initialize default decision criteria
	 */
	private initializeDefaultCriteria(): void {
		const defaultCriteria: DecisionCriteria = {
			maxSteps: 20,
			maxErrors: 5,
			maxExecutionTime: 600000, // 10 minutes
			successThreshold: 0.8,
			stopOnFirstError: false,
			requireAllSteps: false,
		}

		this.decisionCriteria.set("default", defaultCriteria)
	}

	/**
	 * Set decision criteria for a workflow type
	 */
	public setDecisionCriteria(workflowType: string, criteria: DecisionCriteria): void {
		this.decisionCriteria.set(workflowType, criteria)
		logger.info("Decision criteria set", { workflowType, criteria })
	}

	/**
	 * Get decision criteria for a workflow type
	 */
	public getDecisionCriteria(workflowType: string): DecisionCriteria {
		return this.decisionCriteria.get(workflowType) || this.decisionCriteria.get("default")!
	}

	/**
	 * Decide whether to continue workflow execution
	 */
	public shouldContinueExecution(
		execution: WorkflowExecution,
		criteria: DecisionCriteria,
	): { continue: boolean; reason?: string } {
		// Check max steps
		if (execution.completedSteps >= criteria.maxSteps) {
			return {
				continue: false,
				reason: `Maximum steps reached: ${criteria.maxSteps}`,
			}
		}

		// Check max errors
		if (execution.failedSteps >= criteria.maxErrors) {
			return {
				continue: false,
				reason: `Maximum errors reached: ${criteria.maxErrors}`,
			}
		}

		// Check max execution time
		const executionTime = Date.now() - execution.startTime.getTime()
		if (executionTime >= criteria.maxExecutionTime) {
			return {
				continue: false,
				reason: `Maximum execution time reached: ${criteria.maxExecutionTime}ms`,
			}
		}

		// Check if all required steps are completed
		if (criteria.requireAllSteps && execution.completedSteps === execution.totalSteps) {
			return {
				continue: false,
				reason: "All required steps completed",
			}
		}

		// Check success threshold
		const successRate = execution.completedSteps / execution.totalSteps
		if (successRate >= criteria.successThreshold && execution.completedSteps > 0) {
			return {
				continue: false,
				reason: `Success threshold reached: ${criteria.successThreshold * 100}%`,
			}
		}

		return { continue: true }
	}

	/**
	 * Decide whether to retry a failed step
	 */
	public shouldRetryStep(
		stepId: string,
		retryCount: number,
		maxRetries: number,
		errorType: string,
	): { retry: boolean; reason?: string; delay?: number } {
		// Check if max retries reached
		if (retryCount >= maxRetries) {
			return {
				retry: false,
				reason: `Maximum retries reached: ${maxRetries}`,
			}
		}

		// Check error type for retry eligibility
		const retryableErrors = ["timeout", "network_error", "rate_limit", "temporary_failure", "service_unavailable"]

		if (!retryableErrors.includes(errorType)) {
			return {
				retry: false,
				reason: `Error type not retryable: ${errorType}`,
			}
		}

		// Calculate delay with exponential backoff
		const baseDelay = 1000 // 1 second
		const delay = baseDelay * Math.pow(2, retryCount)
		const maxDelay = 30000 // 30 seconds

		return {
			retry: true,
			delay: Math.min(delay, maxDelay),
		}
	}

	/**
	 * Decide whether to stop tool execution
	 */
	public shouldStopToolExecution(
		agentState: AgentState,
		criteria: DecisionCriteria,
	): { stop: boolean; reason?: string } {
		// Check if agent is processing too long
		const processingTime = Date.now() - agentState.lastActivity.getTime()
		if (processingTime > criteria.maxExecutionTime) {
			return {
				stop: true,
				reason: `Tool execution timeout: ${criteria.maxExecutionTime}ms`,
			}
		}

		// Check error rate
		const totalOperations = agentState.errorCount + agentState.successCount
		if (totalOperations > 0) {
			const errorRate = agentState.errorCount / totalOperations
			if (errorRate > 0.5) {
				// 50% error rate
				return {
					stop: true,
					reason: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
				}
			}
		}

		// Check if too many tools are active
		if (agentState.activeTools.size > 5) {
			return {
				stop: true,
				reason: `Too many active tools: ${agentState.activeTools.size}`,
			}
		}

		return { stop: false }
	}

	/**
	 * Decide the next action based on current state
	 */
	public decideNextAction(
		execution: WorkflowExecution,
		agentState: AgentState,
		criteria: DecisionCriteria,
	): {
		action: "continue" | "retry" | "skip" | "stop" | "wait"
		reason: string
		delay?: number
	} {
		// Check if we should stop execution
		const continueDecision = this.shouldContinueExecution(execution, criteria)
		if (!continueDecision.continue) {
			return {
				action: "stop",
				reason: continueDecision.reason || "Execution should stop",
			}
		}

		// Check if we should stop tool execution
		const stopDecision = this.shouldStopToolExecution(agentState, criteria)
		if (stopDecision.stop) {
			return {
				action: "stop",
				reason: stopDecision.reason || "Tool execution should stop",
			}
		}

		// Check if we should wait (rate limiting, etc.)
		if (agentState.activeTools.size >= 3) {
			return {
				action: "wait",
				reason: "Too many active tools, waiting for completion",
				delay: 1000,
			}
		}

		// Check if we should retry failed steps
		const failedSteps = execution.steps.filter((step) => step.status === "failed")
		if (failedSteps.length > 0) {
			const retryableStep = failedSteps.find((step) => step.retryCount < step.maxRetries)

			if (retryableStep) {
				return {
					action: "retry",
					reason: `Retrying failed step: ${retryableStep.name}`,
					delay: 1000 * retryableStep.retryCount,
				}
			}
		}

		// Check if we should skip steps
		const pendingSteps = execution.steps.filter((step) => step.status === "pending")
		if (pendingSteps.length === 0) {
			return {
				action: "stop",
				reason: "No more steps to execute",
			}
		}

		// Continue with next step
		return {
			action: "continue",
			reason: "Ready to execute next step",
		}
	}

	/**
	 * Evaluate workflow success
	 */
	public evaluateWorkflowSuccess(
		execution: WorkflowExecution,
		criteria: DecisionCriteria,
	): { success: boolean; score: number; reasons: string[] } {
		const reasons: string[] = []
		let score = 0

		// Calculate success rate
		const successRate = execution.completedSteps / execution.totalSteps
		score += successRate * 0.4 // 40% weight

		// Check if all required steps completed
		if (criteria.requireAllSteps && execution.completedSteps === execution.totalSteps) {
			score += 0.3 // 30% weight
			reasons.push("All required steps completed")
		} else if (successRate >= criteria.successThreshold) {
			score += 0.3 // 30% weight
			reasons.push(`Success threshold met: ${(successRate * 100).toFixed(1)}%`)
		}

		// Check error rate
		const errorRate = execution.failedSteps / execution.totalSteps
		if (errorRate <= 0.1) {
			// Less than 10% errors
			score += 0.2 // 20% weight
			reasons.push("Low error rate")
		} else if (errorRate <= 0.3) {
			// Less than 30% errors
			score += 0.1 // 10% weight
			reasons.push("Acceptable error rate")
		} else {
			reasons.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`)
		}

		// Check execution time efficiency
		const executionTime = execution.endTime
			? execution.endTime.getTime() - execution.startTime.getTime()
			: Date.now() - execution.startTime.getTime()

		const timeEfficiency = Math.max(0, 1 - executionTime / criteria.maxExecutionTime)
		score += timeEfficiency * 0.1 // 10% weight

		if (timeEfficiency > 0.8) {
			reasons.push("Efficient execution time")
		}

		const success = score >= 0.7 // 70% threshold for success

		return {
			success,
			score,
			reasons,
		}
	}

	/**
	 * Get decision criteria summary
	 */
	public getDecisionCriteriaSummary(): Record<string, DecisionCriteria> {
		const summary: Record<string, DecisionCriteria> = {}
		for (const [type, criteria] of this.decisionCriteria) {
			summary[type] = { ...criteria }
		}
		return summary
	}

	/**
	 * Create custom decision criteria for code review
	 */
	public createCodeReviewCriteria(): DecisionCriteria {
		return {
			maxSteps: 15,
			maxErrors: 3,
			maxExecutionTime: 300000, // 5 minutes
			successThreshold: 0.8,
			stopOnFirstError: false,
			requireAllSteps: false,
		}
	}

	/**
	 * Create custom decision criteria for file analysis
	 */
	public createFileAnalysisCriteria(): DecisionCriteria {
		return {
			maxSteps: 8,
			maxErrors: 2,
			maxExecutionTime: 120000, // 2 minutes
			successThreshold: 0.9,
			stopOnFirstError: true,
			requireAllSteps: true,
		}
	}
}
