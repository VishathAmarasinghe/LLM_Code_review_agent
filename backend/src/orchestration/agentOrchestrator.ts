import {
	WorkflowDefinition,
	WorkflowContext,
	WorkflowResult,
	AgentState,
	DecisionCriteria,
	ResultAggregation,
} from "./types"
import { WorkflowEngine } from "./workflowEngine"
import { StateManager } from "./stateManager"
import { DecisionEngine } from "./decisionEngine"
import { ResultAggregator } from "./resultAggregator"
import { logger } from "../utils/logger"
import { EventEmitter } from "events"

export class AgentOrchestrator extends EventEmitter {
	private static instance: AgentOrchestrator
	private workflowEngine: WorkflowEngine
	private stateManager: StateManager
	private decisionEngine: DecisionEngine
	private resultAggregator: ResultAggregator

	private constructor() {
		super()
		this.workflowEngine = WorkflowEngine.getInstance()
		this.stateManager = StateManager.getInstance()
		this.decisionEngine = DecisionEngine.getInstance()
		this.resultAggregator = ResultAggregator.getInstance()
	}

	public static getInstance(): AgentOrchestrator {
		if (!AgentOrchestrator.instance) {
			AgentOrchestrator.instance = new AgentOrchestrator()
		}
		return AgentOrchestrator.instance
	}

	/**
	 * Execute a code review workflow
	 */
	public async executeCodeReview(
		userId: number,
		context: WorkflowContext,
		customCriteria?: Partial<DecisionCriteria>,
	): Promise<WorkflowResult> {
		logger.info("Starting code review workflow", { userId, workspacePath: context.workspacePath })

		// Initialize agent state
		this.stateManager.initializeAgentState(userId, context)

		// Create code review workflow
		const workflowDefinition = this.workflowEngine.createCodeReviewWorkflow(context)

		// Set custom decision criteria if provided
		if (customCriteria) {
			const criteria = { ...this.decisionEngine.getDecisionCriteria("code_review"), ...customCriteria }
			this.decisionEngine.setDecisionCriteria("code_review", criteria)
		}

		// Execute workflow
		const result = await this.workflowEngine.executeWorkflow(workflowDefinition, context)

		// Update agent state
		this.stateManager.updateAgentState(userId, {
			isProcessing: false,
			successCount: result.success ? 1 : 0,
			errorCount: result.success ? 0 : 1,
		})

		this.emit("code_review_completed", { userId, result })
		return result
	}

	/**
	 * Execute a file analysis workflow
	 */
	public async executeFileAnalysis(
		userId: number,
		filePath: string,
		context: WorkflowContext,
		customCriteria?: Partial<DecisionCriteria>,
	): Promise<WorkflowResult> {
		logger.info("Starting file analysis workflow", { userId, filePath })

		// Initialize agent state
		this.stateManager.initializeAgentState(userId, context)

		// Create file analysis workflow
		const workflowDefinition = this.workflowEngine.createFileAnalysisWorkflow(filePath, context)

		// Set custom decision criteria if provided
		if (customCriteria) {
			const criteria = { ...this.decisionEngine.getDecisionCriteria("file_analysis"), ...customCriteria }
			this.decisionEngine.setDecisionCriteria("file_analysis", criteria)
		}

		// Execute workflow
		const result = await this.workflowEngine.executeWorkflow(workflowDefinition, context)

		// Update agent state
		this.stateManager.updateAgentState(userId, {
			isProcessing: false,
			successCount: result.success ? 1 : 0,
			errorCount: result.success ? 0 : 1,
		})

		this.emit("file_analysis_completed", { userId, filePath, result })
		return result
	}

	/**
	 * Execute a custom workflow
	 */
	public async executeCustomWorkflow(
		userId: number,
		workflowDefinition: WorkflowDefinition,
		context: WorkflowContext,
		customCriteria?: Partial<DecisionCriteria>,
	): Promise<WorkflowResult> {
		logger.info("Starting custom workflow", { userId, workflowName: workflowDefinition.name })

		// Initialize agent state
		this.stateManager.initializeAgentState(userId, context)

		// Set custom decision criteria if provided
		if (customCriteria) {
			const criteria = { ...this.decisionEngine.getDecisionCriteria("default"), ...customCriteria }
			this.decisionEngine.setDecisionCriteria("custom", criteria)
		}

		// Execute workflow
		const result = await this.workflowEngine.executeWorkflow(workflowDefinition, context)

		// Update agent state
		this.stateManager.updateAgentState(userId, {
			isProcessing: false,
			successCount: result.success ? 1 : 0,
			errorCount: result.success ? 0 : 1,
		})

		this.emit("custom_workflow_completed", { userId, workflowName: workflowDefinition.name, result })
		return result
	}

	/**
	 * Get agent state
	 */
	public getAgentState(userId: number): AgentState | undefined {
		return this.stateManager.getAgentState(userId)
	}

	/**
	 * Get agent statistics
	 */
	public getAgentStatistics(userId: number) {
		return this.stateManager.getAgentStatistics(userId)
	}

	/**
	 * Check if agent is processing
	 */
	public isAgentProcessing(userId: number): boolean {
		return this.stateManager.isAgentProcessing(userId)
	}

	/**
	 * Cancel agent workflow
	 */
	public cancelAgentWorkflow(userId: number): boolean {
		const state = this.stateManager.getAgentState(userId)
		if (state?.currentWorkflow) {
			const cancelled = this.workflowEngine.cancelWorkflow(state.currentWorkflow.id)
			if (cancelled) {
				this.stateManager.clearCurrentWorkflow(userId)
				this.emit("workflow_cancelled", { userId, workflowId: state.currentWorkflow.id })
			}
			return cancelled
		}
		return false
	}

