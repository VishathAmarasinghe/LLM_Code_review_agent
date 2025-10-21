import { QdrantClient, Schemas } from "@qdrant/js-client-rest"
import { createHash } from "crypto"
import { IVectorStore, VectorStoreSearchResult, PointStruct } from "../interfaces"
import { DEFAULT_MAX_SEARCH_RESULTS, DEFAULT_SEARCH_MIN_SCORE, EMBEDDING_DIMENSIONS } from "../constants"
import { logger } from "../../../utils/logger"

export class QdrantVectorStore implements IVectorStore {
	private readonly vectorSize: number
	private readonly DISTANCE_METRIC = "Cosine"
	private client: QdrantClient
	private readonly qdrantUrl: string
	private readonly apiKey: string | undefined

	constructor(url: string = "http://localhost:6333", vectorSize: number = EMBEDDING_DIMENSIONS, apiKey?: string) {
		this.qdrantUrl = this.parseQdrantUrl(url)
		this.vectorSize = vectorSize
		this.apiKey = apiKey || undefined

		try {
			const urlObj = new URL(this.qdrantUrl)
			let port: number
			let useHttps: boolean

			if (urlObj.port) {
				port = Number(urlObj.port)
				useHttps = urlObj.protocol === "https:"
			} else {
				if (urlObj.protocol === "https:") {
					port = 443
					useHttps = true
				} else {
					port = 80
					useHttps = false
				}
			}

			const clientConfig: any = {
				host: urlObj.hostname,
				https: useHttps,
				port: port,
				headers: {
					"User-Agent": "Code-Review-Agent-Backend",
				},
			}

			if (urlObj.pathname !== "/") {
				clientConfig.prefix = urlObj.pathname.replace(/\/+$/, "")
			}

			if (apiKey) {
				clientConfig.apiKey = apiKey
			}

			this.client = new QdrantClient(clientConfig)
		} catch (urlError) {
			this.client = new QdrantClient({
				url: this.qdrantUrl,
				...(apiKey && { apiKey }),
				headers: {
					"User-Agent": "Code-Review-Agent-Backend",
				},
			})
		}
	}

	private parseQdrantUrl(url: string): string {
		if (!url || url.trim() === "") {
			return "http://localhost:6333"
		}

		const trimmedUrl = url.trim()
		if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://") && !trimmedUrl.includes("://")) {
			return this.parseHostname(trimmedUrl)
		}

