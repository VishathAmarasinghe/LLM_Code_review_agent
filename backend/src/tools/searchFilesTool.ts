import * as path from "node:path"
import { regexSearchFiles } from "../services/search/regexSearch"

interface ToolBlock {
	params: Record<string, any>
}

export async function searchFilesTool(
	cwd: string,
	block: ToolBlock,
	pushToolResult: (output: any) => void,
	handleError: (context: string, error: any) => Promise<void>,
) {
	try {
		const relDirPath: string | undefined = block.params.path
		const regex: string | undefined = block.params.regex
		const filePattern: string | undefined = block.params.file_pattern

		if (!relDirPath) {
			pushToolResult({ error: "Missing required parameter: path" })
			return
		}
		if (!regex) {
			pushToolResult({ error: "Missing required parameter: regex" })
			return
		}

		const absolutePath = path.resolve(cwd, relDirPath)
		const results = await regexSearchFiles(cwd, absolutePath, regex, filePattern)
		pushToolResult(results)
	} catch (error) {
		await handleError("searching files", error)
	}
}
