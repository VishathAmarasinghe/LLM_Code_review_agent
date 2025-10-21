import {
	WorkspaceContext,
	GitHubRepository,
	PullRequest,
	FileDiff,
	GitHubFile,
	FileAccessRequest,
	FileAccessResult,
	WorkspaceConfig,
	PathResolution,
} from "./types"
import { PathResolver } from "./pathResolver"
import { IgnoreHandler } from "./ignoreHandler"
import { SecurityHandler } from "./securityHandler"
import { githubService } from "../services/githubService"
import { logger } from "../utils/logger"

export class GitHubWorkspaceManager {
	private static instances = new Map<string, GitHubWorkspaceManager>()

	private workspaceContext: WorkspaceContext
	private pathResolver: PathResolver
	private ignoreHandler: IgnoreHandler
	private securityHandler: SecurityHandler
	private fileCache = new Map<string, { content: string; timestamp: number; ttl: number }>()
	private isInitialized = false
	private accessToken?: string

	private constructor(workspaceContext: WorkspaceContext, accessToken: string) {
		this.workspaceContext = workspaceContext
		this.pathResolver = new PathResolver(workspaceContext)
		this.ignoreHandler = new IgnoreHandler(workspaceContext)
		this.securityHandler = new SecurityHandler(workspaceContext)
		this.accessToken = accessToken
	}

	/**
	 * Get or create workspace manager instance
	 */
	public static getInstance(workspaceContext: WorkspaceContext, accessToken: string): GitHubWorkspaceManager {
		const key = `${workspaceContext.repository.owner}/${workspaceContext.repository.repo}/${workspaceContext.pullRequest?.number || "main"}`

		if (!GitHubWorkspaceManager.instances.has(key)) {
			GitHubWorkspaceManager.instances.set(key, new GitHubWorkspaceManager(workspaceContext, accessToken))
		}

		return GitHubWorkspaceManager.instances.get(key)!
	}

	/**
	 * Initialize the workspace manager
	 */
	public async initialize(): Promise<void> {
		if (this.isInitialized) {
			return
		}

		try {
			// Initialize ignore handler
			await this.ignoreHandler.initialize()

			// Load PR diff if available
			if (this.workspaceContext.pullRequest) {
				await this.loadPRDiff()
			}

			this.isInitialized = true

			logger.info("GitHub workspace manager initialized", {
				repository: this.workspaceContext.repository.fullName,
				pullRequest: this.workspaceContext.pullRequest?.number,
				changedFiles: this.workspaceContext.changedFiles.length,
			})
		} catch (error) {
			logger.error("Failed to initialize GitHub workspace manager", error)
			throw error
		}
	}

	/**
	 * Load PR diff from GitHub
	 */
	private async loadPRDiff(): Promise<void> {
		if (!this.workspaceContext.pullRequest || !this.accessToken) {
			return
		}

		try {
			const { owner, repo } = this.workspaceContext.repository
			const prNumber = this.workspaceContext.pullRequest.number

			const ghFiles = await githubService.getPullRequestFiles(this.accessToken, owner, repo, prNumber)

			const files: FileDiff[] = ghFiles.map((file: any) => ({
				filename: file.filename,
				status: file.status,
				additions: file.additions,
				deletions: file.deletions,
				changes: file.changes,
				patch: file.patch,
				previous_filename: file.previous_filename,
			}))

			this.workspaceContext.changedFiles = files

			logger.info("PR diff loaded", {
				repository: this.workspaceContext.repository.fullName,
				prNumber,
				filesCount: files.length,
			})
		} catch (error) {
			logger.error("Failed to load PR diff", error)
			throw error
		}
	}

