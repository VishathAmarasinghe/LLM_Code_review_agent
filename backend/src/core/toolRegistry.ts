import { ToolHandler, ToolName, ToolParameter } from "../types/tools"
import { githubSearchFilesTool } from "../tools/githubSearchFilesTool"
import { codebaseSearchTool } from "../tools/codebaseSearchTool"
import { githubReadFileTool } from "../tools/githubReadFileTool"
import { githubListFilesTool } from "../tools/githubListFilesTool"
import { githubListCodeDefinitionNamesTool } from "../tools/githubListCodeDefinitionNamesTool"
import { analyzeArchitectureTool } from "../tools/analyzeArchitectureTool"
import { identifyRisksTool } from "../tools/identifyRisksTool"
import { strategicAnalysisTool } from "../tools/strategicAnalysisTool"
import { patternRecognitionTool } from "../tools/patternRecognitionTool"

// Tool parameter definitions
const toolParameters: Record<ToolName, ToolParameter[]> = {
	search_files: [
		{ name: "path", type: "string", required: true, description: "Directory path to search in" },
		{ name: "regex", type: "string", required: true, description: "Regex pattern to search for" },
		{ name: "file_pattern", type: "string", required: false, description: "File pattern filter (e.g., *.ts)" },
	],
	codebase_search: [
		{ name: "query", type: "string", required: true, description: "Semantic search query" },
		{ name: "path", type: "string", required: false, description: "Optional directory prefix to limit search" },
		{ name: "limit", type: "number", required: false, description: "Maximum number of results" },
	],
	read_file: [
		{ name: "path", type: "string", required: true, description: "File path to read" },
		{
			name: "line_range",
			type: "string",
			required: false,
			description: "Line range in format 'start-end' (e.g., '1-50')",
		},
	],
	list_files: [
		{ name: "path", type: "string", required: true, description: "Directory path to list" },
		{ name: "recursive", type: "boolean", required: false, description: "Whether to list recursively" },
		{ name: "limit", type: "number", required: false, description: "Maximum number of files to return" },
	],
	list_code_definition_names: [
		{ name: "path", type: "string", required: true, description: "File path to analyze for symbols" },
	],
	analyze_architecture: [
		{
			name: "analysis_focus",
			type: "string",
			required: true,
			description:
				"What aspect of architecture to analyze (data_flow, component_structure, state_management, security_patterns)",
		},
		{
			name: "current_understanding",
			type: "string",
			required: true,
			description: "Your current understanding of the codebase",
		},
		{
			name: "strategic_question",
			type: "string",
			required: true,
			description: "The strategic question you're trying to answer",
		},
	],
	identify_risks: [
		{
			name: "component_type",
			type: "string",
			required: true,
			description: "Type of component or pattern you're analyzing",
		},
		{
			name: "patterns_found",
			type: "string",
			required: true,
			description: "Patterns you've identified that could be risky",
		},
		{
			name: "reasoning",
			type: "string",
			required: true,
			description: "Your reasoning for why these patterns are concerning",
		},
	],
	strategic_analysis: [
		{
			name: "analysis_stage",
			type: "string",
			required: true,
			description: "Current stage of analysis (context, investigation, pattern_recognition, finalization)",
		},
		{ name: "current_understanding", type: "string", required: true, description: "What you understand so far" },
		{ name: "potential_issues", type: "string", required: true, description: "Potential issues you've identified" },
		{
			name: "next_investigation",
			type: "string",
			required: true,
			description: "What you should investigate next and why",
		},
		{
			name: "reasoning",
			type: "string",
			required: true,
			description: "Your strategic reasoning for the next steps",
		},
	],
	pattern_recognition: [
		{
			name: "patterns_found",
			type: "string",
			required: true,
			description: "Patterns you've identified across the codebase",
		},
		{
			name: "analysis_focus",
			type: "string",
			required: true,
			description: "What you're looking for in these patterns",
		},
		{
			name: "reasoning",
			type: "string",
			required: true,
			description: "Why these patterns matter for code quality",
		},
	],
}

