import * as fs from "fs/promises"
import * as path from "path"
import { createHash } from "crypto"
import { v4 as uuidv4 } from "uuid"
import pLimit from "p-limit"
import { Mutex } from "async-mutex"
import { IDirectoryScanner, CodeBlock, IndexingProgress } from "../interfaces"
import { CodeParser } from "../parsers/CodeParser"
import { IEmbedder, IVectorStore } from "../interfaces"
import {
	SUPPORTED_EXTENSIONS,
	IGNORED_DIRECTORIES,
	IGNORED_FILE_PATTERNS,
	MAX_FILE_SIZE_BYTES,
	PARSING_CONCURRENCY,
	BATCH_PROCESSING_CONCURRENCY,
	BATCH_SEGMENT_THRESHOLD,
} from "../constants"
import { logger } from "../../../utils/logger"

export class DirectoryScanner implements IDirectoryScanner {
	constructor(
		private readonly embedder: IEmbedder,
		private readonly vectorStore: IVectorStore | null,
		private readonly codeParser: CodeParser,
		private readonly repositoryName: string,
		private readonly workspacePath: string,
		private readonly repository: any, // Repository model instance
	) {}

	/**
	 * Recursively scans a directory for code blocks in supported files
	 */
	async scanDirectory(
		directory: string,
		onError?: (error: Error) => void,
		onBlocksIndexed?: (indexedCount: number) => void,
		onFileParsed?: (fileBlockCount: number) => void,
	): Promise<{
		stats: { processed: number; skipped: number }
		totalBlockCount: number
	}> {
		const processedFiles = new Set<string>()
		let processedCount = 0
		let skippedCount = 0
		let totalBlockCount = 0

		// Initialize parallel processing tools
		const parseLimiter = pLimit(PARSING_CONCURRENCY)
		const batchLimiter = pLimit(BATCH_PROCESSING_CONCURRENCY)
		const mutex = new Mutex()

		// Shared batch accumulators (protected by mutex)
		let currentBatchBlocks: CodeBlock[] = []
		let currentBatchTexts: string[] = []
		let currentBatchFileInfos: { filePath: string; fileHash: string; isNew: boolean }[] = []

		try {
			// Get all files recursively
			const allFiles = await this.getAllFiles(directory)

			// Filter supported files
			const supportedFiles = this.filterSupportedFiles(allFiles)

			// Process files in batches
			for (let i = 0; i < supportedFiles.length; i++) {
				const filePath = supportedFiles[i]

				if (!filePath) {
					continue
				}

				try {
					// Check file size
					const stats = await fs.stat(filePath)
					if (stats.size > MAX_FILE_SIZE_BYTES) {
						skippedCount++
						continue
					}

					// Parse file
					const blocks = await parseLimiter(() => this.codeParser.parseFile(filePath))

					if (blocks.length > 0) {
						const fileHash = this.createFileHash(filePath)

						// Add to current batch
						await mutex.runExclusive(async () => {
							currentBatchBlocks.push(...blocks)
							currentBatchTexts.push(...blocks.map((b: CodeBlock) => b.content))
							currentBatchFileInfos.push({
								filePath,
								fileHash,
								isNew: true,
							})

							// Process batch if it's full
							if (currentBatchBlocks.length >= BATCH_SEGMENT_THRESHOLD) {
								await this.processBatch(
									currentBatchBlocks,
									currentBatchTexts,
									currentBatchFileInfos,
									onBlocksIndexed,
								)

								// Reset batch
								currentBatchBlocks = []
								currentBatchTexts = []
								currentBatchFileInfos = []
							}
						})

						processedCount++
						totalBlockCount += blocks.length
						processedFiles.add(filePath)

						// Report file parsed
						if (onFileParsed) {
							onFileParsed(blocks.length)
						}
					} else {
						skippedCount++
					}
				} catch (error) {
					logger.error(`Error processing file ${filePath}:`, error)
					skippedCount++
					if (onError) {
						onError(error as Error)
					}
				}
			}

			// Process remaining batch
			if (currentBatchBlocks.length > 0) {
				await mutex.runExclusive(async () => {
					await this.processBatch(
						currentBatchBlocks,
						currentBatchTexts,
						currentBatchFileInfos,
						onBlocksIndexed,
					)
				})
			}

			return {
				stats: { processed: processedCount, skipped: skippedCount },
				totalBlockCount,
			}
		} catch (error) {
			logger.error("Error scanning directory:", error)
			throw error
		}
	}

	/**
	 * Gets all files in a directory recursively
	 */
	private async getAllFiles(dir: string): Promise<string[]> {
		const files: string[] = []

		try {
			const entries = await fs.readdir(dir, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name)

				if (entry.isDirectory()) {
					// Skip ignored directories
					if (IGNORED_DIRECTORIES.includes(entry.name)) {
						continue
					}

					// Recursively get files from subdirectory
					const subFiles = await this.getAllFiles(fullPath)
					files.push(...subFiles)
				} else if (entry.isFile()) {
					files.push(fullPath)
				}
			}
		} catch (error) {
			logger.error(`Error reading directory ${dir}:`, error)
		}