	/**
	 * Reset agent state
	 */
	public resetAgentState(userId: number): void {
		this.stateManager.resetAgentState(userId)
		this.emit("agent_reset", { userId })
	}

	/**
	 * Get workflow status
	 */
	public getWorkflowStatus(userId: number): {
		isProcessing: boolean
		currentWorkflow?: string
		activeTools: string[]
		statistics: any
	} {
		const state = this.stateManager.getAgentState(userId)
		const statistics = this.stateManager.getAgentStatistics(userId)

		return {
			isProcessing: state?.isProcessing || false,
			currentWorkflow: state?.currentWorkflow?.id,
			activeTools: state?.activeTools ? Array.from(state.activeTools) : [],
			statistics,
		}
	}

	/**
	 * Get all active workflows
	 */
	public getActiveWorkflows() {
		return this.workflowEngine.getActiveWorkflows()
	}

	/**
	 * Get system statistics
	 */
	public getSystemStatistics(): {
		activeWorkflows: number
		totalAgents: number
		processingAgents: number
		stateSummary: any
	} {
		const activeWorkflows = this.workflowEngine.getActiveWorkflows()
		const stateSummary = this.stateManager.getStateSummary()

		return {
			activeWorkflows: activeWorkflows.length,
			totalAgents: stateSummary.totalAgents,
			processingAgents: stateSummary.processingAgents,
			stateSummary,
		}
	}

	/**
	 * Create a custom workflow definition
	 */
	public createCustomWorkflow(
		name: string,
		description: string,
		steps: Array<{
			name: string
			toolName: string
			parameters: Record<string, any>
			dependencies?: string[]
			condition?: (context: WorkflowContext) => boolean
			maxRetries?: number
			timeout?: number
		}>,
		criteria?: Partial<DecisionCriteria>,
		aggregation?: Partial<ResultAggregation>,
	): WorkflowDefinition {
		const workflowDefinition: WorkflowDefinition = {
			name,
			description,
			steps: steps.map((step) => ({
				...step,
				dependencies: step.dependencies || [],
				maxRetries: step.maxRetries || 3,
				timeout: step.timeout || 30000,
			})),
			decisionCriteria: {
				maxSteps: 20,
				maxErrors: 5,
				maxExecutionTime: 600000,
				successThreshold: 0.8,
				stopOnFirstError: false,
				requireAllSteps: false,
				...criteria,
			},
			resultAggregation: {
				type: "detailed",
				includeMetadata: true,
				includeErrors: true,
				includeTiming: true,
				format: "markdown",
				...aggregation,
			},
			metadata: {
				type: "custom",
				version: "1.0.0",
				createdAt: new Date().toISOString(),
			},
		}

		return workflowDefinition
	}

	/**
	 * Create a multi-step code analysis workflow
	 */
	public createMultiStepCodeAnalysisWorkflow(
		filePaths: string[],
		analysisType: "comprehensive" | "quick" | "security",
	): WorkflowDefinition {
		const steps = filePaths.map((filePath, index) => ({
			name: `Analyze ${filePath}`,
			toolName: "read_file",
			parameters: { path: filePath },
			dependencies: index > 0 ? [`Analyze ${filePaths[index - 1]}`] : [],
			maxRetries: 2,
			timeout: 30000,
		}))

		// Add search steps based on analysis type
		if (analysisType === "comprehensive") {
			steps.push({
				name: "Search for patterns",
				toolName: "search_files",
				parameters: { path: ".", regex: "(TODO|FIXME|BUG|HACK|XXX)" },
				dependencies: [],
				maxRetries: 2,
				timeout: 60000,
			})
		}

		if (analysisType === "security") {
			steps.push({
				name: "Security analysis",
				toolName: "search_files",
				parameters: { path: ".", regex: "(password|secret|key|token|auth)" },
				dependencies: [],
				maxRetries: 2,
				timeout: 60000,
			})
		}

		return this.createCustomWorkflow(
			`${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Code Analysis`,
			`Multi-step ${analysisType} code analysis for ${filePaths.length} files`,
			steps,
			{
				maxSteps: steps.length + 5,
				maxErrors: 2,
				maxExecutionTime: 300000,
				successThreshold: 0.9,
				stopOnFirstError: false,
				requireAllSteps: true,
			},
			{
				type: "detailed",
				includeMetadata: true,
				includeErrors: true,
				includeTiming: true,
				format: "markdown",
			},
		)
	}

	/**
	 * Cleanup inactive agents
	 */
	public cleanupInactiveAgents(maxInactiveTime: number = 30 * 60 * 1000): void {
		this.stateManager.cleanupInactiveAgents(maxInactiveTime)
	}

	/**
	 * Get decision criteria for workflow type
	 */
	public getDecisionCriteria(workflowType: string): DecisionCriteria {
		return this.decisionEngine.getDecisionCriteria(workflowType)
	}

	/**
	 * Set decision criteria for workflow type
	 */
	public setDecisionCriteria(workflowType: string, criteria: DecisionCriteria): void {
		this.decisionEngine.setDecisionCriteria(workflowType, criteria)
	}

	/**
	 * Get result aggregation for workflow type
	 */
	public getResultAggregation(workflowType: string): ResultAggregation {
		switch (workflowType) {
			case "code_review":
				return this.resultAggregator.createCodeReviewAggregation()
			case "file_analysis":
				return this.resultAggregator.createFileAnalysisAggregation()
			case "quick_task":
				return this.resultAggregator.createQuickTaskAggregation()
			default:
				return this.resultAggregator.createCodeReviewAggregation()
		}
	}
}
