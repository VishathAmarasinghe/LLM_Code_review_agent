import { GitHubWorkspaceManager } from "../workspace"
import { logger } from "../utils/logger"
import { ToolUse } from "../types/tools"

export interface CodeDefinition {
	name: string
	kind: "function" | "class" | "interface" | "type" | "unknown"
	startLine: number
	endLine: number
}

export async function githubListCodeDefinitionNamesTool(
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

		if (!filePath) {
			pushToolResult({ error: "Missing required parameter: path" })
			return
		}

		if (!workspaceManager || !accessToken) {
			pushToolResult({ error: "GitHub workspace manager or access token not available" })
			return
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

		// Parse code definitions from the content
		const definitions = parseCodeDefinitions(result.content)

		// Format result similar to Roo Code's format
		const formattedResult = {
			filePath: result.pathResolution?.relativePath || filePath,
			definitions,
			totalDefinitions: definitions.length,
			isInPRDiff: result.pathResolution?.isInPRDiff || false,
			fileStatus: result.pathResolution?.fileStatus,
		}

		pushToolResult(formattedResult)
	} catch (error) {
		await handleError("list_code_definition_names", error)
	}
}

/**
 * Parse code definitions from file content
 */
function parseCodeDefinitions(content: string): CodeDefinition[] {
	const lines = content.split(/\r?\n/)
	const definitions: CodeDefinition[] = []

	const push = (name: string, kind: CodeDefinition["kind"], line: number) => {
		definitions.push({ name, kind, startLine: line, endLine: line })
	}

	// Regex patterns for different code definitions
	const patterns = [
		// Functions
		{ regex: /function\s+([A-Za-z0-9_$]+)\s*\(/, kind: "function" as const },
		{ regex: /const\s+([A-Za-z0-9_$]+)\s*=\s*\([^)]*\)\s*=>/, kind: "function" as const },
		{ regex: /const\s+([A-Za-z0-9_$]+)\s*=\s*function/, kind: "function" as const },
		{ regex: /([A-Za-z0-9_$]+)\s*:\s*\([^)]*\)\s*=>/, kind: "function" as const },

		// Classes
		{ regex: /class\s+([A-Za-z0-9_$]+)/, kind: "class" as const },

		// Interfaces
		{ regex: /interface\s+([A-Za-z0-9_$]+)/, kind: "interface" as const },

		// Types
		{ regex: /type\s+([A-Za-z0-9_$]+)\s*=\s*/, kind: "type" as const },

		// Enums
		{ regex: /enum\s+([A-Za-z0-9_$]+)/, kind: "type" as const },

		// Variables (const, let, var)
		{ regex: /(?:const|let|var)\s+([A-Za-z0-9_$]+)/, kind: "unknown" as const },

		// React components
		{ regex: /const\s+([A-Za-z0-9_$]+)\s*=\s*\([^)]*\)\s*=>\s*{/, kind: "function" as const },
		{ regex: /function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\s*{/, kind: "function" as const },
	]

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim()

		// Skip comments and empty lines
		if (line.startsWith("//") || line.startsWith("/*") || line.startsWith("*") || line === "") {
			continue
		}

		// Check each pattern
		for (const pattern of patterns) {
			const match = pattern.regex.exec(line)
			if (match && match[1]) {
				push(match[1], pattern.kind, i + 1)
				break // Only match the first pattern per line
			}
		}
	}

	return definitions
}
