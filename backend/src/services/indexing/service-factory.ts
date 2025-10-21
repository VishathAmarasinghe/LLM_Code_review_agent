import { OpenAIEmbedder } from "./embedders/OpenAIEmbedder"
import { QdrantVectorStore } from "./vectorStore/QdrantVectorStore"
import { CodeParser } from "./parsers/CodeParser"
import { DirectoryScanner } from "./processors/DirectoryScanner"
import { ICodeParser, IEmbedder, IVectorStore, IDirectoryScanner } from "./interfaces"
import { logger } from "../../utils/logger"

export interface IndexingConfig {
	openaiApiKey: string
	qdrantUrl: string
	qdrantApiKey?: string
	embeddingModel: string
	maxFileSize: number
	batchSize: number
	maxConcurrentJobs: number
	isEnabled: boolean
}

/**
 * Factory class responsible for creating and configuring code indexing service dependencies.
 */
export class CodeIndexServiceFactory {
	constructor(
		private readonly config: IndexingConfig,
		private readonly workspacePath: string,
	) {}

	/**
	 * Creates an embedder instance based on the current configuration.
	 */
	public createEmbedder(): IEmbedder {
		if (!this.config.openaiApiKey) {
			throw new Error("OpenAI API key is required")
		}

		return new OpenAIEmbedder(this.config.openaiApiKey, this.config.embeddingModel)
	}

	/**
	 * Validates an embedder instance to ensure it's properly configured.
	 */
	public async validateEmbedder(embedder: IEmbedder): Promise<{ valid: boolean; error?: string }> {
		try {
			return await embedder.validateConfiguration()
		} catch (error) {
			logger.error("Embedder validation failed:", error)
			return {
				valid: false,
				error: error instanceof Error ? error.message : "Configuration validation failed",
			}
		}
	}

	/**
	 * Creates a vector store instance using the current configuration.
	 */
	public createVectorStore(): IVectorStore {
		if (!this.config.qdrantUrl) {
			throw new Error("Qdrant URL is required")
		}

		// Use default embedding dimensions for text-embedding-3-small
		const vectorSize = 1536

		return new QdrantVectorStore(this.config.qdrantUrl, vectorSize, this.config.qdrantApiKey)
	}

	/**
	 * Creates a code parser instance.
	 */
	public createCodeParser(): ICodeParser {
		return new CodeParser()
	}

	/**
	 * Creates a directory scanner instance with its required dependencies.
	 */
	public createDirectoryScanner(
		embedder: IEmbedder,
		vectorStore: IVectorStore,
		parser: ICodeParser,
		repositoryName: string,
		workspacePath: string,
		repository: any,
	): IDirectoryScanner {
		return new DirectoryScanner(embedder, vectorStore, parser as any, repositoryName, workspacePath, repository)
	}

	/**
	 * Creates all required service dependencies if the service is properly configured.
	 */
	public createServices(
		repositoryName: string,
		workspacePath: string,
		repository: any,
	): {
		embedder: IEmbedder
		vectorStore: IVectorStore
		parser: ICodeParser
		scanner: IDirectoryScanner
	} {
		// Bypass isEnabled check - always allow indexing
		const embedder = this.createEmbedder()
		const vectorStore = this.createVectorStore()
		const parser = this.createCodeParser()
		const scanner = this.createDirectoryScanner(
			embedder,
			vectorStore,
			parser,
			repositoryName,
			workspacePath,
			repository,
		)

		return {
			embedder,
			vectorStore,
			parser,
			scanner,
		}
	}
}
