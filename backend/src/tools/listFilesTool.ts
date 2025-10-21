import { listFiles } from "../services/fs/listFiles"

interface ToolBlock {
	params: Record<string, any>
}

export async function listFilesTool(
	cwd: string,
	block: ToolBlock,
	pushToolResult: (output: any) => void,
	handleError: (context: string, error: any) => Promise<void>,
) {
	try {
		const dirPath: string | undefined = block.params.path
		const recursive: boolean | undefined = block.params.recursive
		const limit: number | undefined = block.params.limit

		if (!dirPath) {
			pushToolResult({ error: "Missing required parameter: path" })
			return
		}

		const results = await listFiles(cwd, dirPath, { recursive, limit })
		pushToolResult(results)
	} catch (error) {
		await handleError("list_files", error)
	}
}