// Tool descriptions
const toolDescriptions: Record<ToolName, string> = {
	search_files: "Search for text patterns in files using regex",
	codebase_search: "Semantic search across the codebase using vector embeddings",
	read_file: "Read file contents with optional line range",
	list_files: "List files and directories in a path",
	list_code_definition_names: "List code symbols (functions, classes, etc.) in a file",
	analyze_architecture:
		"Analyze the overall architecture and identify key patterns based on your strategic understanding",
	identify_risks: "Identify potential risks and issues based on code patterns you've discovered",
	strategic_analysis: "Perform strategic analysis of your current understanding and plan next investigation steps",
	pattern_recognition: "Recognize and analyze patterns across the codebase for quality assessment",
}

export class ToolRegistry {
	private static instance: ToolRegistry
	private handlers: Map<ToolName, ToolHandler> = new Map()

	private constructor() {
		this.registerTools()
	}

	public static getInstance(): ToolRegistry {
		if (!ToolRegistry.instance) {
			ToolRegistry.instance = new ToolRegistry()
		}
		return ToolRegistry.instance
	}

	private registerTools(): void {
		// Register search_files tool (GitHub version)
		this.register({
			name: "search_files",
			handler: githubSearchFilesTool,
			description: toolDescriptions.search_files,
			parameters: toolParameters.search_files,
		})

		// Register codebase_search tool
		this.register({
			name: "codebase_search",
			handler: codebaseSearchTool,
			description: toolDescriptions.codebase_search,
			parameters: toolParameters.codebase_search,
		})

		// Register read_file tool (GitHub version)
		this.register({
			name: "read_file",
			handler: githubReadFileTool,
			description: toolDescriptions.read_file,
			parameters: toolParameters.read_file,
		})

		// Register list_files tool (GitHub version)
		this.register({
			name: "list_files",
			handler: githubListFilesTool,
			description: toolDescriptions.list_files,
			parameters: toolParameters.list_files,
		})

		// Register list_code_definition_names tool (GitHub version)
		this.register({
			name: "list_code_definition_names",
			handler: githubListCodeDefinitionNamesTool,
			description: toolDescriptions.list_code_definition_names,
			parameters: toolParameters.list_code_definition_names,
		})

		// Register intelligent analysis tools
		this.register({
			name: "analyze_architecture",
			handler: analyzeArchitectureTool,
			description: toolDescriptions.analyze_architecture,
			parameters: toolParameters.analyze_architecture,
		})

		this.register({
			name: "identify_risks",
			handler: identifyRisksTool,
			description: toolDescriptions.identify_risks,
			parameters: toolParameters.identify_risks,
		})

		this.register({
			name: "strategic_analysis",
			handler: strategicAnalysisTool,
			description: toolDescriptions.strategic_analysis,
			parameters: toolParameters.strategic_analysis,
		})

		this.register({
			name: "pattern_recognition",
			handler: patternRecognitionTool,
			description: toolDescriptions.pattern_recognition,
			parameters: toolParameters.pattern_recognition,
		})

		// LLM orchestrated review is now invoked directly by the workflow engine (not a tool)
	}

	public register(handler: ToolHandler): void {
		this.handlers.set(handler.name, handler)
	}

	public getHandler(toolName: ToolName): ToolHandler | undefined {
		return this.handlers.get(toolName)
	}

	public getAllHandlers(): ToolHandler[] {
		return Array.from(this.handlers.values())
	}

	public getAvailableTools(): ToolName[] {
		return Array.from(this.handlers.keys())
	}

	public getToolDescription(toolName: ToolName): string {
		const handler = this.handlers.get(toolName)
		return handler?.description || "Unknown tool"
	}

	public getToolParameters(toolName: ToolName): ToolParameter[] {
		const handler = this.handlers.get(toolName)
		return handler?.parameters || []
	}
}
