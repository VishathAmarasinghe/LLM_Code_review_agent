import { GitHubWorkspaceManager } from "../workspace"
import { logger } from "../utils/logger"
import { ToolUse } from "../types/tools"

export async function githubSearchFilesTool(
	cwd: string,
	block: ToolUse,
	pushToolResult: (output: any) => void,
	handleError: (context: string, error: any) => Promise<void>,
	repositoryId?: number,
	userId?: number,
	workspaceManager?: GitHubWorkspaceManager,
	accessToken?: string,
) {
	try {
		const path: string | undefined = block.params.path
		const regex: string | undefined = block.params.regex
		const filePattern: string | undefined = block.params.file_pattern

		if (!path) {
			pushToolResult({ error: "Missing required parameter: path" })
			return
		}

		if (!regex) {
			pushToolResult({ error: "Missing required parameter: regex" })
			return
		}

		if (!workspaceManager || !accessToken) {
			pushToolResult({ error: "GitHub workspace manager or access token not available" })
			return
		}

		// Search files using GitHub workspace manager
		const result = await workspaceManager.searchFiles(path, regex, filePattern)

		if (!result.success) {
			pushToolResult({ error: result.error })
			return
		}

		// Format results similar to Roo Code's format
		const formattedResults =
			result.results?.map((fileResult: any) => ({
				file: fileResult.file,
				matches: fileResult.matches,
				// In a real implementation, you'd include the actual match content
				content: fileResult.content ? fileResult.content.substring(0, 500) + "..." : "",
			})) || []

		pushToolResult({
			searchPath: path,
			regex,
			filePattern,
			results: formattedResults,
			totalMatches: formattedResults.reduce((sum: number, r: any) => sum + r.matches, 0),
		})
	} catch (error) {
		await handleError("search_files", error)
	}
}
