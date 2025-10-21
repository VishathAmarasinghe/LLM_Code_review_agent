import { ToolUse, ToolExecutionContext } from "../types/tools"
import { logger } from "../utils/logger"

/**
 * Strategic Analysis Tool
 * This tool requires the LLM to provide strategic thinking about analysis progression
 */
export async function strategicAnalysisTool(
	cwd: string,
	block: ToolUse,
	pushToolResult: (content: any) => void,
	handleError: (action: string, error: Error) => Promise<void>,
	repositoryId?: number,
	userId?: number,
	workspaceManager?: any,
	accessToken?: string,
): Promise<void> {
	try {
		const { analysis_stage, current_understanding, potential_issues, next_investigation, reasoning } = block.params

		if (!analysis_stage || !current_understanding || !potential_issues || !next_investigation || !reasoning) {
			throw new Error(
				"Missing required parameters: analysis_stage, current_understanding, potential_issues, next_investigation, reasoning",
			)
		}

		logger.info("Strategic analysis requested", {
			analysis_stage,
			current_understanding: current_understanding.substring(0, 100) + "...",
			potential_issues: potential_issues.substring(0, 100) + "...",
			next_investigation: next_investigation.substring(0, 100) + "...",
			reasoning: reasoning.substring(0, 100) + "...",
			repositoryId,
			userId,
		})

		// This tool validates that the LLM is thinking strategically about analysis progression
		const strategicAnalysis = {
			analysis_stage,
			current_understanding,
			potential_issues,
			next_investigation,
			reasoning,
			timestamp: new Date().toISOString(),
			validation: {
				has_stage_awareness: analysis_stage.length > 5,
				has_understanding: current_understanding.length > 50,
				has_issue_identification: potential_issues.length > 30,
				has_next_steps: next_investigation.length > 40,
				has_strategic_reasoning: reasoning.length > 60,
			},
			analysis_guidance: {
				stage_priorities: {
					context: "Focus on understanding the PR purpose and key components",
					investigation: "Deep dive into critical areas and potential issues",
					pattern_recognition: "Look for systemic patterns and architectural concerns",
					finalization: "Synthesize findings and provide actionable recommendations",
				},
				strategic_questions: [
					"What are the most critical areas that could break?",
					"What patterns suggest potential issues?",
					"How do these findings impact the overall system?",
					"What should be prioritized for immediate attention?",
				],
				next_steps_validation: [
					"Does your next investigation address the most critical concerns?",
					"Are you focusing on high-impact areas first?",
					"Is your reasoning based on the evidence you've gathered?",
					"Will this investigation help you provide better recommendations?",
				],
			},
		}

		pushToolResult(strategicAnalysis)

		logger.info("Strategic analysis completed", {
			analysis_stage,
			has_strategic_reasoning: strategicAnalysis.validation.has_strategic_reasoning,
		})
	} catch (error) {
		logger.error("Strategic analysis failed", { error: (error as Error).message })
		await handleError("strategic_analysis", error as Error)
	}
}
