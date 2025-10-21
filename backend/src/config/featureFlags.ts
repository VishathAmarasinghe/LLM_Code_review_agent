import { FeatureFlags, ToolRequirement, ToolGroup } from "./types"
import { logger } from "../utils/logger"

export class FeatureFlagManager {
	private static instance: FeatureFlagManager
	private featureFlags: FeatureFlags
	private toolGroups: Map<string, ToolGroup> = new Map()
	private toolRequirements: Map<string, ToolRequirement> = new Map()

	private constructor() {
		this.featureFlags = this.getDefaultFeatureFlags()
		this.initializeToolGroups()
		this.initializeToolRequirements()
	}

	public static getInstance(): FeatureFlagManager {
		if (!FeatureFlagManager.instance) {
			FeatureFlagManager.instance = new FeatureFlagManager()
		}
		return FeatureFlagManager.instance
	}

	/**
	 * Get default feature flags
	 */
	private getDefaultFeatureFlags(): FeatureFlags {
		return {
			// Tool availability flags
			readFileEnabled: true,
			searchFilesEnabled: true,
			codebaseSearchEnabled: true,
			listFilesEnabled: true,
			listCodeDefinitionNamesEnabled: true,

			// Advanced features
			partialReadsEnabled: true,
			multipleFileReadsEnabled: true,
			recursiveFileListingEnabled: true,
			semanticSearchEnabled: true,

			// Security features
			securityValidationEnabled: true,
			ignorePatternsEnabled: true,
			pathValidationEnabled: true,

			// Performance features
			cachingEnabled: true,
			rateLimitingEnabled: true,
			batchProcessingEnabled: true,
		}
	}

	/**
	 * Initialize tool groups
	 */
	private initializeToolGroups(): void {
		const groups: ToolGroup[] = [
			{
				name: "read",
				tools: ["read_file", "search_files", "list_files", "list_code_definition_names", "codebase_search"],
				description: "File reading and exploration tools",
				alwaysAvailable: true,
			},
			{
				name: "analysis",
				tools: ["codebase_search", "list_code_definition_names"],
				description: "Code analysis tools",
			},
			{
				name: "exploration",
				tools: ["list_files", "search_files", "codebase_search"],
				description: "Codebase exploration tools",
			},
		]

		for (const group of groups) {
			this.toolGroups.set(group.name, group)
		}
	}

	/**
	 * Initialize tool requirements
	 */
	private initializeToolRequirements(): void {
		const requirements: ToolRequirement[] = [
			{
				toolName: "read_file",
				required: true,
				reason: "Core functionality for reading files",
			},
			{
				toolName: "search_files",
				required: true,
				reason: "Essential for finding code patterns",
			},
			{
				toolName: "codebase_search",
				required: false,
				reason: "Requires indexing service to be configured",
				alternatives: ["search_files"],
			},
			{
				toolName: "list_files",
				required: true,
				reason: "Needed for directory exploration",
			},
			{
				toolName: "list_code_definition_names",
				required: false,
				reason: "Requires code parsing capabilities",
			},
		]

		for (const requirement of requirements) {
			this.toolRequirements.set(requirement.toolName, requirement)
		}
	}

	/**
	 * Check if a tool is enabled
	 */
	public isToolEnabled(toolName: string): boolean {
		switch (toolName) {
			case "read_file":
				return this.featureFlags.readFileEnabled
			case "search_files":
				return this.featureFlags.searchFilesEnabled
			case "codebase_search":
				return this.featureFlags.codebaseSearchEnabled
			case "list_files":
				return this.featureFlags.listFilesEnabled
			case "list_code_definition_names":
				return this.featureFlags.listCodeDefinitionNamesEnabled
			default:
				return false
		}
	}

	/**
	 * Check if a feature is enabled
	 */
	public isFeatureEnabled(feature: keyof FeatureFlags): boolean {
		return this.featureFlags[feature]
	}

	/**
	 * Enable a tool
	 */
	public enableTool(toolName: string): void {
		switch (toolName) {
			case "read_file":
				this.featureFlags.readFileEnabled = true
				break
			case "search_files":
				this.featureFlags.searchFilesEnabled = true
				break
			case "codebase_search":
				this.featureFlags.codebaseSearchEnabled = true
				break
			case "list_files":
				this.featureFlags.listFilesEnabled = true
				break
			case "list_code_definition_names":
				this.featureFlags.listCodeDefinitionNamesEnabled = true
				break
			default:
				logger.warn(`Unknown tool: ${toolName}`)
				return
		}

		logger.info(`Tool enabled: ${toolName}`)
	}

