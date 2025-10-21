import { listCodeDefinitionNames } from "../services/code/symbols"

interface ToolBlock {
	params: Record<string, any>
}

export async function listCodeDefinitionNamesTool(
	cwd: string,
	block: ToolBlock,
	pushToolResult: (output: any) => void,
	handleError: (context: string, error: any) => Promise<void>,
) {
	try {
		const filePath: string | undefined = block.params.path
		if (!filePath) {
			pushToolResult({ error: "Missing required parameter: path" })
			return
		}

		const results = await listCodeDefinitionNames(cwd, filePath)
		pushToolResult(results)
	} catch (error) {
		await handleError("list_code_definition_names", error)
	}
}
