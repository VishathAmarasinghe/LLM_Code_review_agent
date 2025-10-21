import { readFileWithRange } from "../services/fs/fileRead"

interface ToolBlock {
	params: Record<string, any>
}

export async function readFileTool(
	cwd: string,
	block: ToolBlock,
	pushToolResult: (output: any) => void,
	handleError: (context: string, error: any) => Promise<void>,
) {
	try {
		const filePath: string | undefined = block.params.path
		const lineRange: string | undefined = block.params.line_range

		if (!filePath) {
			pushToolResult({ error: "Missing required parameter: path" })
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

		const result = await readFileWithRange(cwd, filePath, { startLine, lineLimit })
		pushToolResult(result)
	} catch (error) {
		await handleError("read_file", error)
	}
}
