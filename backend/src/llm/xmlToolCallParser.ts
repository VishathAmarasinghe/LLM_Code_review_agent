import { ToolUse } from "../types/tools"
import { logger } from "../utils/logger"

/**
 * Parser for XML-style tool calls in LLM responses
 * Converts XML format tool calls to ToolUse objects
 */
export class XmlToolCallParser {
	private static instance: XmlToolCallParser

	private constructor() {}

	public static getInstance(): XmlToolCallParser {
		if (!XmlToolCallParser.instance) {
			XmlToolCallParser.instance = new XmlToolCallParser()
		}
		return XmlToolCallParser.instance
	}

	/**
	 * Parse XML tool calls from LLM response text
	 */
	public parseToolCallsFromText(text: string): ToolUse[] {
		const toolCalls: ToolUse[] = []

		try {
			// Find all XML tool call blocks - support both <tool_name> and <functions.tool_name> formats
			const toolCallRegex = /<(?:functions\.)?(\w+)>([\s\S]*?)<\/(?:functions\.)?\1>/g
			let match

			while ((match = toolCallRegex.exec(text)) !== null) {
				const toolName = match[1] as any
				const content = match[2]

				// Skip if it's not a valid tool name
				if (!toolName || !this.isValidToolName(toolName)) {
					continue
				}

				// Parse parameters from the content
				const params = this.parseParameters(content || "")

				if (params) {
					const toolUse: ToolUse = {
						type: "tool_use",
						name: toolName,
						params: params,
						partial: false,
					}

					toolCalls.push(toolUse)
					logger.info(`Parsed XML tool call: ${toolName}`, { params })
				}
			}

			logger.info(`Parsed ${toolCalls.length} tool calls from XML`, {
				toolNames: toolCalls.map((tc) => tc.name),
			})
		} catch (error) {
			logger.error("Error parsing XML tool calls", {
				error: (error as Error).message,
				text: text.substring(0, 500) + "...",
			})
		}

		return toolCalls
	}

	/**
	 * Parse parameters from XML content
	 */
	private parseParameters(content: string): Record<string, string> | null {
		const params: Record<string, string> = {}

		try {
			// Find all parameter tags
			const paramRegex = /<(\w+)>([\s\S]*?)<\/\1>/g
			let match

			while ((match = paramRegex.exec(content)) !== null) {
				const paramName = match[1]
				const paramValue = match[2]?.trim()

				if (paramName && paramValue) {
					params[paramName] = paramValue
				}
			}

			return Object.keys(params).length > 0 ? params : null
		} catch (error) {
			logger.error("Error parsing parameters", {
				error: (error as Error).message,
				content: content.substring(0, 200) + "...",
			})
			return null
		}
	}

	/**
	 * Check if the tool name is valid
	 */
	private isValidToolName(toolName: string): boolean {
		const validToolNames = [
			"read_file",
			"codebase_search",
			"search_files",
			"list_files",
			"list_code_definition_names",
			"analyze_architecture",
			"identify_risks",
			"strategic_analysis",
			"pattern_recognition",
		]

		return validToolNames.includes(toolName)
	}

	/**
	 * Remove tool calls from text to get clean response
	 */
	public removeToolCallsFromText(text: string): string {
		try {
			// Remove XML tool call blocks - support both <tool_name> and <functions.tool_name> formats
			const toolCallRegex = /<(?:functions\.)?(\w+)>[\s\S]*?<\/(?:functions\.)?\1>/g
			return text.replace(toolCallRegex, "").trim()
		} catch (error) {
			logger.error("Error removing tool calls from text", {
				error: (error as Error).message,
			})
			return text
		}
	}

	/**
	 * Check if text contains XML tool calls
	 */
	public hasToolCalls(text: string): boolean {
		const toolCallRegex = /<(?:functions\.)?(\w+)>[\s\S]*?<\/(?:functions\.)?\1>/g
		return toolCallRegex.test(text)
	}
}