		return trimmedUrl
	}

	private parseHostname(hostname: string): string {
		if (hostname.includes(":")) {
			return `http://${hostname}`
		}
		return `http://${hostname}:6333`
	}

	private getCollectionName(repositoryId: number): string {
		return `code-blocks-repo-${repositoryId}`
	}

	/**
	 * Get collection information
	 */
	async getCollectionInfo(repositoryId: number): Promise<Schemas["CollectionInfo"] | null> {
		try {
			const collectionName = this.getCollectionName(repositoryId)
			const collectionInfo = await this.client.getCollection(collectionName)
			return collectionInfo as Schemas["CollectionInfo"]
		} catch (error) {
			return null
		}
	}

	async initialize(repositoryId: number): Promise<boolean> {
		try {
			const collectionName = this.getCollectionName(repositoryId)
			logger.info(`🔧 Initializing Qdrant collection: ${collectionName}`)
			logger.info(`📡 Qdrant URL: ${this.qdrantUrl}`)
			logger.info(`🔢 Vector size: ${this.vectorSize}`)

			const collectionInfo = await this.getCollectionInfo(repositoryId)
			logger.info(`📊 Collection info: ${collectionInfo ? "exists" : "not found"}`)

			if (!collectionInfo) {
				// Create collection
				logger.info("📦 Creating new collection...")
				await this.client.createCollection(collectionName, {
					vectors: {
						size: this.vectorSize,
						distance: this.DISTANCE_METRIC,
					},
				})
				logger.info("✅ Collection created successfully")

				// Create payload indexes
				logger.info("🔍 Creating payload indexes...")
				await this.createPayloadIndexes(collectionName)
				logger.info("✅ Payload indexes created")
			} else {
				// Check if vector size matches
				const config = collectionInfo.config
				const vectors = config.params?.vectors
				if (vectors && vectors.size !== this.vectorSize) {
					logger.warn(`⚠️ Vector size mismatch. Expected ${this.vectorSize}, got ${vectors.size}`)
					return false
				}
				logger.info("✅ Collection already exists with correct configuration")
			}

			logger.info("🎉 QdrantVectorStore initialization completed successfully")
			return true
		} catch (error) {
			logger.error("❌ Failed to initialize Qdrant collection:", error)
			return false
		}
	}

	private async createPayloadIndexes(collectionName: string): Promise<void> {
		try {
			// Create indexes for efficient filtering
			await this.client.createPayloadIndex(collectionName, {
				field_name: "repository_id",
				field_schema: "keyword",
			})

			await this.client.createPayloadIndex(collectionName, {
				field_name: "file_path",
				field_schema: "text",
			})

			await this.client.createPayloadIndex(collectionName, {
				field_name: "block_type",
				field_schema: "keyword",
			})

			await this.client.createPayloadIndex(collectionName, {
				field_name: "language",
				field_schema: "keyword",
			})
		} catch (error) {
			logger.warn("Failed to create payload indexes:", error)
		}
	}

	async upsertPoints(points: PointStruct[]): Promise<void> {
		try {
			const collectionName = this.getCollectionName(points[0]?.payload?.repository_id)
			if (!collectionName) {
				throw new Error("Repository ID not found in points payload")
			}

			const upsertPoints = points.map((point) => ({
				id: point.id,
				vector: point.vector,
				payload: point.payload,
			}))

			await this.client.upsert(collectionName, {
				points: upsertPoints,
			})
		} catch (error) {
			logger.error("Failed to upsert points:", error)
			throw error
		}
	}

	async search(
		queryVector: number[],
		repositoryId: number,
		minScore: number = DEFAULT_SEARCH_MIN_SCORE,
		maxResults: number = DEFAULT_MAX_SEARCH_RESULTS,
	): Promise<VectorStoreSearchResult[]> {
		try {
			const collectionName = this.getCollectionName(repositoryId)

			const filter = {
				must: [
					{
						key: "repository_id",
						match: { value: repositoryId },
					},
				],
			}

			const searchResult = await this.client.search(collectionName, {
				vector: queryVector,
				limit: maxResults,
				score_threshold: minScore,
				filter: filter,
			})

			return searchResult.map((result: any) => ({
				id: result.id as string,
				score: result.score,
				payload: result.payload as any,
			}))
		} catch (error) {
			logger.error("Failed to search vector store:", error)
			throw error
		}
	}

	async deletePointsByRepository(repositoryId: number): Promise<void> {
		try {
			const collectionName = this.getCollectionName(repositoryId)
			await this.client.delete(collectionName, {
				filter: {
					must: [
						{
							key: "repository_id",
							match: { value: repositoryId },
						},
					],
				},
			})
		} catch (error) {
			logger.error("Failed to delete points by repository:", error)
			throw error
		}
	}

	async clearCollection(repositoryId: number): Promise<void> {
		try {
			const collectionName = this.getCollectionName(repositoryId)
			await this.client.delete(collectionName, {
				filter: {},
			})
		} catch (error) {
			logger.error("Failed to clear collection:", error)
			throw error
		}
	}

	async deleteCollection(): Promise<void> {
		try {
			// Delete all collections for this workspace
			const collections = await this.client.getCollections()
			for (const collection of collections.collections) {
				if (collection.name.startsWith("code-blocks-repo-")) {
					await this.client.deleteCollection(collection.name)
				}
			}
		} catch (error) {
			logger.error("Failed to delete collection:", error)
			throw error
		}
	}

	/**
	 * Count points for a specific repository
	 */
	async countPointsByRepository(repositoryId: number): Promise<number> {
		try {
			const collectionName = this.getCollectionName(repositoryId)
			logger.info(`🔢 Counting points for repository: ${repositoryId} in collection: ${collectionName}`)

			// Use scroll API instead of search for more reliable counting
			const scrollRequest = {
				limit: 10000, // High limit to get all points
				with_payload: false, // We don't need payload for counting
				with_vector: false,
				filter: {
					must: [
						{
							key: "repository_id",
							match: { value: repositoryId },
						},
					],
				},
			}

			const response = await this.client.scroll(collectionName, scrollRequest)
			logger.info(`📊 Found ${response.points.length} points matching repository filter`)
			return response.points.length
		} catch (error) {
			logger.error("Error counting points by repository:", error)
			return 0
		}
	}
}
