import { WorkspaceContext, SecurityBoundaries } from "./types"

export class SecurityHandler {
	private workspaceContext: WorkspaceContext
	private securityBoundaries: SecurityBoundaries

	constructor(workspaceContext: WorkspaceContext) {
		this.workspaceContext = workspaceContext
		this.securityBoundaries = workspaceContext.securityBoundaries
	}

	/**
	 * Check if file access is allowed based on security boundaries
	 */
	public isFileAccessAllowed(
		filePath: string,
		fileSize: number,
		repository: any,
	): { allowed: boolean; reason?: string } {
		// Check file size limits
		if (fileSize > this.securityBoundaries.maxFileSize) {
			return {
				allowed: false,
				reason: `File size ${fileSize} exceeds maximum allowed size ${this.securityBoundaries.maxFileSize}`,
			}
		}

		// Check file extension
		const fileExtension = this.getFileExtension(filePath)
		if (this.securityBoundaries.blockedFileExtensions.includes(fileExtension)) {
			return {
				allowed: false,
				reason: `File extension ${fileExtension} is blocked`,
			}
		}

		if (this.securityBoundaries.allowedFileExtensions.length > 0) {
			if (!this.securityBoundaries.allowedFileExtensions.includes(fileExtension)) {
				return {
					allowed: false,
					reason: `File extension ${fileExtension} is not in allowed list`,
				}
			}
		}

		// Check blocked paths
		for (const blockedPath of this.securityBoundaries.blockedPaths) {
			if (filePath.includes(blockedPath)) {
				return {
					allowed: false,
					reason: `File path contains blocked pattern: ${blockedPath}`,
				}
			}
		}

		// Check repository access
		if (!this.isRepositoryAccessAllowed(repository)) {
			return {
				allowed: false,
				reason: "Repository access not allowed",
			}
		}

		return { allowed: true }
	}

	/**
	 * Check if repository access is allowed
	 */
	private isRepositoryAccessAllowed(repository: any): boolean {
		if (!repository) {
			return false
		}

		// Check if repository owner is allowed
		if (this.securityBoundaries.allowedOwners.length > 0) {
			if (!this.securityBoundaries.allowedOwners.includes(repository.owner)) {
				return false
			}
		}

		// Check if repository name is allowed
		if (this.securityBoundaries.allowedRepos.length > 0) {
			if (!this.securityBoundaries.allowedRepos.includes(repository.fullName)) {
				return false
			}
		}

		return true
	}

	/**
	 * Get file extension from path
	 */
	private getFileExtension(filePath: string): string {
		const lastDot = filePath.lastIndexOf(".")
		if (lastDot === -1) {
			return ""
		}
		return filePath.substring(lastDot).toLowerCase()
	}

	/**
	 * Check if a command is safe to execute
	 */
	public isCommandSafe(command: string): { safe: boolean; reason?: string } {
		const dangerousCommands = [
			"rm",
			"del",
			"rmdir",
			"rd",
			"format",
			"fdisk",
			"mkfs",
			"shutdown",
			"reboot",
			"halt",
			"sudo",
			"su",
			"runas",
			"chmod",
			"chown",
			"chgrp",
			"mount",
			"umount",
			"dd",
			"cat",
			"head",
			"tail",
			"curl",
			"wget",
			"nc",
			"netcat",
			"python",
			"node",
			"npm",
			"yarn",
			"pip",
			"git",
			"svn",
			"hg",
			"docker",
			"kubectl",
			"helm",
		]

		const commandParts = command.trim().split(/\s+/)
		const baseCommand = commandParts[0]?.toLowerCase()

		if (!baseCommand) {
			return { safe: false, reason: "Empty command" }
		}

		if (dangerousCommands.includes(baseCommand)) {
			return {
				safe: false,
				reason: `Command '${baseCommand}' is not allowed for security reasons`,
			}
		}

		return { safe: true }
	}

	/**
	 * Validate file path for security
	 */
	public validateFilePath(filePath: string): { valid: boolean; reason?: string } {
		// Check for path traversal attempts
		if (filePath.includes("..") || filePath.includes("~")) {
			return {
				valid: false,
				reason: "Path traversal detected",
			}
		}

		// Check for absolute paths
		if (filePath.startsWith("/") && !filePath.startsWith("/repos/")) {
			return {
				valid: false,
				reason: "Absolute paths are not allowed",
			}
		}

		// Check for null bytes
		if (filePath.includes("\0")) {
			return {
				valid: false,
				reason: "Null bytes are not allowed in file paths",
			}
		}

		return { valid: true }
	}

	/**
	 * Get security boundaries
	 */
	public getSecurityBoundaries(): SecurityBoundaries {
		return { ...this.securityBoundaries }
	}

	/**
	 * Update security boundaries
	 */
	public updateSecurityBoundaries(boundaries: Partial<SecurityBoundaries>): void {
		this.securityBoundaries = { ...this.securityBoundaries, ...boundaries }
	}
}