	/**
	 * Get file content from GitHub
	 */
	public async getFileContent(filePath: string): Promise<FileAccessResult> {
		try {
			if (!this.accessToken) {
				return {
					success: false,
					error: "GitHub access token not available",
				}
			}

			// Resolve path
			const pathResolution = this.pathResolver.resolvePath(filePath)

			// Check if path is safe
			if (!pathResolution.isWithinWorkspace) {
				return {
					success: false,
					error: "File path is outside workspace boundaries",
					pathResolution,
				}
			}

			if (pathResolution.isIgnored) {
				return {
					success: false,
					error: `File access blocked: ${pathResolution.ignoreReason}`,
					pathResolution,
				}
			}

			// Check if file is in PR diff (if reviewing a PR)
			if (this.workspaceContext.pullRequest && !pathResolution.isInPRDiff) {
				return {
					success: false,
					error: "File is not part of the pull request changes",
					pathResolution,
				}
			}

			// Check cache first
			const cacheKey = `${this.workspaceContext.repository.fullName}:${pathResolution.relativePath}`
			const cached = this.fileCache.get(cacheKey)

			if (cached && Date.now() - cached.timestamp < cached.ttl) {
				return {
					success: true,
					content: cached.content,
					pathResolution,
				}
			}

			// Fetch from GitHub
			const { owner, repo } = this.workspaceContext.repository
			const ref = this.workspaceContext.pullRequest?.head.sha || this.workspaceContext.headSha

			const data = await githubService.getRepositoryContent(
				this.accessToken,
				owner,
				repo,
				pathResolution.relativePath,
				ref,
			)
			const file: GitHubFile = data

			// Check file size
			const securityCheck = this.securityHandler.isFileAccessAllowed(
				pathResolution.relativePath,
				file.size,
				this.workspaceContext.repository,
			)

			if (!securityCheck.allowed) {
				return {
					success: false,
					error: securityCheck.reason || "Access blocked",
					pathResolution,
				}
			}

			// Decode content
			let content: string
			if (file.encoding === "base64") {
				content = Buffer.from(file.content || "", "base64").toString("utf8")
			} else {
				content = file.content || ""
			}

			// Cache the content
			this.fileCache.set(cacheKey, {
				content,
				timestamp: Date.now(),
				ttl: 5 * 60 * 1000, // 5 minutes
			})

			return {
				success: true,
				content,
				file,
				pathResolution,
			}
		} catch (error) {
			logger.error("Failed to get file content", { filePath, error })
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error occurred",
			}
		}
	}

	/**
	 * List files in a directory
	 */
	public async listFiles(
		directoryPath: string,
		recursive: boolean = false,
	): Promise<{ success: boolean; files?: GitHubFile[]; error?: string }> {
		try {
			if (!this.accessToken) {
				return {
					success: false,
					error: "GitHub access token not available",
				}
			}

			// Resolve path
			const pathResolution = this.pathResolver.resolvePath(directoryPath)

			// Check if path is safe
			if (!pathResolution.isWithinWorkspace) {
				return {
					success: false,
					error: "Directory path is outside workspace boundaries",
				}
			}

			if (pathResolution.isIgnored) {
				return {
					success: false,
					error: `Directory access blocked: ${pathResolution.ignoreReason}`,
				}
			}

			// Fetch from GitHub
			const { owner, repo } = this.workspaceContext.repository
			const ref = this.workspaceContext.pullRequest?.head.sha || this.workspaceContext.headSha

			const data = await githubService.getRepositoryContent(
				this.accessToken,
				owner,
				repo,
				pathResolution.relativePath,
				ref,
			)
			let files: GitHubFile[] = Array.isArray(data) ? data : [data]

			// Filter files based on ignore patterns
			files = files.filter((file) => {
				const fullPath =
					pathResolution.relativePath === "" ? file.path : `${pathResolution.relativePath}/${file.path}`

				const ignoreResult = this.ignoreHandler.shouldIgnore(fullPath)
				return !ignoreResult.ignored
			})

			// If recursive, we'd need to implement recursive listing
			// For now, we only return top-level files
			if (!recursive) {
				files = files.filter((file) => file.type === "file")
			}

			return {
				success: true,
				files,
			}
		} catch (error) {
			logger.error("Failed to list files", { directoryPath, error })
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error occurred",
			}
		}
	}

	/**
	 * Search files using regex
	 */
	public async searchFiles(
		searchPath: string,
		regex: string,
		filePattern?: string,
	): Promise<{ success: boolean; results?: any[]; error?: string }> {
		try {
			if (!this.accessToken) {
				return { success: false, error: "GitHub access token not available" }
			}

			// This would typically use GitHub's search API or fetch files and search locally
			// For now, we'll implement a basic version that fetches files and searches them

			const listResult = await this.listFiles(searchPath, true)

			if (!listResult.success || !listResult.files) {
				return {
					success: false,
					error: listResult.error || "Failed to list files for search",
				}
			}

			// Filter files by pattern if specified
			let filesToSearch = listResult.files
			if (filePattern) {
				const patternRegex = new RegExp(filePattern.replace(/\*/g, ".*"))
				filesToSearch = filesToSearch.filter((file) => patternRegex.test(file.name))
			}

			// Search in files (this is a simplified implementation)
			// In a real implementation, you'd fetch each file and search its content
			const results: any[] = []

			for (const file of filesToSearch) {
				try {
					const fileResult = await this.getFileContent(file.path)
					if (fileResult.success && fileResult.content) {
						const regexObj = new RegExp(regex, "g")
						const matches = fileResult.content.match(regexObj)

						if (matches) {
							results.push({
								file: file.path,
								matches: matches.length,
								content: fileResult.content,
							})
						}
					}
				} catch (error) {
					// Continue with other files
					logger.warn("Error searching in file", { file: file.path, error })
				}
			}

			return {
				success: true,
				results,
			}
		} catch (error) {
			logger.error("Failed to search files", { searchPath, regex, error })
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error occurred",
			}
		}
	}

	/**
	 * Set GitHub access token for this workspace
	 */
	public setAccessToken(token: string): void {
		this.accessToken = token
	}

	/**
	 * Get workspace context
	 */
	public getWorkspaceContext(): WorkspaceContext {
		return { ...this.workspaceContext }
	}

	/**
	 * Get path resolver
	 */
	public getPathResolver(): PathResolver {
		return this.pathResolver
	}

	/**
	 * Get ignore handler
	 */
	public getIgnoreHandler(): IgnoreHandler {
		return this.ignoreHandler
	}

	/**
	 * Get security handler
	 */
	public getSecurityHandler(): SecurityHandler {
		return this.securityHandler
	}

	/**
	 * Clear file cache
	 */
	public clearCache(): void {
		this.fileCache.clear()
		logger.info("File cache cleared")
	}

	/**
	 * Get cache statistics
	 */
	public getCacheStats(): { size: number; entries: number } {
		return {
			size: this.fileCache.size,
			entries: this.fileCache.size,
		}
	}

	/**
	 * Dispose of the workspace manager
	 */
	public dispose(): void {
		this.clearCache()
		GitHubWorkspaceManager.instances.delete(
			`${this.workspaceContext.repository.owner}/${this.workspaceContext.repository.repo}/${this.workspaceContext.pullRequest?.number || "main"}`,
		)
		logger.info("GitHub workspace manager disposed")
	}

	/**
	 * Create workspace context from PR
	 */
	public static createFromPR(
		repository: GitHubRepository,
		pullRequest: PullRequest,
		config?: Partial<WorkspaceConfig>,
	): WorkspaceContext {
		const defaultSecurityBoundaries = {
			allowedOwners: [repository.owner],
			allowedRepos: [repository.fullName],
			maxFileSize: 10 * 1024 * 1024, // 10MB
			maxFilesPerRequest: 100,
			allowedFileExtensions: [
				".ts",
				".js",
				".tsx",
				".jsx",
				".py",
				".java",
				".go",
				".rs",
				".cpp",
				".c",
				".h",
				".cs",
				".php",
				".rb",
				".swift",
				".kt",
				".scala",
				".sh",
				".yaml",
				".yml",
				".json",
				".xml",
				".md",
				".txt",
			],
			blockedFileExtensions: [".exe", ".dll", ".so", ".dylib", ".bin", ".dat", ".db", ".sqlite"],
			blockedPaths: ["node_modules/", ".git/", "build/", "target/"],
		}

		return {
			repository,
			pullRequest,
			baseRef: pullRequest.base.ref,
			headRef: pullRequest.head.ref,
			baseSha: pullRequest.base.sha,
			headSha: pullRequest.head.sha,
			changedFiles: [], // Will be loaded by initialize()
			ignorePatterns: [],
			securityBoundaries: config?.securityBoundaries || defaultSecurityBoundaries,
			workspacePath: `github://${repository.owner}/${repository.repo}/${pullRequest.number}`,
		}
	}

	/**
	 * Create workspace context from repository
	 */
	public static createFromRepository(
		repository: GitHubRepository,
		ref: string = "main",
		config?: Partial<WorkspaceConfig>,
	): WorkspaceContext {
		const defaultSecurityBoundaries = {
			allowedOwners: [repository.owner],
			allowedRepos: [repository.fullName],
			maxFileSize: 10 * 1024 * 1024, // 10MB
			maxFilesPerRequest: 100,
			allowedFileExtensions: [
				".ts",
				".js",
				".tsx",
				".jsx",
				".py",
				".java",
				".go",
				".rs",
				".cpp",
				".c",
				".h",
				".cs",
				".php",
				".rb",
				".swift",
				".kt",
				".scala",
				".sh",
				".yaml",
				".yml",
				".json",
				".xml",
				".md",
				".txt",
			],
			blockedFileExtensions: [".exe", ".dll", ".so", ".dylib", ".bin", ".dat", ".db", ".sqlite"],
			blockedPaths: ["node_modules/", ".git/", "build/", "target/"],
		}

		return {
			repository,
			baseRef: ref,
			headRef: ref,
			baseSha: ref,
			headSha: ref,
			changedFiles: [],
			ignorePatterns: [],
			securityBoundaries: config?.securityBoundaries || defaultSecurityBoundaries,
			workspacePath: `github://${repository.owner}/${repository.repo}/${ref}`,
		}
	}
}
