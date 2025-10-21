// Deprecated: LLM orchestrated review is now invoked directly by workflow engine.
// Keeping this file for backward compatibility; it proxies to the orchestrator service.
import { ToolUse } from "../types/tools"
import { logger } from "../utils/logger"
import { runLlmOrchestratedReview } from "../orchestration/llmOrchestrator"

const MAX_LOOPS = 20

/**
 * Build a simple file changes list for LLM to review one by one
 */
function buildSimpleFileChangesList(changedFiles: any[]): string {
	if (!changedFiles || changedFiles.length === 0) {
		return ""
	}

	let summary = `CHANGED FILES (${changedFiles.length} files):\n\n`

	// Sort files by change size (largest first) to help LLM prioritize
	const sortedFiles = [...changedFiles].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))

	sortedFiles.forEach((file, index) => {
		summary += `${index + 1}. ${file.filename} (${file.status}) - +${file.additions}/-${file.deletions} lines\n`
	})

	summary += `\nYou can use the read_file tool to examine each file: <read_file><path>filename</path></read_file>`

	return summary
}

export async function llmOrchestratedReviewTool(
	cwd: string,
	toolUse: ToolUse,
	pushResult: (v: any) => void,
	handleError: (action: string, err: Error) => Promise<void>,
	repositoryId?: number,
	userId?: number,
	workspaceManager?: any,
	accessToken?: string,
): Promise<void> {
	try {
		const { taskId, owner, repo, prNumber } = toolUse.params as any
		const result = await runLlmOrchestratedReview(
			cwd,
			{ taskId, owner, repo, prNumber },
			repositoryId,
			userId,
			workspaceManager,
			accessToken,
		)
		pushResult(result)
	} catch (err: any) {
		logger.error("llm_orchestrated_review failed", err)
		await handleError("llm_orchestrated_review", err)
	}
}
