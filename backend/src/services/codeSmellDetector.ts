import { logger } from "../utils/logger"
import * as fs from "fs"
import * as path from "path"

/**
 * Simple service that loads and provides code smell definitions from a text file
 * The content is provided directly to the LLM without any processing
 */
export class CodeSmellDetector {
	private static instance: CodeSmellDetector
	private codeSmellsConfig: string = ""
	private configPath: string

	private constructor() {
		// Use the correct path for both source and compiled environments
		const isCompiled = __dirname.includes("dist")
		const configPath = isCompiled
			? path.join(__dirname, "../../src/config/code-smells-and-anti-patterns.txt")
			: path.join(__dirname, "../config/code-smells-and-anti-patterns.txt")
		this.configPath = configPath
		this.loadConfiguration()
	}

	public static getInstance(): CodeSmellDetector {
		if (!CodeSmellDetector.instance) {
			CodeSmellDetector.instance = new CodeSmellDetector()
		}
		return CodeSmellDetector.instance
	}

	private loadConfiguration(): void {
		try {
			const configContent = fs.readFileSync(this.configPath, "utf-8")
			this.codeSmellsConfig = configContent
			logger.info(`Loaded code smells configuration (${configContent.length} characters)`)
		} catch (error) {
			logger.error("Failed to load code smells configuration:", error)
			this.codeSmellsConfig = this.getDefaultConfiguration()
		}
	}

	private getDefaultConfiguration(): string {
		return `# Code Smells and Anti-Patterns

Add your code smell and anti-pattern definitions here.

Example:
### Long Method
Methods that are too long and do multiple things. Look for functions with more than 20-30 lines. Break them down into smaller, single-purpose methods.`
	}

	/**
	 * Get the raw code smells and anti-patterns configuration text
	 */
	public getConfiguration(): string {
		return this.codeSmellsConfig
	}

	/**
	 * Reload the configuration from the file
	 */
	public reloadConfiguration(): void {
		this.loadConfiguration()
		logger.info("Code smells configuration reloaded")
	}

	/**
	 * Get configuration file path
	 */
	public getConfigPath(): string {
		return this.configPath
	}

	/**
	 * Check if configuration is loaded
	 */
	public isConfigurationLoaded(): boolean {
		return this.codeSmellsConfig.length > 0
	}
}
