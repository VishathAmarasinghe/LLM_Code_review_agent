import {
	WorkflowStep,
	WorkflowContext,
	WorkflowExecution,
	WorkflowDefinition,
	WorkflowResult,
	WorkflowEvent,
	DecisionCriteria,
} from "./types"
import { ToolExecutor } from "../core/toolExecutor"
import { ToolUse } from "../types/tools"
import { logger } from "../utils/logger"
import { EventEmitter } from "events"
import { EventBus } from "../services/eventBus"

export class WorkflowEngine extends EventEmitter {
	private static instance: WorkflowEngine
	private activeWorkflows = new Map<string, WorkflowExecution>()
	private toolExecutor: ToolExecutor

	private constructor() {
		super()
		this.toolExecutor = ToolExecutor.getInstance()
	}

	public static getInstance(): WorkflowEngine {
		if (!WorkflowEngine.instance) {
			WorkflowEngine.instance = new WorkflowEngine()
		}
		return WorkflowEngine.instance
	}

	/**
	 * Execute a workflow
	 */
	public async executeWorkflow(definition: WorkflowDefinition, context: WorkflowContext): Promise<WorkflowResult> {
		const workflowId = this.generateWorkflowId()
		const startTime = new Date()

		// Create workflow execution
		const execution: WorkflowExecution = {
			id: workflowId,
			name: definition.name,
			steps: definition.steps.map((step) => ({
				...step,
				id: this.generateStepId(),
				status: "pending" as const,
				retryCount: 0,
			})),
			context,
			status: "pending",
			startTime,
			currentStepIndex: 0,
			totalSteps: definition.steps.length,
			completedSteps: 0,
			failedSteps: 0,
		}

		this.activeWorkflows.set(workflowId, execution)
		this.emit("workflow_started", { workflowId, timestamp: startTime })
		EventBus.getInstance().publish(`task:${context.variables?.taskId || "global"}`, {
			type: "workflow_started",
			taskId: context.variables?.taskId,
			data: { workflowId, name: definition.name },
		})

		try {
			// Execute workflow steps
			const result = await this.executeWorkflowSteps(execution, definition)

			// Update execution status
			execution.status = result.success ? "completed" : "failed"
			execution.endTime = new Date()

			this.emit("workflow_completed", {
				workflowId,
				timestamp: execution.endTime,
				success: result.success,
			})
			EventBus.getInstance().publish(`task:${context.variables?.taskId || "global"}`, {
				type: "workflow_completed",
				taskId: context.variables?.taskId,
				data: { workflowId, success: result.success, summary: result.summary },
			})

			return result
		} catch (error) {
			execution.status = "failed"
			execution.endTime = new Date()

			this.emit("workflow_failed", {
				workflowId,
				timestamp: execution.endTime,
				error: error instanceof Error ? error.message : "Unknown error",
			})
			EventBus.getInstance().publish(`task:${context.variables?.taskId || "global"}`, {
				type: "workflow_failed",
				taskId: context.variables?.taskId,
				data: { workflowId, error: error instanceof Error ? error.message : "Unknown error" },
			})

			throw error
		} finally {
			this.activeWorkflows.delete(workflowId)
		}
	}

	/**
	 * Execute workflow steps
	 */
	private async executeWorkflowSteps(
		execution: WorkflowExecution,
		definition: WorkflowDefinition,
	): Promise<WorkflowResult> {
		const { steps, decisionCriteria } = definition
		const startTime = Date.now()

		for (let i = 0; i < steps.length; i++) {
			const step = execution.steps[i]!

			// Check if we should stop execution
			if (this.shouldStopExecution(execution, decisionCriteria)) {
				break
			}

			// Check step condition
			if (step.condition && !step.condition(execution.context)) {
				step.status = "skipped"
				continue
			}

			// Execute step
			try {
				await this.executeStep(step, execution.context)
				execution.completedSteps++
				execution.currentStepIndex = i + 1
			} catch (error) {
				step.status = "failed"
				step.error = error instanceof Error ? error.message : "Unknown error"
				execution.failedSteps++

				if (decisionCriteria.stopOnFirstError) {
					break
				}
			}
		}

		const executionTime = Date.now() - startTime
		const success = this.determineWorkflowSuccess(execution, decisionCriteria)

		return {
			success,
			workflowId: execution.id,
			executionTime,
			stepsCompleted: execution.completedSteps,
			stepsTotal: execution.totalSteps,
			results: execution.context.results,
			errors: execution.steps
				.filter((step) => step.status === "failed")
				.map((step) => step.error || "Unknown error"),
			summary: this.generateWorkflowSummary(execution),
			metadata: {
				startTime: execution.startTime,
				endTime: execution.endTime,
				totalSteps: execution.totalSteps,
				completedSteps: execution.completedSteps,
				failedSteps: execution.failedSteps,
			},
		}
	}

