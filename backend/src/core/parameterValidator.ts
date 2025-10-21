import { ToolName, ToolParamName, ToolUse, ToolParameter } from "../types/tools"

export interface ValidationResult {
	isValid: boolean
	errors: string[]
	missingParams: string[]
	invalidParams: string[]
}

export class ParameterValidator {
	private static instance: ParameterValidator
	private toolParameters: Map<ToolName, ToolParameter[]>

	private constructor() {
		this.toolParameters = new Map()
		this.initializeToolParameters()
	}

	public static getInstance(): ParameterValidator {
		if (!ParameterValidator.instance) {
			ParameterValidator.instance = new ParameterValidator()
		}
		return ParameterValidator.instance
	}

	private initializeToolParameters(): void {
		// Define parameters for each tool
		this.toolParameters.set("search_files", [
			{ name: "path", type: "string", required: true, description: "Directory path to search in" },
			{ name: "regex", type: "string", required: true, description: "Regex pattern to search for" },
			{ name: "file_pattern", type: "string", required: false, description: "File pattern filter" },
		])

		this.toolParameters.set("codebase_search", [
			{ name: "query", type: "string", required: true, description: "Semantic search query" },
			{ name: "path", type: "string", required: false, description: "Directory prefix to limit search" },
			{ name: "limit", type: "number", required: false, description: "Maximum number of results" },
		])

		this.toolParameters.set("read_file", [
			{ name: "path", type: "string", required: true, description: "File path to read" },
			{
				name: "line_range",
				type: "string",
				required: false,
				description: "Line range in format 'start-end' (e.g., '1-50')",
			},
		])

		this.toolParameters.set("list_files", [
			{ name: "path", type: "string", required: true, description: "Directory path to list" },
			{ name: "recursive", type: "boolean", required: false, description: "Whether to list recursively" },
			{ name: "limit", type: "number", required: false, description: "Maximum files to return" },
		])

		this.toolParameters.set("list_code_definition_names", [
			{ name: "path", type: "string", required: true, description: "File path to analyze" },
		])

		// LLM orchestrated review is invoked directly by workflow engine (no tool parameters)
	}

	public validateToolUse(toolUse: ToolUse): ValidationResult {
		const toolName = toolUse.name
		const params = toolUse.params
		const toolParamDefs = this.toolParameters.get(toolName)

		if (!toolParamDefs) {
			return {
				isValid: false,
				errors: [`Unknown tool: ${toolName}`],
				missingParams: [],
				invalidParams: [],
			}
		}

		const errors: string[] = []
		const missingParams: string[] = []
		const invalidParams: string[] = []

		// Check required parameters
		for (const paramDef of toolParamDefs) {
			if (paramDef.required) {
				const paramValue = params[paramDef.name]
				if (!paramValue || (typeof paramValue === "string" && paramValue.trim() === "")) {
					missingParams.push(paramDef.name)
					errors.push(`Missing required parameter: ${paramDef.name}`)
				}
			}
		}

		// Validate parameter types and values
		for (const [paramName, paramValue] of Object.entries(params)) {
			const paramDef = toolParamDefs.find((p) => p.name === paramName)

			if (!paramDef) {
				invalidParams.push(paramName)
				errors.push(`Unknown parameter: ${paramName}`)
				continue
			}

			if (paramValue !== undefined && paramValue !== null) {
				const validationError = this.validateParameterValue(paramName as any, paramValue, paramDef.type)
				if (validationError) {
					invalidParams.push(paramName)
					errors.push(validationError)
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			missingParams,
			invalidParams,
		}
	}

	private validateParameterValue(paramName: ToolParamName, value: string, expectedType: string): string | null {
		if (expectedType === "string") {
			// String validation - just check it's not empty if provided
			if (typeof value !== "string") {
				return `Parameter ${paramName} must be a string`
			}
		} else if (expectedType === "number") {
			// Number validation
			const numValue = Number(value)
			if (isNaN(numValue)) {
				return `Parameter ${paramName} must be a valid number`
			}
			if (numValue < 0) {
				return `Parameter ${paramName} must be a positive number`
			}
		} else if (expectedType === "boolean") {
			// Boolean validation
			if (typeof value === "boolean") {
				return null // Already a boolean
			}
			if (typeof value === "string") {
				const boolValue = value.toLowerCase()
				if (boolValue !== "true" && boolValue !== "false") {
					return `Parameter ${paramName} must be 'true' or 'false'`
				}
			} else {
				return `Parameter ${paramName} must be a boolean`
			}
		}

		return null
	}

	public getToolParameters(toolName: ToolName): ToolParameter[] {
		return this.toolParameters.get(toolName) || []
	}

	public getRequiredParameters(toolName: ToolName): ToolParamName[] {
		const params = this.toolParameters.get(toolName) || []
		return params.filter((p) => p.required).map((p) => p.name)
	}

	public getOptionalParameters(toolName: ToolName): ToolParamName[] {
		const params = this.toolParameters.get(toolName) || []
		return params.filter((p) => !p.required).map((p) => p.name)
	}
}
