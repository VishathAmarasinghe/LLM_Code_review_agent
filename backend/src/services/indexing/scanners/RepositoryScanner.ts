import * as path from "path"
import { IRepositoryScanner, IDirectoryScanner, CodeBlock, IndexingProgress } from "../interfaces"
import {
	SUPPORTED_EXTENSIONS,
	IGNORED_DIRECTORIES,
	MAX_FILE_SIZE_BYTES,
	PARSING_CONCURRENCY,
	BATCH_PROCESSING_CONCURRENCY,
	BATCH_SEGMENT_THRESHOLD,
} from "../constants"
import { logger } from "../../../utils/logger"
import { Repository } from "../../../models"
import { IEmbedder, IVectorStore, ICodeParser } from "../interfaces"
import pLimit from "p-limit"
import { Mutex } from "async-mutex"

/**
 * Repository scanner service for finding and filtering files
 */
export class RepositoryScanner implements IRepositoryScanner {
	/**
	 * Scans a GitHub repository for files
	 * @param repository Repository object
	 * @param accessToken GitHub access token
	 * @returns Promise resolving to array of file paths
	 */
	async scanRepository(repository: Repository, accessToken?: string): Promise<string[]> {
		try {
			logger.info(`🔍 Scanning repository: ${repository.fullName}`)

			const allFiles = await this.getAllFilesFromGitHub(repository, accessToken)
			logger.info(`📄 Found ${allFiles.length} total files`)

			const supportedFiles = this.filterSupportedFiles(allFiles)
			logger.info(`✅ Found ${supportedFiles.length} supported files`)

			return supportedFiles
		} catch (error) {
			logger.error("Error scanning repository:", error)
			throw error
		}
	}

	/**
	 * Filters files to only include supported file types
	 * @param files Array of file paths
	 * @returns Array of supported file paths
	 */
	filterSupportedFiles(files: string[]): string[] {
		return files.filter((filePath) => {
			const ext = path.extname(filePath).toLowerCase()
			return SUPPORTED_EXTENSIONS.includes(ext)
		})
	}

	/**
	 * Validates if a file size is within limits
	 * @param fileSize File size in bytes
	 * @returns Boolean indicating if file is valid
	 */
	validateFileSize(fileSize: number): boolean {
		return fileSize <= MAX_FILE_SIZE_BYTES
	}

	/**
	 * Gets all files from GitHub repository using GitHub API
	 * @param repository Repository object
	 * @param accessToken GitHub access token
	 * @returns Promise resolving to array of file paths
	 */
	private async getAllFilesFromGitHub(repository: Repository, accessToken?: string): Promise<string[]> {
		const files: string[] = []

		try {
			const { githubService } = require("../../githubService")
			const allFiles = await githubService.getAllRepositoryFiles(
				repository.ownerLogin,
				repository.name,
				accessToken,
			)

			for (const file of allFiles) {
				// Skip ignored directories and files
				if (this.shouldIgnoreFile(file.name) || this.shouldIgnoreDirectory(path.dirname(file.path))) {
					continue
				}

				// Check file size if available
				if (file.size && !this.validateFileSize(file.size)) {
					continue
				}

				files.push(file.path)
			}
		} catch (error) {
			logger.error(`Error getting files from GitHub repository ${repository.fullName}:`, error)
			throw error
		}

		return files
	}

	/**
	 * Checks if a directory should be ignored
	 * @param dirName Directory name
	 * @returns Boolean indicating if directory should be ignored
	 */
	private shouldIgnoreDirectory(dirName: string): boolean {
		return IGNORED_DIRECTORIES.some((ignoredDir) => {
			if (ignoredDir.includes("*")) {
				// Handle wildcard patterns
				const pattern = ignoredDir.replace(/\*/g, ".*")
				const regex = new RegExp(`^${pattern}$`)
				return regex.test(dirName)
			}
			return dirName === ignoredDir
		})
	}

	/**
	 * Checks if a file should be ignored
	 * @param fileName File name
	 * @returns Boolean indicating if file should be ignored
	 */
	private shouldIgnoreFile(fileName: string): boolean {
		return IGNORED_DIRECTORIES.some((ignoredPattern) => {
			if (ignoredPattern.includes("*")) {
				// Handle wildcard patterns
				const pattern = ignoredPattern.replace(/\*/g, ".*")
				const regex = new RegExp(`^${pattern}$`)
				return regex.test(fileName)
			}
			return fileName === ignoredPattern
		})
	}

	/**
	 * Gets file statistics for a repository
	 * @param repository Repository object
	 * @param accessToken GitHub access token
	 * @returns Promise resolving to file statistics
	 */
	async getRepositoryStats(
		repository: Repository,
		accessToken?: string,
	): Promise<{
		totalFiles: number
		supportedFiles: number
		totalSize: number
		supportedSize: number
		languages: Record<string, number>
	}> {
		try {
			const { githubService } = require("../../githubService")
			const allFiles = await githubService.getAllRepositoryFiles(
				repository.ownerLogin,
				repository.name,
				accessToken,
			)
			const supportedFiles = this.filterSupportedFiles(allFiles.map((f: any) => f.path))

			let totalSize = 0
			let supportedSize = 0
			const languages: Record<string, number> = {}

			// Calculate sizes and language distribution
			for (const file of allFiles) {
				totalSize += file.size || 0

				if (supportedFiles.includes(file.path)) {
					supportedSize += file.size || 0

					const ext = path.extname(file.path).toLowerCase()
					const language = this.getLanguageFromExtension(ext)
					languages[language] = (languages[language] || 0) + 1
				}
			}

			return {
				totalFiles: allFiles.length,
				supportedFiles: supportedFiles.length,
				totalSize,
				supportedSize,
				languages,
			}
		} catch (error) {
			logger.error("Error getting repository stats:", error)
			throw error
		}
	}

	/**
	 * Gets language name from file extension
	 * @param extension File extension
	 * @returns Language name
	 */
	private getLanguageFromExtension(extension: string): string {
		const languageMap: Record<string, string> = {
			".js": "JavaScript",
			".jsx": "JavaScript",
			".ts": "TypeScript",
			".tsx": "TypeScript",
			".py": "Python",
			".java": "Java",
			".cpp": "C++",
			".c": "C",
			".cs": "C#",
			".php": "PHP",
			".rb": "Ruby",
			".go": "Go",
			".rs": "Rust",
			".swift": "Swift",
			".kt": "Kotlin",
			".scala": "Scala",
			".dart": "Dart",
			".r": "R",
			".m": "Objective-C",
			".mm": "Objective-C++",
			".pl": "Perl",
			".sh": "Shell",
			".bash": "Bash",
			".zsh": "Zsh",
			".fish": "Fish",
			".ps1": "PowerShell",
			".bat": "Batch",
			".cmd": "Batch",
			".sql": "SQL",
			".html": "HTML",
			".htm": "HTML",
			".css": "CSS",
			".scss": "SCSS",
			".sass": "Sass",
			".less": "Less",
			".json": "JSON",
			".xml": "XML",
			".yaml": "YAML",
			".yml": "YAML",
			".toml": "TOML",
			".ini": "INI",
			".cfg": "Config",
			".conf": "Config",
			".md": "Markdown",
			".markdown": "Markdown",
			".txt": "Text",
			".tex": "LaTeX",
			".rst": "reStructuredText",
			".adoc": "AsciiDoc",
			".org": "Org",
			".wiki": "Wiki",
		}

		return languageMap[extension] || "Unknown"
	}
}
