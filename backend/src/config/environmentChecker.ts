import { spawn } from "child_process"
import { promisify } from "util"
import { exec } from "child_process"
import { EnvironmentDependencies, IndexingStatus } from "./types"
import { logger } from "../utils/logger"

const execAsync = promisify(exec)

export class EnvironmentChecker {
	private static instance: EnvironmentChecker
	private environmentDependencies: EnvironmentDependencies
	private indexingStatus: IndexingStatus

	private constructor() {
		this.environmentDependencies = this.getDefaultDependencies()
		this.indexingStatus = this.getDefaultIndexingStatus()
	}

	public static getInstance(): EnvironmentChecker {
		if (!EnvironmentChecker.instance) {
			EnvironmentChecker.instance = new EnvironmentChecker()
		}
		return EnvironmentChecker.instance
	}

	/**
	 * Get default environment dependencies
	 */
	private getDefaultDependencies(): EnvironmentDependencies {
		return {
			ripgrep: { available: false },
			node: { available: false },
			git: { available: false },
			fzf: { available: false },
			minMemoryGB: 2,
			minDiskSpaceGB: 1,
			supportedOS: ["linux", "darwin", "win32"],
		}
	}

	/**
	 * Get default indexing status
	 */
	private getDefaultIndexingStatus(): IndexingStatus {
		return {
			enabled: false,
			configured: false,
			initialized: false,
			state: "Standby",
			progress: 0,
			totalFiles: 0,
			indexedFiles: 0,
		}
	}

	/**
	 * Check all environment dependencies
	 */
	public async checkEnvironment(): Promise<EnvironmentDependencies> {
		logger.info("Checking environment dependencies...")

		// Check Node.js
		await this.checkNode()

		// Check Git
		await this.checkGit()

		// Check ripgrep
		await this.checkRipgrep()

		// Check fzf (optional)
		await this.checkFzf()

		// Check system requirements
		await this.checkSystemRequirements()

		logger.info("Environment check completed", { dependencies: this.environmentDependencies })
		return this.environmentDependencies
	}

	/**
	 * Check Node.js availability
	 */
	private async checkNode(): Promise<void> {
		try {
			const { stdout } = await execAsync("node --version")
			const version = stdout.trim()
			this.environmentDependencies.node = {
				available: true,
				version,
				path: process.execPath,
			}
			logger.info("Node.js found", { version, path: process.execPath })
		} catch (error) {
			this.environmentDependencies.node = { available: false }
			logger.warn("Node.js not found", error)
		}
	}

	/**
	 * Check Git availability
	 */
	private async checkGit(): Promise<void> {
		try {
			const { stdout } = await execAsync("git --version")
			const version = stdout.trim()
			this.environmentDependencies.git = {
				available: true,
				version,
				path: "git", // Git is typically in PATH
			}
			logger.info("Git found", { version })
		} catch (error) {
			this.environmentDependencies.git = { available: false }
			logger.warn("Git not found", error)
		}
	}

	/**
	 * Check ripgrep availability
	 */
	private async checkRipgrep(): Promise<void> {
		try {
			const { stdout } = await execAsync("rg --version")
			const version = stdout.trim()
			this.environmentDependencies.ripgrep = {
				available: true,
				version,
				path: "rg", // ripgrep is typically in PATH
			}
			logger.info("ripgrep found", { version })
		} catch (error) {
			this.environmentDependencies.ripgrep = { available: false }
			logger.warn("ripgrep not found", error)
		}
	}

	/**
	 * Check fzf availability (optional)
	 */
	private async checkFzf(): Promise<void> {
		try {
			const { stdout } = await execAsync("fzf --version")
			const version = stdout.trim()
			this.environmentDependencies.fzf = {
				available: true,
				version,
				path: "fzf", // fzf is typically in PATH
			}
			logger.info("fzf found", { version })
		} catch (error) {
			this.environmentDependencies.fzf = { available: false }
			logger.debug("fzf not found (optional)", error)
		}
	}

	/**
	 * Check system requirements
	 */
	private async checkSystemRequirements(): Promise<void> {
		// Check OS
		const os = process.platform
		if (!this.environmentDependencies.supportedOS.includes(os)) {
			logger.warn(`Unsupported OS: ${os}`)
		}

		// Check memory (simplified check)
		const memUsage = process.memoryUsage()
		const memUsageGB = memUsage.heapUsed / (1024 * 1024 * 1024)

		if (memUsageGB < this.environmentDependencies.minMemoryGB) {
			logger.warn(
				`Low memory: ${memUsageGB.toFixed(2)}GB available, ${this.environmentDependencies.minMemoryGB}GB required`,
			)
		}

		// Check disk space (simplified check)
		try {
			const { stdout } = await execAsync("df -h .")
			logger.debug("Disk space check", { output: stdout })
		} catch (error) {
			logger.debug("Could not check disk space", error)
		}
	}

