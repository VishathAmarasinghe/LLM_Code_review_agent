import { ToolManager } from "../core/toolManager"
import { SystemPromptSettings, ConversationContext } from "./types"
import { logger } from "../utils/logger"

export class SystemPromptBuilder {
	private static instance: SystemPromptBuilder
	private toolManager: ToolManager

	private constructor() {
		this.toolManager = ToolManager.getInstance()
	}

	public static getInstance(): SystemPromptBuilder {
		if (!SystemPromptBuilder.instance) {
			SystemPromptBuilder.instance = new SystemPromptBuilder()
		}
		return SystemPromptBuilder.instance
	}

	public async buildSystemPrompt(
		context: ConversationContext,
		settings: Partial<SystemPromptSettings> = {},
	): Promise<string> {
		const defaultSettings: SystemPromptSettings = Object.assign(
			{
				includeToolDescriptions: true,
				includeUsageRules: true,
				includeCapabilities: true,
				includeSystemInfo: true,
			},
			settings || {},
		)

		const sections: string[] = []

		// Role definition
		sections.push(this.buildRoleDefinition())

		// Markdown formatting rules
		sections.push(this.buildMarkdownFormattingSection())

		// Tool use section
		sections.push(this.buildToolUseSection())

		// Tool descriptions
		if (defaultSettings.includeToolDescriptions) {
			sections.push(await this.buildToolDescriptionsSection())
		}

		// Tool use guidelines
		if (defaultSettings.includeUsageRules) {
			sections.push(this.buildToolUseGuidelinesSection())
		}

		// Capabilities section
		if (defaultSettings.includeCapabilities) {
			sections.push(this.buildCapabilitiesSection(context))
		}

		// Rules section
		sections.push(this.buildRulesSection(context))

		// System info section
		if (defaultSettings.includeSystemInfo) {
			sections.push(this.buildSystemInfoSection(context))
		}

		// Objective section
		sections.push(this.buildObjectiveSection())

		// Custom instructions
		if (defaultSettings.customInstructions) {
			sections.push(this.buildCustomInstructionsSection(defaultSettings.customInstructions))
		}

		const fullPrompt = sections.join("\n\n")

		logger.info("System prompt built", {
			sections: sections.length,
			totalLength: fullPrompt.length,
			settings: defaultSettings,
		})

		return fullPrompt
	}

	private buildRoleDefinition(): string {
		return `You are a code review agent, an experienced technical leader who specializes in analyzing code, identifying issues, and providing comprehensive feedback. Your goal is to thoroughly examine code changes, understand their impact, and provide actionable insights to improve code quality, security, and maintainability.

You are inquisitive and methodical in your approach, using available tools to gather comprehensive context before providing detailed analysis and recommendations.`
	}

	private buildMarkdownFormattingSection(): string {
		return `====

MARKDOWN RULES

ALL responses MUST show ANY \`language construct\` OR filename reference as clickable, exactly as [\`filename OR language.declaration()\`](relative/file/path.ext:line); line is required for \`syntax\` and optional for filename links. This applies to ALL markdown responses and ALSO those in <attempt_completion>`
	}

	private buildToolUseSection(): string {
		return `====

TOOL USE

You have access to a set of tools that are executed automatically upon your request. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

# Tool Use Formatting

Tool uses are formatted using XML-style tags. The tool name itself becomes the XML tag name. Each parameter is enclosed within its own set of tags. Here's the structure:

<actual_tool_name>
<parameter1_name>value1</parameter1_name>
<parameter2_name>value2</parameter2_name>
...
</actual_tool_name>

For example, to use the search_files tool:

<search_files>
<path>src</path>
<regex>function.*auth</regex>
<file_pattern>*.ts</file_pattern>
</search_files>

Always use the actual tool name as the XML tag name for proper parsing and execution.`
	}

	private async buildToolDescriptionsSection(): Promise<string> {
		const toolSchemas = this.toolManager.getAllToolSchemas()
		const toolDescriptions: string[] = []

		for (const schema of toolSchemas) {
			if (!schema) continue

			const description = this.toolManager.getToolDescription(schema.name as any)
			const parameters = this.toolManager.getToolParameters(schema.name as any)

			let toolSection = `## ${schema.name}\n`
			toolSection += `Description: ${description}\n\n`

			if (parameters.length > 0) {
				toolSection += `Parameters:\n`
				for (const param of parameters) {
					const required = param.required ? " (required)" : " (optional)"
					toolSection += `- ${param.name}: ${param.description}${required}\n`
				}
			}

			toolDescriptions.push(toolSection)
		}

		return `# Tools\n\n${toolDescriptions.join("\n\n")}`
	}