	/**
	 * Execute a single step
	 */
	private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<void> {
		step.status = "running"
		step.startTime = new Date()
		step.retryCount++

		this.emit("step_started", {
			type: "step_started",
			workflowId: step.id,
			stepId: step.id,
			timestamp: step.startTime,
		})
		EventBus.getInstance().publish(`task:${context.variables?.taskId || "global"}`, {
			type: "step_started",
			taskId: context.variables?.taskId,
			stepId: step.id,
			data: { name: step.name, toolName: step.toolName },
		})

		try {
			let result: any
			if (step.name === "LLM Orchestrated Review") {
				const { runLlmOrchestratedReview } = await import("./llmOrchestrator")
				result = await runLlmOrchestratedReview(
					context.workspacePath,
					{
						taskId: context.variables?.taskId,
						owner: context.variables?.owner,
						repo: context.variables?.repo,
						prNumber: context.variables?.prNumber,
					},
					context.repositoryId,
					context.userId,
					context.workspaceManager,
					context.accessToken,
				)
			} else {
				// Execute tool (default path)
				const toolUse: ToolUse = {
					type: "tool_use",
					name: step.toolName as any,
					params: step.parameters as any,
					partial: false,
				}
				result = await this.toolExecutor.executeTool(toolUse, {
					cwd: context.workspacePath,
					repositoryId: context.repositoryId,
					userId: context.userId,
					workspaceManager: context.workspaceManager,
					accessToken: context.accessToken,
				} as any)
			}

			step.status = "completed"
			step.result = result
			step.endTime = new Date()

			// Store result in context
			context.results.set(step.id, result)

			this.emit("step_completed", {
				type: "step_completed",
				workflowId: step.id,
				stepId: step.id,
				timestamp: step.endTime,
				data: result,
			})
			EventBus.getInstance().publish(`task:${context.variables?.taskId || "global"}`, {
				type: "step_completed",
				taskId: context.variables?.taskId,
				stepId: step.id,
				data: { name: step.name, toolName: step.toolName, result },
			})
		} catch (error) {
			step.status = "failed"
			step.error = error instanceof Error ? error.message : "Unknown error"
			step.endTime = new Date()

			this.emit("step_failed", {
				type: "step_failed",
				workflowId: step.id,
				stepId: step.id,
				timestamp: step.endTime,
				data: { error: step.error },
			})
			EventBus.getInstance().publish(`task:${context.variables?.taskId || "global"}`, {
				type: "step_failed",
				taskId: context.variables?.taskId,
				stepId: step.id,
				data: { name: step.name, toolName: step.toolName, error: step.error },
			})

			// Retry if within limits
			if (step.retryCount < step.maxRetries) {
				logger.info(`Retrying step ${step.id} (attempt ${step.retryCount + 1}/${step.maxRetries})`)
				await this.delay(1000 * step.retryCount) // Exponential backoff
				await this.executeStep(step, context)
			} else {
				throw error
			}
		}
	}

	/**
	 * Check if execution should stop
	 */
	private shouldStopExecution(execution: WorkflowExecution, criteria: DecisionCriteria): boolean {
		// Check max steps
		if (execution.completedSteps >= criteria.maxSteps) {
			return true
		}

		// Check max errors
		if (execution.failedSteps >= criteria.maxErrors) {
			return true
		}

		// Check max execution time
		const executionTime = Date.now() - execution.startTime.getTime()
		if (executionTime >= criteria.maxExecutionTime) {
			return true
		}

		return false
	}

