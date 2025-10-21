import { WorkflowResult, WorkflowExecution, ResultAggregation, WorkflowStep } from "./types"
import { logger } from "../utils/logger"

export class ResultAggregator {
	private static instance: ResultAggregator

	private constructor() {}

	public static getInstance(): ResultAggregator {
		if (!ResultAggregator.instance) {
			ResultAggregator.instance = new ResultAggregator()
		}
		return ResultAggregator.instance
	}

	/**
	 * Aggregate workflow results
	 */
	public aggregateResults(execution: WorkflowExecution, aggregation: ResultAggregation): WorkflowResult {
		const executionTime = execution.endTime
			? execution.endTime.getTime() - execution.startTime.getTime()
			: Date.now() - execution.startTime.getTime()

		const results = this.collectResults(execution, aggregation)
		const errors = this.collectErrors(execution, aggregation)
		const summary = this.generateSummary(execution, aggregation, results, errors)

		return {
			success: this.determineSuccess(execution, aggregation),
			workflowId: execution.id,
			executionTime,
			stepsCompleted: execution.completedSteps,
			stepsTotal: execution.totalSteps,
			results,
			errors,
			summary,
			metadata: this.collectMetadata(execution, aggregation),
		}
	}

	/**
	 * Collect results from workflow steps
	 */
	private collectResults(execution: WorkflowExecution, aggregation: ResultAggregation): Map<string, any> {
		const results = new Map<string, any>()

		for (const step of execution.steps) {
			if (step.status === "completed" && step.result) {
				if (aggregation.type === "summary") {
					results.set(step.name, this.summarizeStepResult(step))
				} else if (aggregation.type === "detailed") {
					results.set(step.name, {
						result: step.result,
						executionTime: step.endTime ? step.endTime.getTime() - step.startTime!.getTime() : 0,
						retryCount: step.retryCount,
						metadata: aggregation.includeMetadata
							? {
									toolName: step.toolName,
									parameters: step.parameters,
									startTime: step.startTime,
									endTime: step.endTime,
								}
							: undefined,
					})
				} else {
					// structured
					results.set(step.name, this.structureStepResult(step, aggregation))
				}
			}
		}

		return results
	}

	/**
	 * Collect errors from workflow steps
	 */
	private collectErrors(execution: WorkflowExecution, aggregation: ResultAggregation): string[] {
		if (!aggregation.includeErrors) {
			return []
		}

		const errors: string[] = []

		for (const step of execution.steps) {
			if (step.status === "failed" && step.error) {
				const errorMessage =
					aggregation.type === "detailed"
						? `${step.name}: ${step.error} (retry ${step.retryCount}/${step.maxRetries})`
						: `${step.name}: ${step.error}`
				errors.push(errorMessage)
			}
		}

		return errors
	}

	/**
	 * Generate workflow summary
	 */
	private generateSummary(
		execution: WorkflowExecution,
		aggregation: ResultAggregation,
		results: Map<string, any>,
		errors: string[],
	): string {
		const format = aggregation.format || "text"

		if (format === "json") {
			return this.generateJsonSummary(execution, results, errors)
		} else if (format === "markdown") {
			return this.generateMarkdownSummary(execution, results, errors)
		} else {
			return this.generateTextSummary(execution, results, errors)
		}
	}

	/**
	 * Generate JSON summary
	 */
	private generateJsonSummary(execution: WorkflowExecution, results: Map<string, any>, errors: string[]): string {
		const summary = {
			workflow: {
				id: execution.id,
				name: execution.name,
				status: execution.status,
				duration: execution.endTime
					? execution.endTime.getTime() - execution.startTime.getTime()
					: Date.now() - execution.startTime.getTime(),
			},
			steps: {
				total: execution.totalSteps,
				completed: execution.completedSteps,
				failed: execution.failedSteps,
				successRate: execution.completedSteps / execution.totalSteps,
			},
			results: Object.fromEntries(results),
			errors,
			timestamp: new Date().toISOString(),
		}

		return JSON.stringify(summary, null, 2)
	}

