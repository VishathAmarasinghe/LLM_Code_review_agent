export interface WorkflowStep {
	id: string
	name: string
	toolName: string
	parameters: Record<string, any>
	dependencies: string[]
	condition?: (context: WorkflowContext) => boolean
	retryCount: number
	maxRetries: number
	timeout: number
	status: "pending" | "running" | "completed" | "failed" | "skipped"
	result?: any
	error?: string
	startTime?: Date
	endTime?: Date
}

export interface WorkflowContext {
	workspacePath: string
	repositoryId?: number
	userId: number
	pullRequestId?: number
	variables: Record<string, any>
	results: Map<string, any>
	metadata: Record<string, any>
	workspaceManager?: any
	accessToken?: string
}

export interface WorkflowExecution {
	id: string
	name: string
	steps: WorkflowStep[]
	context: WorkflowContext
	status: "pending" | "running" | "completed" | "failed" | "cancelled"
	startTime: Date
	endTime?: Date
	currentStepIndex: number
	totalSteps: number
	completedSteps: number
	failedSteps: number
}

export interface AgentState {
	currentWorkflow?: WorkflowExecution
	activeTools: Set<string>
	toolResults: Map<string, any>
	context: WorkflowContext
	isProcessing: boolean
	lastActivity: Date
	errorCount: number
	successCount: number
}

export interface DecisionCriteria {
	maxSteps: number
	maxErrors: number
	maxExecutionTime: number
	successThreshold: number
	stopOnFirstError: boolean
	requireAllSteps: boolean
}

export interface ResultAggregation {
	type: "summary" | "detailed" | "structured"
	includeMetadata: boolean
	includeErrors: boolean
	includeTiming: boolean
	format: "json" | "text" | "markdown"
}

export interface WorkflowDefinition {
	name: string
	description: string
	steps: Omit<WorkflowStep, "id" | "status" | "retryCount" | "result" | "error" | "startTime" | "endTime">[]
	decisionCriteria: DecisionCriteria
	resultAggregation: ResultAggregation
	metadata: Record<string, any>
}

export interface WorkflowResult {
	success: boolean
	workflowId: string
	executionTime: number
	stepsCompleted: number
	stepsTotal: number
	results: Map<string, any>
	errors: string[]
	summary: string
	metadata: Record<string, any>
}

export interface ToolExecutionRequest {
	toolName: string
	parameters: Record<string, any>
	context: WorkflowContext
	timeout?: number
	retryCount?: number
}

export interface ToolExecutionResult {
	success: boolean
	result?: any
	error?: string
	executionTime: number
	metadata: Record<string, any>
}

export interface WorkflowEvent {
	type:
		| "step_started"
		| "step_completed"
		| "step_failed"
		| "workflow_started"
		| "workflow_completed"
		| "workflow_failed"
	workflowId: string
	stepId?: string
	timestamp: Date
	data?: any
}