	/**
	 * Check if all required dependencies are available
	 */
	public areDependenciesAvailable(): boolean {
		return (
			this.environmentDependencies.node.available &&
			this.environmentDependencies.git.available &&
			this.environmentDependencies.ripgrep.available
		)
	}

	/**
	 * Get missing dependencies
	 */
	public getMissingDependencies(): string[] {
		const missing: string[] = []

		if (!this.environmentDependencies.node.available) {
			missing.push("Node.js")
		}
		if (!this.environmentDependencies.git.available) {
			missing.push("Git")
		}
		if (!this.environmentDependencies.ripgrep.available) {
			missing.push("ripgrep")
		}

		return missing
	}

	/**
	 * Get dependency installation instructions
	 */
	public getInstallationInstructions(): Record<string, string> {
		const instructions: Record<string, string> = {}

		if (!this.environmentDependencies.node.available) {
			instructions.node = "Install Node.js from https://nodejs.org/"
		}
		if (!this.environmentDependencies.git.available) {
			instructions.git = "Install Git from https://git-scm.com/"
		}
		if (!this.environmentDependencies.ripgrep.available) {
			instructions.ripgrep = "Install ripgrep: https://github.com/BurntSushi/ripgrep#installation"
		}

		return instructions
	}

	/**
	 * Update indexing status
	 */
	public updateIndexingStatus(status: Partial<IndexingStatus>): void {
		this.indexingStatus = { ...this.indexingStatus, ...status }
		logger.info("Indexing status updated", { status })
	}

	/**
	 * Get indexing status
	 */
	public getIndexingStatus(): IndexingStatus {
		return { ...this.indexingStatus }
	}

	/**
	 * Check if indexing is available
	 */
	public isIndexingAvailable(): boolean {
		return this.indexingStatus.enabled && this.indexingStatus.configured && this.indexingStatus.initialized
	}

	/**
	 * Get environment summary
	 */
	public getEnvironmentSummary(): {
		dependencies: EnvironmentDependencies
		indexingStatus: IndexingStatus
		allDependenciesAvailable: boolean
		missingDependencies: string[]
		installationInstructions: Record<string, string>
	} {
		return {
			dependencies: this.environmentDependencies,
			indexingStatus: this.indexingStatus,
			allDependenciesAvailable: this.areDependenciesAvailable(),
			missingDependencies: this.getMissingDependencies(),
			installationInstructions: this.getInstallationInstructions(),
		}
	}

	/**
	 * Test a command
	 */
	public async testCommand(
		command: string,
		args: string[] = [],
	): Promise<{ success: boolean; output?: string; error?: string }> {
		return new Promise((resolve) => {
			const process = spawn(command, args, { stdio: "pipe" })
			let output = ""
			let error = ""

			process.stdout.on("data", (data) => {
				output += data.toString()
			})

			process.stderr.on("data", (data) => {
				error += data.toString()
			})

			process.on("close", (code) => {
				resolve({
					success: code === 0,
					output: output.trim(),
					error: error.trim(),
				})
			})

			process.on("error", (err) => {
				resolve({
					success: false,
					error: err.message,
				})
			})
		})
	}

	/**
	 * Validate environment for code review
	 */
	public validateEnvironmentForCodeReview(): {
		valid: boolean
		errors: string[]
		warnings: string[]
		recommendations: string[]
	} {
		const errors: string[] = []
		const warnings: string[] = []
		const recommendations: string[] = []

		// Check required dependencies
		if (!this.environmentDependencies.node.available) {
			errors.push("Node.js is required but not found")
		}
		if (!this.environmentDependencies.git.available) {
			errors.push("Git is required but not found")
		}
		if (!this.environmentDependencies.ripgrep.available) {
			errors.push("ripgrep is required but not found")
		}

		// Check optional dependencies
		if (!this.environmentDependencies.fzf?.available) {
			warnings.push("fzf is not available (optional for enhanced search)")
		}

		// Check indexing status
		if (!this.isIndexingAvailable()) {
			warnings.push("Code indexing is not available - semantic search will be limited")
			recommendations.push("Configure code indexing for better search capabilities")
		}

		// Check system requirements
		const memUsage = process.memoryUsage()
		const memUsageGB = memUsage.heapUsed / (1024 * 1024 * 1024)
		if (memUsageGB < this.environmentDependencies.minMemoryGB) {
			warnings.push(
				`Low memory: ${memUsageGB.toFixed(2)}GB available, ${this.environmentDependencies.minMemoryGB}GB recommended`,
			)
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
			recommendations,
		}
	}
}
