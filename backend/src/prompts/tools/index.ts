import { ToolArgs } from "../types"
import { getReadFileDescription } from "./read-file"
import { getSearchFilesDescription } from "./search-files"
import { getListFilesDescription } from "./list-files"
import { getListCodeDefinitionNamesDescription } from "./list-code-definition-names"
import { getCodebaseSearchDescription } from "./codebase-search"
import { getAnalyzeArchitectureDescription } from "./analyze-architecture"
import { getIdentifyRisksDescription } from "./identify-risks"
import { getStrategicAnalysisDescription } from "./strategic-analysis"
import { getPatternRecognitionDescription } from "./pattern-recognition"

// Map of tool names to their description functions
const toolDescriptionMap: Record<string, (args: ToolArgs) => string | undefined> = {
	read_file: (args) => getReadFileDescription(args),
	search_files: (args) => getSearchFilesDescription(args),
	list_files: (args) => getListFilesDescription(args),
	list_code_definition_names: (args) => getListCodeDefinitionNamesDescription(args),
	codebase_search: () => getCodebaseSearchDescription(),
	analyze_architecture: (args) => getAnalyzeArchitectureDescription(args),
	identify_risks: (args) => getIdentifyRisksDescription(args),
	strategic_analysis: (args) => getStrategicAnalysisDescription(args),
	pattern_recognition: (args) => getPatternRecognitionDescription(args),
}

export function getToolDescriptionsForMode(
	cwd: string,
	supportsComputerUse: boolean,
	codeIndexManager?: any,
	partialReadsEnabled?: boolean,
	settings?: Record<string, any>,
): string {
	const args: ToolArgs = {
		cwd,
		supportsComputerUse,
		partialReadsEnabled: partialReadsEnabled ?? false,
		settings: {
			...settings,
		},
		codeIndexManager,
	}

	const tools = new Set<string>()

	// Add all available tools for code review
	const availableTools = [
		"read_file",
		"search_files",
		"list_files",
		"list_code_definition_names",
		"codebase_search",
		"analyze_architecture",
		"identify_risks",
		"strategic_analysis",
		"pattern_recognition",
	]

	availableTools.forEach((tool) => tools.add(tool))

	// Conditionally exclude codebase_search if feature is disabled or not configured
	if (
		!codeIndexManager ||
		!(codeIndexManager.isFeatureEnabled && codeIndexManager.isFeatureConfigured && codeIndexManager.isInitialized)
	) {
		tools.delete("codebase_search")
	}

	// Map tool descriptions for allowed tools
	const descriptions = Array.from(tools).map((toolName) => {
		const descriptionFn = toolDescriptionMap[toolName]
		if (!descriptionFn) {
			return undefined
		}

		return descriptionFn({
			...args,
			toolOptions: undefined, // No tool options in group-based approach
		})
	})

	return `# Tools\n\n${descriptions.filter(Boolean).join("\n\n")}`
}

// Export individual description functions
export {
	getReadFileDescription,
	getSearchFilesDescription,
	getListFilesDescription,
	getListCodeDefinitionNamesDescription,
	getCodebaseSearchDescription,
	getAnalyzeArchitectureDescription,
	getIdentifyRisksDescription,
	getStrategicAnalysisDescription,
	getPatternRecognitionDescription,
}
