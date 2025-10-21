import { GitHubWorkspaceManager } from "../workspace"
import { logger } from "../utils/logger"
import { ToolUse } from "../types/tools"

export async function githubReadFileTool(
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
		const filePath: string | undefined = block.params.path
		const lineRange: string | undefined = block.params.line_range

		if (!filePath) {
			pushToolResult({ error: "Missing required parameter: path" })
			return
		}

		if (!workspaceManager || !accessToken) {
			pushToolResult({ error: "GitHub workspace manager or access token not available" })
			return
		}

		// Parse line_range if provided (format: "start-end")
		let startLine: number | undefined
		let lineLimit: number | undefined

		if (lineRange) {
			// More strict regex that only matches integers
			const match = lineRange.match(/^(\d+)-(\d+)$/)
			if (match) {
				const startStr = match[1]
				const endStr = match[2]
				if (startStr && endStr) {
					const start = Number(startStr)
					const end = Number(endStr)
					if (
						!isNaN(start) &&
						!isNaN(end) &&
						start > 0 &&
						end >= start &&
						Number.isInteger(start) &&
						Number.isInteger(end)
					) {
						startLine = start
						lineLimit = end - start + 1 // Convert to limit (number of lines to read)
					} else {
						pushToolResult({
							error: `Invalid line_range format: ${lineRange}. Expected format: "start-end" with positive integers (e.g., "1-50")`,
						})
						return
					}
				} else {
					pushToolResult({
						error: `Invalid line_range format: ${lineRange}. Expected format: "start-end" (e.g., "1-50")`,
					})
					return
				}
			} else {
				pushToolResult({
					error: `Invalid line_range format: ${lineRange}. Expected format: "start-end" (e.g., "1-50")`,
				})
				return
			}
		}

		// Get file content from GitHub
		const result = await workspaceManager.getFileContent(filePath)

		if (!result.success) {
			pushToolResult({ error: result.error })
			return
		}

		if (!result.content) {
			pushToolResult({ error: "File content is empty" })
			return
		}

		// Apply line range if specified
		let content = result.content
		if (startLine !== undefined || lineLimit !== undefined) {
			const lines = content.split("\n")
			const start = startLine ? Math.max(0, startLine - 1) : 0
			const end = lineLimit ? Math.min(lines.length, start + lineLimit) : lines.length

			const selectedLines = lines.slice(start, end)
			content = selectedLines.map((line: string, index: number) => `${start + index + 1} | ${line}`).join("\n")
		} else {
			// Add line numbers if no range specified
			content = content
				.split("\n")
				.map((line: string, index: number) => `${index + 1} | ${line}`)
				.join("\n")
		}

		// Format result similar to Roo Code's format
		const formattedResult = {
			filePath: result.pathResolution?.relativePath || filePath,
			content,
			lineCount: content.split("\n").length,
			isInPRDiff: result.pathResolution?.isInPRDiff || false,
			fileStatus: result.pathResolution?.fileStatus,
		}

		pushToolResult(formattedResult)
	} catch (error) {
		await handleError("read_file", error)
	}
}
