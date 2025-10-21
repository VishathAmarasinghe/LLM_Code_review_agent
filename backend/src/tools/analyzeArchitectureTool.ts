import { ToolUse, ToolExecutionContext } from "../types/tools"
import { logger } from "../utils/logger"

/**
 * Intelligent Architecture Analysis Tool
 * This tool requires the LLM to provide strategic reasoning about architecture
 */
export async function analyzeArchitectureTool(
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
		const { analysis_focus, current_understanding, strategic_question } = block.params

		if (!analysis_focus || !current_understanding || !strategic_question) {
			throw new Error("Missing required parameters: analysis_focus, current_understanding, strategic_question")
		}

		logger.info("Architecture analysis requested", {
			analysis_focus,
			strategic_question,
			repositoryId,
			userId,
		})

		// This tool validates that the LLM is thinking strategically
		const analysis = {
			analysis_focus,
			current_understanding,
			strategic_question,
			timestamp: new Date().toISOString(),
			validation: {
				has_strategic_reasoning: strategic_question.length > 20,
				has_context_awareness: current_understanding.length > 50,
				has_specific_focus: analysis_focus.length > 10,
			},
			recommendations: {
				next_steps: [
					"Based on your strategic question, you should investigate the specific architectural concerns",
					"Use read_file to examine the most critical components first",
					"Look for patterns that could impact the areas you're concerned about",
				],
				focus_areas: [
					"Component relationships and dependencies",
					"Data flow and state management",
					"Error handling and edge cases",
					"Performance implications",
				],
			},
		}

		pushToolResult(analysis)

		logger.info("Architecture analysis completed", {
			analysis_focus,
			has_strategic_reasoning: analysis.validation.has_strategic_reasoning,
		})
	} catch (error) {
		logger.error("Architecture analysis failed", { error: (error as Error).message })
		await handleError("analyze_architecture", error as Error)
	}
}
