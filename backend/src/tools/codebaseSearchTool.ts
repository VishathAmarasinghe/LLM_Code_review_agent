import { CodeIndexingService } from "../services/indexing/CodeIndexingService"
import { ToolUse } from "../types/tools"

const indexingService = CodeIndexingService.getInstance()

export async function codebaseSearchTool(
	cwd: string,
	block: ToolUse,
	pushToolResult: (output: any) => void,
	handleError: (context: string, error: any) => Promise<void>,
	repositoryId?: number,
	userId?: number,
	workspaceManager?: any,
	accessToken?: string,
) {
	try {
		const query: string | undefined = block.params.query
		const directoryPrefix: string | undefined = block.params.path
		const limit: number | undefined = typeof block.params.limit === "number" ? block.params.limit : undefined

		if (!query) {
			pushToolResult({ error: "Missing required parameter: query" })
			return
		}

		if (!repositoryId || !userId) {
			pushToolResult({
				error: "Repository ID and User ID are required for codebase search",
				note: "This tool searches the indexed repository code only, not PR changes",
			})
			return
		}

		// Add context about what this tool searches
		const searchContext = `Searching indexed repository code (repository ID: ${repositoryId}) for: "${query}"`
		console.log(`[codebase_search] ${searchContext}`)

		const results = await indexingService.searchCode(query, repositoryId, userId, limit ?? 50)

		if (!results || results.length === 0) {
			pushToolResult({
				message: `No relevant code snippets found for the query: "${query}"`,
				note: "This tool searches only the indexed repository code, not PR changes or uncommitted code",
				repositoryId,
				query,
			})
			return
		}

		const filtered = directoryPrefix
			? results.filter((r) => r.filePath && r.filePath.startsWith(directoryPrefix.replace(/^\/+/, "")))
			: results

		if (filtered.length === 0) {
			pushToolResult({
				message: `No relevant code snippets found in path: "${directoryPrefix}" for the query: "${query}"`,
				note: "This tool searches only the indexed repository code, not PR changes or uncommitted code",
				repositoryId,
				query,
				directoryPrefix,
			})
			return
		}

		const payload = {
			query,
			repositoryId,
			searchScope: "indexed repository code only (not PR changes)",
			results: filtered.map((r) => ({
				filePath: r.filePath,
				score: r.score,
				startLine: r.startLine,
				endLine: r.endLine,
				codeChunk: r.content,
			})),
		}

		const textOutput = `Query: ${query}
Repository: ${repositoryId}
Search Scope: Indexed repository code only (not PR changes)
Results: ${filtered.length} found

${payload.results
	.map(
		(res) => `File path: ${res.filePath}
Score: ${res.score}
Lines: ${res.startLine}-${res.endLine}
Code Chunk: ${res.codeChunk}
`,
	)
	.join("\n")}`

		pushToolResult({ ...payload, summary: textOutput })
	} catch (error) {
		console.error("[codebase_search] Error:", error)
		await handleError("codebase_search", error)
	}
}
