import { ContextInjectionOptions, ConversationContext } from "../types"

export function getContextInjectionSection(
	context: ConversationContext,
	options: ContextInjectionOptions = {
		includeWorkspaceInfo: true,
		includeRepositoryInfo: true,
		includeUserInfo: true,
		includeEnvironmentDetails: true,
		includeRecentChanges: false,
		includeCodebaseStats: false,
	},
): string {
	const sections: string[] = []

	if (options.includeWorkspaceInfo) {
		sections.push(getWorkspaceInfoSection(context))
	}

	if (options.includeRepositoryInfo) {
		sections.push(getRepositoryInfoSection(context))
	}

	if (options.includeUserInfo) {
		sections.push(getUserInfoSection(context))
	}

	if (options.includeEnvironmentDetails) {
		sections.push(getEnvironmentDetailsSection(context))
	}

	if (options.includeRecentChanges) {
		sections.push(getRecentChangesSection(context))
	}

	if (options.includeCodebaseStats) {
		sections.push(getCodebaseStatsSection(context))
	}

	return sections.join("\n\n")
}

function getWorkspaceInfoSection(context: ConversationContext): string {
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

WORKSPACE INFORMATION

- Workspace Path: ${context.workspacePath}
- Current Working Directory: ${context.workspacePath}
- Conversation Started: ${createdAtIso}
- Last Updated: ${updatedAtIso}
- Total Tool Calls: ${toolCallsCount}`
}

function getRepositoryInfoSection(context: ConversationContext): string {
	if (!context.repositoryId) {
		return ""
	}

	return `====

REPOSITORY INFORMATION

- Repository ID: ${context.repositoryId}
- User ID: ${context.userId || "Not specified"}
- Current Task: ${context.currentTask || "Not specified"}`
}

function getUserInfoSection(context: ConversationContext): string {
	if (!context.userId) {
		return ""
	}

	return `====

USER INFORMATION

- User ID: ${context.userId}
- Repository ID: ${context.repositoryId || "Not specified"}`
}

function getEnvironmentDetailsSection(context: ConversationContext): string {
	const toolCallHistory = Array.isArray((context as any)?.toolCallHistory) ? (context as any).toolCallHistory : []
	const recentToolCalls = toolCallHistory
		.slice(-3)
		.map((call) => call.toolName)
		.join(", ")

	return `====

CODE REVIEW ENVIRONMENT

- **Operating System**: ${process.platform}
- **Node.js Version**: ${process.version}
- **Current Time**: ${new Date().toISOString()}
- **Workspace**: ${context.workspacePath}
- **Repository ID**: ${context.repositoryId || "Not specified"}
- **User ID**: ${context.userId || "Not specified"}
- **Tool Calls Made**: ${toolCallHistory.length} total calls
- **Recent Tools**: ${recentToolCalls || "None yet"}

**Code Review Context:**
- **Review Focus**: Comprehensive analysis of code changes, security, performance, and maintainability
- **Analysis Depth**: Multi-dimensional assessment across correctness, security, performance, and architecture
- **Tool Strategy**: Context-first approach using semantic search and pattern analysis
- **Output Format**: Structured findings with severity classification and actionable recommendations`
}

function getRecentChangesSection(context: ConversationContext): string {
	const history: any[] = Array.isArray((context as any)?.toolCallHistory) ? (context as any).toolCallHistory : []
	const recentToolCalls = history.slice(-5)

	if (recentToolCalls.length === 0) {
		return ""
	}

	const recentCalls = recentToolCalls
		.map((call) => {
			const ts =
				call?.timestamp instanceof Date
					? call.timestamp.toISOString()
					: typeof call?.timestamp === "string"
						? call.timestamp
						: "Unknown time"
			return `- ${call.toolName} (${ts})`
		})
		.join("\n")

	return `====

RECENT CHANGES

Recent tool calls:
${recentCalls}`
}

function getCodebaseStatsSection(context: ConversationContext): string {
	const history: any[] = Array.isArray((context as any)?.toolCallHistory) ? (context as any).toolCallHistory : []
	const toolUsageStats = history.reduce(
		(stats, call) => {
			stats[call.toolName] = (stats[call.toolName] || 0) + 1
			return stats
		},
		{} as Record<string, number>,
	)

	const statsEntries = Object.entries(toolUsageStats)
		.map(([tool, count]) => `- **${tool}**: ${count} calls`)
		.join("\n")

	const totalAnalysisTime = history.reduce((total, call) => total + (call.executionTimeMs || 0), 0)
	const analysisEfficiency = history.length > 0 ? Math.round(totalAnalysisTime / history.length) : 0

	return `====

CODE REVIEW ANALYSIS STATISTICS

**Tool Usage Distribution:**
${statsEntries || "No analysis tools used yet"}

**Analysis Performance:**
- **Total Analysis Time**: ${totalAnalysisTime}ms
- **Average Tool Execution**: ${analysisEfficiency}ms per tool call
- **Analysis Depth**: ${history.length} tool calls made
- **Review Progress**: ${history.length > 0 ? "Analysis in progress" : "Starting analysis"}

**Code Review Quality Indicators:**
- **Context Discovery**: ${toolUsageStats.codebase_search ? "✓ Architecture explored" : "⚠️ Need architecture analysis"}
- **File Analysis**: ${toolUsageStats.read_file ? "✓ Files examined" : "⚠️ Need file analysis"}
- **Pattern Detection**: ${toolUsageStats.search_files ? "✓ Patterns analyzed" : "⚠️ Need pattern analysis"}
- **Structure Understanding**: ${toolUsageStats.list_files || toolUsageStats.list_code_definition_names ? "✓ Structure mapped" : "⚠️ Need structure analysis"}

**Review Completeness**: ${history.length > 5 ? "Comprehensive analysis" : history.length > 2 ? "Basic analysis" : "Initial exploration"}`
}
