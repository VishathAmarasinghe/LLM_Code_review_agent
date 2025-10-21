import { GitHubWorkspaceManager } from "./githubWorkspaceManager"
import { WorkspaceContext, GitHubRepository, PullRequest } from "./types"
import { logger } from "../utils/logger"

/**
 * Central workspace manager that coordinates GitHub workspace operations
 */
export class WorkspaceManager {
	private static instance: WorkspaceManager
	private activeWorkspaces = new Map<string, GitHubWorkspaceManager>()

	private constructor() {}

	public static getInstance(): WorkspaceManager {
		if (!WorkspaceManager.instance) {
			WorkspaceManager.instance = new WorkspaceManager()
		}
		return WorkspaceManager.instance
	}

	/**
	 * Create or get workspace for a PR
	 */
	public async createPRWorkspace(
		repository: GitHubRepository,
		pullRequest: PullRequest,
		accessToken: string,
		config?: any,
	): Promise<GitHubWorkspaceManager> {
		const workspaceKey = `${repository.owner}/${repository.repo}/pr/${pullRequest.number}`

		if (this.activeWorkspaces.has(workspaceKey)) {
			return this.activeWorkspaces.get(workspaceKey)!
		}

		// Create workspace context
		const workspaceContext = GitHubWorkspaceManager.createFromPR(repository, pullRequest, config)

		// Create workspace manager
		const workspaceManager = GitHubWorkspaceManager.getInstance(workspaceContext, accessToken)

		// Initialize the workspace
		await workspaceManager.initialize()

		// Store the workspace
		this.activeWorkspaces.set(workspaceKey, workspaceManager)

		logger.info("PR workspace created", {
			repository: repository.fullName,
			prNumber: pullRequest.number,
			workspaceKey,
		})

		return workspaceManager
	}

	/**
	 * Create or get workspace for a repository
	 */
	public async createRepositoryWorkspace(
		repository: GitHubRepository,
		ref: string = "main",
		accessToken: string,
		config?: any,
	): Promise<GitHubWorkspaceManager> {
		const workspaceKey = `${repository.owner}/${repository.repo}/ref/${ref}`

		if (this.activeWorkspaces.has(workspaceKey)) {
			return this.activeWorkspaces.get(workspaceKey)!
		}

		// Create workspace context
		const workspaceContext = GitHubWorkspaceManager.createFromRepository(repository, ref, config)

		// Create workspace manager
		const workspaceManager = GitHubWorkspaceManager.getInstance(workspaceContext, accessToken)

		// Initialize the workspace
		await workspaceManager.initialize()

		// Store the workspace
		this.activeWorkspaces.set(workspaceKey, workspaceManager)

		logger.info("Repository workspace created", {
			repository: repository.fullName,
			ref,
			workspaceKey,
		})

		return workspaceManager
	}

	/**
	 * Get existing workspace
	 */
	public getWorkspace(workspaceKey: string): GitHubWorkspaceManager | undefined {
		return this.activeWorkspaces.get(workspaceKey)
	}

	/**
	 * Get all active workspaces
	 */
	public getAllWorkspaces(): Map<string, GitHubWorkspaceManager> {
		return new Map(this.activeWorkspaces)
	}

	/**
	 * Remove workspace
	 */
	public removeWorkspace(workspaceKey: string): boolean {
		const workspace = this.activeWorkspaces.get(workspaceKey)
		if (workspace) {
			workspace.dispose()
			this.activeWorkspaces.delete(workspaceKey)
			logger.info("Workspace removed", { workspaceKey })
			return true
		}
		return false
	}

	/**
	 * Clear all workspaces
	 */
	public clearAllWorkspaces(): void {
		for (const [key, workspace] of this.activeWorkspaces) {
			workspace.dispose()
		}
		this.activeWorkspaces.clear()
		logger.info("All workspaces cleared")
	}

	/**
	 * Get workspace statistics
	 */
	public getWorkspaceStats(): {
		totalWorkspaces: number
		workspaces: Array<{
			key: string
			repository: string
			type: "pr" | "repository"
			cacheSize: number
		}>
	} {
		const workspaces = Array.from(this.activeWorkspaces.entries()).map(([key, workspace]) => {
			const context = workspace.getWorkspaceContext()
			const cacheStats = workspace.getCacheStats()

			return {
				key,
				repository: context.repository.fullName,
				type: (context.pullRequest ? "pr" : "repository") as "pr" | "repository",
				cacheSize: cacheStats.size,
			}
		})

		return {
			totalWorkspaces: this.activeWorkspaces.size,
			workspaces,
		}
	}

	/**
	 * Clean up old workspaces
	 */
	public cleanupOldWorkspaces(maxAge: number = 30 * 60 * 1000): void {
		// This would implement cleanup logic based on workspace age
		// For now, we'll just log the operation
		logger.info("Workspace cleanup requested", { maxAge })
	}
}
