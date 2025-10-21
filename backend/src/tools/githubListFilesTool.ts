import { GitHubWorkspaceManager } from "../workspace"
import { logger } from "../utils/logger"
import { ToolUse } from "../types/tools"

export async function githubListFilesTool(
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
		const recursive: boolean | undefined =
			typeof block.params.recursive === "boolean" ? block.params.recursive : undefined

		if (!path) {
			pushToolResult({ error: "Missing required parameter: path" })
			return
		}

		if (!workspaceManager || !accessToken) {
			pushToolResult({ error: "GitHub workspace manager or access token not available" })
			return
		}

		// List files using GitHub workspace manager
		const result = await workspaceManager.listFiles(path, recursive || false)

		if (!result.success) {
			pushToolResult({ error: result.error })
			return
		}

		// Format results similar to Roo Code's format
		const formattedFiles =
			result.files?.map((file: any) => ({
				name: file.name,
				path: file.path,
				type: file.type,
				size: file.size,
				url: file.html_url,
			})) || []

		pushToolResult({
			directory: path,
			recursive: recursive || false,
			files: formattedFiles,
			totalFiles: formattedFiles.length,
		})
	} catch (error) {
		await handleError("list_files", error)
	}
}