	/**
	 * Generate Markdown summary
	 */
	private generateMarkdownSummary(execution: WorkflowExecution, results: Map<string, any>, errors: string[]): string {
		let summary = `# Workflow Execution Summary\n\n`
		summary += `**Workflow:** ${execution.name}\n`
		summary += `**ID:** ${execution.id}\n`
		summary += `**Status:** ${execution.status}\n`
		summary += `**Duration:** ${
			execution.endTime
				? execution.endTime.getTime() - execution.startTime.getTime()
				: Date.now() - execution.startTime.getTime()
		}ms\n\n`

		summary += `## Steps\n\n`
		summary += `- **Total:** ${execution.totalSteps}\n`
		summary += `- **Completed:** ${execution.completedSteps}\n`
		summary += `- **Failed:** ${execution.failedSteps}\n`
		summary += `- **Success Rate:** ${((execution.completedSteps / execution.totalSteps) * 100).toFixed(1)}%\n\n`

		if (results.size > 0) {
			summary += `## Results\n\n`
			for (const [stepName, result] of results) {
				summary += `### ${stepName}\n`
				summary += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n`
			}
		}

		if (errors.length > 0) {
			summary += `## Errors\n\n`
			for (const error of errors) {
				summary += `- ${error}\n`
			}
		}

		return summary
	}

	/**
	 * Generate text summary
	 */
	private generateTextSummary(execution: WorkflowExecution, results: Map<string, any>, errors: string[]): string {
		let summary = `Workflow "${execution.name}" completed:\n`
		summary += `- Steps: ${execution.completedSteps}/${execution.totalSteps} (${((execution.completedSteps / execution.totalSteps) * 100).toFixed(1)}% success)\n`
		summary += `- Duration: ${
			execution.endTime
				? execution.endTime.getTime() - execution.startTime.getTime()
				: Date.now() - execution.startTime.getTime()
		}ms\n`

		if (errors.length > 0) {
			summary += `- Errors: ${errors.length}\n`
		}

		if (results.size > 0) {
			summary += `- Results: ${results.size} steps completed successfully\n`
		}

		return summary
	}

	/**
	 * Summarize step result
	 */
	private summarizeStepResult(step: WorkflowStep): any {
		if (!step.result) {
			return null
		}

		// Extract key information based on tool type
		switch (step.toolName) {
			case "read_file":
				return {
					filePath: step.parameters.path,
					lineCount: step.result.lineCount || 0,
					size: step.result.size || 0,
				}
			case "search_files":
				return {
					searchPath: step.result.searchPath,
					totalMatches: step.result.totalMatches || 0,
					filesSearched: step.result.results?.length || 0,
				}
			case "list_files":
				return {
					directory: step.result.directory,
					totalFiles: step.result.totalFiles || 0,
					recursive: step.result.recursive || false,
				}
			case "codebase_search":
				return {
					query: step.result.query,
					resultsCount: step.result.results?.length || 0,
					searchTime: step.result.searchTime || 0,
				}
			default:
				return {
					toolName: step.toolName,
					success: true,
					resultType: typeof step.result,
				}
		}
	}

	/**
	 * Structure step result
	 */
	private structureStepResult(step: WorkflowStep, aggregation: ResultAggregation): any {
		const structured: any = {
			stepName: step.name,
			toolName: step.toolName,
			status: step.status,
			result: step.result,
		}

		if (aggregation.includeTiming && step.startTime && step.endTime) {
			structured.executionTime = step.endTime.getTime() - step.startTime.getTime()
		}

		if (aggregation.includeMetadata) {
			structured.metadata = {
				parameters: step.parameters,
				retryCount: step.retryCount,
				maxRetries: step.maxRetries,
				startTime: step.startTime,
				endTime: step.endTime,
			}
		}

		return structured
	}

	/**
	 * Collect metadata
	 */
	private collectMetadata(execution: WorkflowExecution, aggregation: ResultAggregation): Record<string, any> {
		const metadata: Record<string, any> = {
			workflowId: execution.id,
			workflowName: execution.name,
			startTime: execution.startTime,
			endTime: execution.endTime,
			totalSteps: execution.totalSteps,
			completedSteps: execution.completedSteps,
			failedSteps: execution.failedSteps,
		}

		if (aggregation.includeTiming) {
			metadata.executionTime = execution.endTime
				? execution.endTime.getTime() - execution.startTime.getTime()
				: Date.now() - execution.startTime.getTime()
		}

		if (aggregation.includeMetadata) {
			metadata.context = execution.context
			metadata.stepDetails = execution.steps.map((step) => ({
				name: step.name,
				toolName: step.toolName,
				status: step.status,
				retryCount: step.retryCount,
				executionTime: step.startTime && step.endTime ? step.endTime.getTime() - step.startTime.getTime() : 0,
			}))
		}

		return metadata
	}

	/**
	 * Determine if workflow was successful
	 */
	private determineSuccess(execution: WorkflowExecution, aggregation: ResultAggregation): boolean {
		// Basic success criteria
		const successRate = execution.completedSteps / execution.totalSteps
		const hasErrors = execution.failedSteps > 0

		// Success threshold based on aggregation type
		let threshold = 0.8
		if (aggregation.type === "detailed") {
			threshold = 0.9
		} else if (aggregation.type === "structured") {
			threshold = 0.85
		}

		return successRate >= threshold && (!hasErrors || successRate >= 0.9)
	}

	/**
	 * Create result aggregation for code review
	 */
	public createCodeReviewAggregation(): ResultAggregation {
		return {
			type: "detailed",
			includeMetadata: true,
			includeErrors: true,
			includeTiming: true,
			format: "markdown",
		}
	}

	/**
	 * Create result aggregation for file analysis
	 */
	public createFileAnalysisAggregation(): ResultAggregation {
		return {
			type: "structured",
			includeMetadata: true,
			includeErrors: true,
			includeTiming: false,
			format: "json",
		}
	}

	/**
	 * Create result aggregation for quick tasks
	 */
	public createQuickTaskAggregation(): ResultAggregation {
		return {
			type: "summary",
			includeMetadata: false,
			includeErrors: true,
			includeTiming: false,
			format: "text",
		}
	}
}