	/**
	 * Determine if workflow was successful
	 */
	private determineWorkflowSuccess(execution: WorkflowExecution, criteria: DecisionCriteria): boolean {
		if (criteria.requireAllSteps) {
			return execution.failedSteps === 0 && execution.completedSteps === execution.totalSteps
		}

		const successRate = execution.completedSteps / execution.totalSteps
		return successRate >= criteria.successThreshold
	}

	/**
	 * Generate workflow summary
	 */
	private generateWorkflowSummary(execution: WorkflowExecution): string {
		const { name, completedSteps, totalSteps, failedSteps } = execution
		const successRate = ((completedSteps / totalSteps) * 100).toFixed(1)

		return `Workflow "${name}" completed: ${completedSteps}/${totalSteps} steps (${successRate}% success rate). ${failedSteps} steps failed.`
	}

	/**
	 * Get active workflows
	 */
	public getActiveWorkflows(): WorkflowExecution[] {
		return Array.from(this.activeWorkflows.values())
	}

	/**
	 * Get workflow by ID
	 */
	public getWorkflow(workflowId: string): WorkflowExecution | undefined {
		return this.activeWorkflows.get(workflowId)
	}

	/**
	 * Cancel a workflow
	 */
	public cancelWorkflow(workflowId: string): boolean {
		const workflow = this.activeWorkflows.get(workflowId)
		if (workflow && workflow.status === "running") {
			workflow.status = "cancelled"
			workflow.endTime = new Date()

			this.emit("workflow_failed", {
				type: "workflow_failed",
				workflowId,
				timestamp: workflow.endTime,
				data: { reason: "cancelled" },
			})

			return true
		}
		return false
	}

	/**
	 * Generate workflow ID
	 */
	private generateWorkflowId(): string {
		return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Generate step ID
	 */
	private generateStepId(): string {
		return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Delay execution
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	/**
	 * Create a simple workflow for code review
	 */
	public createCodeReviewWorkflow(context: WorkflowContext): WorkflowDefinition {
		return {
			name: "Code Review Workflow",
			description: "LLM-orchestrated PR code review",
			steps: [
				{
					name: "LLM Orchestrated Review",
					toolName: "llm_orchestrated_review",
					parameters: {
						taskId: context.variables?.taskId,
						owner: context.variables?.owner,
						repo: context.variables?.repo,
						prNumber: context.variables?.prNumber,
					},
					dependencies: [],
					maxRetries: 1,
					timeout: 300000,
				},
			],
			decisionCriteria: {
				maxSteps: 1,
				maxErrors: 1,
				maxExecutionTime: 900000, // 15 minutes (increased for comprehensive code reviews)
				successThreshold: 1.0,
				stopOnFirstError: true,
				requireAllSteps: true,
			},
			resultAggregation: {
				type: "detailed",
				includeMetadata: true,
				includeErrors: true,
				includeTiming: true,
				format: "markdown",
			},
			metadata: {
				type: "code_review",
				version: "1.0.0",
			},
		}
	}

	/**
	 * Create a file analysis workflow
	 */
	public createFileAnalysisWorkflow(filePath: string, context: WorkflowContext): WorkflowDefinition {
		return {
			name: "File Analysis Workflow",
			description: "Analyze a specific file",
			steps: [
				{
					name: "Read File",
					toolName: "read_file",
					parameters: { path: filePath },
					dependencies: [],
					maxRetries: 3,
					timeout: 30000,
				},
				{
					name: "Search for Patterns",
					toolName: "search_files",
					parameters: { path: filePath, regex: "(function|class|interface|type)" },
					dependencies: ["read_file"],
					maxRetries: 2,
					timeout: 30000,
				},
			],
			decisionCriteria: {
				maxSteps: 5,
				maxErrors: 2,
				maxExecutionTime: 120000, // 2 minutes
				successThreshold: 0.8,
				stopOnFirstError: true,
				requireAllSteps: true,
			},
			resultAggregation: {
				type: "summary",
				includeMetadata: true,
				includeErrors: true,
				includeTiming: false,
				format: "json",
			},
			metadata: {
				type: "file_analysis",
				filePath,
				version: "1.0.0",
			},
		}
	}
}