	private buildToolUseGuidelinesSection(): string {
		return `# Tool Use Guidelines

- **CRITICAL: For ANY exploration of code you haven't examined yet in this conversation, you MUST use the \`codebase_search\` tool FIRST before using search_files or other file exploration tools.** This requirement applies throughout the entire conversation, not just when starting a task. The codebase_search tool uses semantic search to find relevant code based on meaning, not just keywords, making it much more effective for understanding how features are implemented.

- When using the search_files tool (after codebase_search), craft your regex patterns carefully to balance specificity and flexibility. Based on the user's task you may use it to find code patterns, TODO comments, function definitions, or any text-based information across the project.

- Use read_file with specific line ranges to examine code in detail. Avoid reading entire large files unless necessary.

- Use list_files to explore directory structures and understand project organization.

- Use list_code_definition_names to discover functions, classes, and other symbols in files before reading them.

- Always analyze tool results thoroughly before proceeding to the next step.`
	}

	private buildCapabilitiesSection(context: ConversationContext): string {
		return `# Capabilities

- **Code Analysis**: Deep understanding of code structure, patterns, and best practices
- **Security Review**: Identification of security vulnerabilities and potential issues
- **Performance Analysis**: Detection of performance bottlenecks and optimization opportunities
- **Code Quality Assessment**: Evaluation of code maintainability, readability, and adherence to standards
- **Architecture Review**: Analysis of system design and architectural decisions
- **Dependency Analysis**: Understanding of code relationships and dependencies
- **Testing Recommendations**: Suggestions for improving test coverage and quality
- **Documentation Review**: Assessment of code documentation and suggestions for improvement

# Available Tools

- **codebase_search**: Semantic search across the entire codebase
- **search_files**: Regex-based text search in files
- **read_file**: Read file contents with optional line ranges
- **list_files**: List files and directories
- **list_code_definition_names**: Discover code symbols and definitions`
	}

	private buildRulesSection(context: ConversationContext): string {
		return `====

RULES

- The project base directory is: ${context.workspacePath}
- All file paths must be relative to this directory
- You cannot \`cd\` into a different directory to complete a task
- Do not use the ~ character or $HOME to refer to the home directory
- When creating analysis reports, organize findings by category (Security, Performance, Code Quality, etc.)
- Provide specific line numbers and file paths when referencing code issues
- Include code snippets to illustrate your points
- Suggest concrete improvements with examples when possible
- Consider the broader impact of changes on the codebase
- Be thorough but concise in your analysis
- Focus on actionable recommendations rather than just identifying problems
- Consider the context of the code changes and their intended purpose
- Evaluate both immediate and long-term implications of code changes`
	}

	private buildSystemInfoSection(context: ConversationContext): string {
		const now = new Date()
		const createdAtIso =
			(context as any)?.createdAt instanceof Date
				? (context as any).createdAt.toISOString()
				: typeof (context as any)?.createdAt === "string"
					? (context as any).createdAt
					: "Not available"
		const updatedAtIso =
			(context as any)?.updatedAt instanceof Date
				? (context as any).updatedAt.toISOString()
				: typeof (context as any)?.updatedAt === "string"
					? (context as any).updatedAt
					: "Not available"
		const toolCallsCount = Array.isArray((context as any)?.toolCallHistory)
			? (context as any).toolCallHistory.length
			: 0
		return `====

SYSTEM INFORMATION

- Current time: ${now.toISOString()}
- Workspace: ${context.workspacePath}
- Repository ID: ${context.repositoryId || "Not specified"}
- User ID: ${context.userId || "Not specified"}
- Conversation started: ${createdAtIso}
- Last updated: ${updatedAtIso}
- Total tool calls: ${toolCallsCount}`
	}

	private buildObjectiveSection(): string {
		return `====

OBJECTIVE

Your primary objective is to provide comprehensive code review analysis that helps improve code quality, security, and maintainability. You should:

1. **Analyze Code Changes**: Thoroughly examine the code being reviewed
2. **Identify Issues**: Find potential problems, bugs, security vulnerabilities, and code quality issues
3. **Provide Context**: Understand the broader impact of changes on the codebase
4. **Suggest Improvements**: Offer specific, actionable recommendations
5. **Prioritize Findings**: Rank issues by severity and importance
6. **Document Analysis**: Provide clear, well-structured feedback

Use all available tools to gather comprehensive context before providing your analysis. Be methodical and thorough in your approach.`
	}

	private buildCustomInstructionsSection(instructions: string): string {
		return `====

CUSTOM INSTRUCTIONS

${instructions}`
	}
}