	/**
	 * Disable a tool
	 */
	public disableTool(toolName: string): void {
		switch (toolName) {
			case "read_file":
				this.featureFlags.readFileEnabled = false
				break
			case "search_files":
				this.featureFlags.searchFilesEnabled = false
				break
			case "codebase_search":
				this.featureFlags.codebaseSearchEnabled = false
				break
			case "list_files":
				this.featureFlags.listFilesEnabled = false
				break
			case "list_code_definition_names":
				this.featureFlags.listCodeDefinitionNamesEnabled = false
				break
			default:
				logger.warn(`Unknown tool: ${toolName}`)
				return
		}

		logger.info(`Tool disabled: ${toolName}`)
	}

	/**
	 * Enable a feature
	 */
	public enableFeature(feature: keyof FeatureFlags): void {
		this.featureFlags[feature] = true
		logger.info(`Feature enabled: ${feature}`)
	}

	/**
	 * Disable a feature
	 */
	public disableFeature(feature: keyof FeatureFlags): void {
		this.featureFlags[feature] = false
		logger.info(`Feature disabled: ${feature}`)
	}

	/**
	 * Get all enabled tools
	 */
	public getEnabledTools(): string[] {
		const tools: string[] = []

		if (this.featureFlags.readFileEnabled) tools.push("read_file")
		if (this.featureFlags.searchFilesEnabled) tools.push("search_files")
		if (this.featureFlags.codebaseSearchEnabled) tools.push("codebase_search")
		if (this.featureFlags.listFilesEnabled) tools.push("list_files")
		if (this.featureFlags.listCodeDefinitionNamesEnabled) tools.push("list_code_definition_names")

		return tools
	}

	/**
	 * Get tools for a specific group
	 */
	public getToolsForGroup(groupName: string): string[] {
		const group = this.toolGroups.get(groupName)
		if (!group) {
			return []
		}

		return group.tools.filter((tool) => this.isToolEnabled(tool))
	}

	/**
	 * Check if a tool is required
	 */
	public isToolRequired(toolName: string): boolean {
		const requirement = this.toolRequirements.get(toolName)
		return requirement?.required || false
	}

	/**
	 * Get tool requirements
	 */
	public getToolRequirements(): Map<string, ToolRequirement> {
		return new Map(this.toolRequirements)
	}

	/**
	 * Get tool groups
	 */
	public getToolGroups(): Map<string, ToolGroup> {
		return new Map(this.toolGroups)
	}

	/**
	 * Get all feature flags
	 */
	public getFeatureFlags(): FeatureFlags {
		return { ...this.featureFlags }
	}

	/**
	 * Update feature flags
	 */
	public updateFeatureFlags(flags: Partial<FeatureFlags>): void {
		this.featureFlags = { ...this.featureFlags, ...flags }
		logger.info("Feature flags updated", { flags })
	}

	/**
	 * Reset to default feature flags
	 */
	public resetToDefaults(): void {
		this.featureFlags = this.getDefaultFeatureFlags()
		logger.info("Feature flags reset to defaults")
	}

	/**
	 * Validate tool availability
	 */
	public validateToolAvailability(toolName: string): { available: boolean; reason?: string } {
		if (!this.isToolEnabled(toolName)) {
			return { available: false, reason: "Tool is disabled" }
		}

		const requirement = this.toolRequirements.get(toolName)
		if (requirement && !requirement.required) {
			// Check if alternative is available
			if (requirement.alternatives) {
				const hasAlternative = requirement.alternatives.some((alt) => this.isToolEnabled(alt))
				if (!hasAlternative) {
					return { available: false, reason: "No alternative tools available" }
				}
			}
		}

		return { available: true }
	}

	/**
	 * Get feature flag summary
	 */
	public getFeatureFlagSummary(): {
		totalFlags: number
		enabledFlags: number
		disabledFlags: number
		enabledTools: string[]
		disabledTools: string[]
	} {
		const flags = Object.values(this.featureFlags)
		const enabledFlags = flags.filter(Boolean).length
		const disabledFlags = flags.length - enabledFlags

		return {
			totalFlags: flags.length,
			enabledFlags,
			disabledFlags,
			enabledTools: this.getEnabledTools(),
			disabledTools: [
				"read_file",
				"search_files",
				"codebase_search",
				"list_files",
				"list_code_definition_names",
			].filter((tool) => !this.isToolEnabled(tool)),
		}
	}
}
