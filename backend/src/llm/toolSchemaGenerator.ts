import { ToolManager } from "../core/toolManager"
import { OpenAITool, ToolName } from "./types"
import { logger } from "../utils/logger"

export class ToolSchemaGenerator {
	private static instance: ToolSchemaGenerator
	private toolManager: ToolManager

	private constructor() {
		this.toolManager = ToolManager.getInstance()
	}

	public static getInstance(): ToolSchemaGenerator {
		if (!ToolSchemaGenerator.instance) {
			ToolSchemaGenerator.instance = new ToolSchemaGenerator()
		}
		return ToolSchemaGenerator.instance
	}

	public generateToolSchema(toolName: ToolName): OpenAITool | null {
		try {
			const handler = this.toolManager.getHandler(toolName)
			if (!handler) {
				logger.warn(`Tool handler not found for: ${toolName}`)
				return null
			}

			const parameters = this.toolManager.getToolParameters(toolName)
			const properties: Record<string, any> = {}
			const required: string[] = []

			for (const param of parameters) {
				properties[param.name] = {
					type: param.type,
					description: param.description,
				}

				if (param.required) {
					required.push(param.name)
				}
			}

			const schema: OpenAITool = {
				type: "function",
				function: {
					name: toolName,
					description: handler.description,
					parameters: {
						type: "object",
						properties,
						required,
					},
				},
			}

			logger.debug(`Generated tool schema for: ${toolName}`, { schema })
			return schema
		} catch (error) {
			logger.error(`Failed to generate tool schema for: ${toolName}`, error)
			return null
		}
	}

	public generateAllToolSchemas(): OpenAITool[] {
		const availableTools = this.toolManager.getAvailableTools()
		const schemas: OpenAITool[] = []

		for (const toolName of availableTools) {
			const schema = this.generateToolSchema(toolName)
			if (schema) {
				schemas.push(schema)
			}
		}

		logger.info(`Generated ${schemas.length} tool schemas`, {
			tools: availableTools,
			generatedSchemas: schemas.length,
		})

		return schemas
	}

	public generateToolSchemasForMode(mode: "code_review" | "analysis" | "exploration"): OpenAITool[] {
		const allSchemas = this.generateAllToolSchemas()

		// Filter schemas based on mode
		const modeFilteredSchemas = allSchemas.filter((schema) => {
			switch (mode) {
				case "code_review":
					// All tools are useful for code review
					return true
				case "analysis":
					// Focus on analysis tools
					return ["codebase_search", "search_files", "read_file", "list_code_definition_names"].includes(
						schema.function.name,
					)
				case "exploration":
					// Focus on exploration tools
					return ["list_files", "codebase_search", "search_files"].includes(schema.function.name)
				default:
					return true
			}
		})

		logger.info(`Generated ${modeFilteredSchemas.length} tool schemas for mode: ${mode}`)
		return modeFilteredSchemas
	}

	public validateToolSchema(schema: OpenAITool): boolean {
		try {
			// Basic validation
			if (!schema.type || schema.type !== "function") {
				return false
			}

			if (!schema.function || !schema.function.name || !schema.function.description) {
				return false
			}

			if (!schema.function.parameters || schema.function.parameters.type !== "object") {
				return false
			}

			// Validate properties
			const { properties, required } = schema.function.parameters
			if (!properties || typeof properties !== "object") {
				return false
			}

			if (!Array.isArray(required)) {
				return false
			}

			// Check that all required properties exist in properties
			for (const reqProp of required) {
				if (!(reqProp in properties)) {
					return false
				}
			}

			return true
		} catch (error) {
			logger.error("Tool schema validation failed", error)
			return false
		}
	}

	public getToolSchemaSummary(): Record<string, any> {
		const schemas = this.generateAllToolSchemas()
		const summary: Record<string, any> = {}

		for (const schema of schemas) {
			const toolName = schema.function.name
			const paramCount = Object.keys(schema.function.parameters.properties).length
			const requiredCount = schema.function.parameters.required.length

			summary[toolName] = {
				description: schema.function.description,
				parameterCount: paramCount,
				requiredParameterCount: requiredCount,
				optionalParameterCount: paramCount - requiredCount,
			}
		}

		return summary
	}

	public exportToolSchemasAsJSON(): string {
		const schemas = this.generateAllToolSchemas()
		return JSON.stringify(schemas, null, 2)
	}

	public exportToolSchemasForOpenAI(): string {
		const schemas = this.generateAllToolSchemas()
		const openAIFormat = {
			tools: schemas,
		}
		return JSON.stringify(openAIFormat, null, 2)
	}
}