		return files
	}

	/**
	 * Filters files to only include supported file types
	 */
	private filterSupportedFiles(files: string[]): string[] {
		return files.filter((filePath) => {
			const ext = path.extname(filePath).toLowerCase()
			return SUPPORTED_EXTENSIONS.includes(ext)
		})
	}

	/**
	 * Creates a hash for a file
	 */
	private createFileHash(filePath: string): string {
		return createHash("sha256").update(filePath).digest("hex")
	}

	/**
	 * Converts absolute file path to repository-relative path
	 */
	private getRepositoryRelativePath(absolutePath: string): string {
		return path.relative(this.workspacePath, absolutePath)
	}

	/**
	 * Generates GitHub URLs and additional metadata for a file
	 */
	private generateFileMetadata(relativePath: string, startLine: number, endLine: number) {
		const htmlUrl = this.repository.htmlUrl || this.repository.dataValues?.htmlUrl
		const defaultBranch = this.repository.defaultBranch || this.repository.dataValues?.defaultBranch

		const githubFileUrl = `${htmlUrl}/blob/${defaultBranch}/${relativePath}`
		const githubBlameUrl = `${htmlUrl}/blame/${defaultBranch}/${relativePath}`
		const githubHistoryUrl = `${htmlUrl}/commits/${defaultBranch}/${relativePath}`
		const githubRawUrl = `${htmlUrl}/raw/${defaultBranch}/${relativePath}`

		// Generate line-specific URLs
		const lineRange = startLine === endLine ? `L${startLine}` : `L${startLine}-L${endLine}`
		const githubFileUrlWithLines = `${githubFileUrl}#${lineRange}`

		return {
			github_file_url: githubFileUrl,
			github_file_url_with_lines: githubFileUrlWithLines,
			github_blame_url: githubBlameUrl,
			github_history_url: githubHistoryUrl,
			github_raw_url: githubRawUrl,
			repository_url: this.repository.htmlUrl || this.repository.dataValues?.htmlUrl,
			repository_name: this.repository.fullName || this.repository.dataValues?.fullName,
			repository_owner: this.repository.ownerLogin || this.repository.dataValues?.ownerLogin,
			repository_language: this.repository.language || this.repository.dataValues?.language || "unknown",
			repository_is_private: this.repository.isPrivate || this.repository.dataValues?.isPrivate,
			repository_is_fork: this.repository.isFork || this.repository.dataValues?.isFork,
			repository_stars: this.repository.starsCount || this.repository.dataValues?.starsCount,
			repository_forks: this.repository.forksCount || this.repository.dataValues?.forksCount,
			repository_size: this.repository.size || this.repository.dataValues?.size,
			repository_created_at: this.repository.repoCreatedAt || this.repository.dataValues?.repoCreatedAt,
			repository_updated_at: this.repository.repoUpdatedAt || this.repository.dataValues?.repoUpdatedAt,
			repository_pushed_at: this.repository.repoPushedAt || this.repository.dataValues?.repoPushedAt,
			default_branch: this.repository.defaultBranch || this.repository.dataValues?.defaultBranch,
			file_extension: path.extname(relativePath),
			file_directory: path.dirname(relativePath),
			file_name: path.basename(relativePath),
			file_name_without_ext: path.basename(relativePath, path.extname(relativePath)),
		}
	}

	/**
	 * Processes a batch of code blocks
	 */
	private async processBatch(
		batchBlocks: CodeBlock[],
		batchTexts: string[],
		batchFileInfos: { filePath: string; fileHash: string; isNew: boolean }[],
		onBlocksIndexed?: (indexedCount: number) => void,
	): Promise<void> {
		try {
			// If vector store is available, also store embeddings
			if (this.vectorStore) {
				try {
					// Generate embeddings for all texts using the new interface
					const embeddingResponse = await this.embedder.createEmbeddings(batchTexts)
					const embeddings = embeddingResponse.embeddings

					// Prepare points for vector store
					const points = batchBlocks.map((block, index) => {
						const embedding = embeddings[index]
						if (!embedding) {
							throw new Error(`Missing embedding for block at index ${index}`)
						}

						const relativePath = this.getRepositoryRelativePath(block.file_path)
						const fileMetadata = this.generateFileMetadata(relativePath, block.start_line, block.end_line)

						return {
							id: uuidv4(),
							vector: embedding,
							payload: {
								// Core file information
								file_path: relativePath,
								content: block.content,
								start_line: block.start_line,
								end_line: block.end_line,
								block_type: block.type,
								identifier: block.identifier,
								file_hash: block.fileHash,
								segment_hash: block.segmentHash,

								// Repository information
								repository_id: this.repository.id || this.repository.dataValues?.id,

								// GitHub URLs and additional metadata
								...fileMetadata,

								// Additional metadata
								indexed_at: new Date().toISOString(),
								content_length: block.content.length,
								line_count: block.end_line - block.start_line + 1,
							},
						}
					})

					// Upsert to vector store
					await this.vectorStore.upsertPoints(points)
				} catch (error) {
					logger.warn("Vector store operation failed, continuing with database only:", error)
				}
			}

			// Report blocks indexed
			if (onBlocksIndexed) {
				onBlocksIndexed(batchBlocks.length)
			}
		} catch (error) {
			logger.error("Error processing batch:", error)
			throw error
		}
	}
}
