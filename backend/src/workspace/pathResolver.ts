import { WorkspaceContext, PathResolution } from "./types"
import * as path from "path"

export class PathResolver {
	private workspaceContext: WorkspaceContext

	constructor(workspaceContext: WorkspaceContext) {
		this.workspaceContext = workspaceContext
	}

	/**
	 * Resolve a file path relative to the workspace
	 */
	public resolvePath(filePath: string): PathResolution {
		// Normalize the path
		const normalizedPath = path.normalize(filePath)

		// Check if path is within workspace boundaries
		const isWithinWorkspace = this.isWithinWorkspace(normalizedPath)

		// Check if file is in PR diff (if reviewing a PR)
		const isInPRDiff = this.isInPRDiff(normalizedPath)

		// Get file status from PR diff
		const fileStatus = this.getFileStatus(normalizedPath)

		// Get relative path
		const relativePath = this.getRelativePath(normalizedPath)

		return {
			originalPath: filePath,
			normalizedPath,
			relativePath,
			isWithinWorkspace,
			isInPRDiff,
			fileStatus: fileStatus || undefined,
			isIgnored: false, // Will be set by IgnoreHandler
		}
	}

	/**
	 * Check if a path is within workspace boundaries
	 */
	private isWithinWorkspace(filePath: string): boolean {
		// For GitHub workspaces, we allow any path that doesn't contain dangerous patterns
		const dangerousPatterns = [
			"..", // Path traversal
			"//", // Double slashes
			"~", // Home directory access
		]

		return !dangerousPatterns.some((pattern) => filePath.includes(pattern))
	}

	/**
	 * Check if a file is part of the PR diff
	 */
	private isInPRDiff(filePath: string): boolean {
		if (!this.workspaceContext.pullRequest) {
			return true // If not reviewing a PR, all files are accessible
		}

		const relativePath = this.getRelativePath(filePath)
		return this.workspaceContext.changedFiles.some(
			(file) => file.filename === relativePath || file.previous_filename === relativePath,
		)
	}

	/**
	 * Get file status from PR diff
	 */
	private getFileStatus(filePath: string): "added" | "modified" | "removed" | "renamed" | undefined {
		if (!this.workspaceContext.pullRequest) {
			return undefined
		}

		const relativePath = this.getRelativePath(filePath)
		const fileDiff = this.workspaceContext.changedFiles.find(
			(file) => file.filename === relativePath || file.previous_filename === relativePath,
		)

		return fileDiff?.status as "added" | "modified" | "removed" | "renamed" | undefined
	}

	/**
	 * Get relative path from workspace root
	 */
	private getRelativePath(filePath: string): string {
		// For GitHub workspaces, the path is already relative to the repository root
		return filePath.startsWith("/") ? filePath.substring(1) : filePath
	}

	/**
	 * Validate that a path is safe to access
	 */
	public validatePath(filePath: string): { valid: boolean; reason?: string } {
		const resolution = this.resolvePath(filePath)

		if (!resolution.isWithinWorkspace) {
			return { valid: false, reason: "Path is outside workspace boundaries" }
		}

		if (this.workspaceContext.pullRequest && !resolution.isInPRDiff) {
			return { valid: false, reason: "File is not part of the pull request changes" }
		}

		return { valid: true }
	}
}
