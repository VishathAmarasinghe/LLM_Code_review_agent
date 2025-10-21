import { OpenAI } from "openai"
import { IEmbedder, EmbeddingResponse, EmbedderInfo } from "../interfaces"
import {
	MAX_BATCH_TOKENS,
	MAX_ITEM_TOKENS,
	MAX_BATCH_RETRIES as MAX_RETRIES,
	INITIAL_RETRY_DELAY_MS as INITIAL_DELAY_MS,
} from "../constants"
import { logger } from "../../../utils/logger"

/**
 * OpenAI implementation of the embedder interface with batching and rate limiting
 */
export class OpenAIEmbedder implements IEmbedder {
	private embeddingsClient: OpenAI
	private readonly defaultModelId: string

	constructor(apiKey: string, modelId: string = "text-embedding-3-small") {
		this.embeddingsClient = new OpenAI({ apiKey })
		this.defaultModelId = modelId
	}

	/**
	 * Creates embeddings for the given texts with batching and rate limiting
	 * @param texts Array of text strings to embed
	 * @param model Optional model identifier
	 * @returns Promise resolving to embedding response
	 */
	async createEmbeddings(texts: string[], model?: string): Promise<EmbeddingResponse> {
		const modelToUse = model || this.defaultModelId

		const allEmbeddings: number[][] = []
		const usage = { promptTokens: 0, totalTokens: 0 }
		const remainingTexts = [...texts]

		while (remainingTexts.length > 0) {
			const currentBatch: string[] = []
			let currentBatchTokens = 0
			const processedIndices: number[] = []

			for (let i = 0; i < remainingTexts.length; i++) {
				const text = remainingTexts[i]
				const itemTokens = Math.ceil(text.length / 4)

				if (itemTokens > MAX_ITEM_TOKENS) {
					logger.warn(`Text at index ${i} exceeds token limit (${itemTokens} > ${MAX_ITEM_TOKENS}), skipping`)
					processedIndices.push(i)
					continue
				}

				if (currentBatchTokens + itemTokens <= MAX_BATCH_TOKENS) {
					currentBatch.push(text)
					currentBatchTokens += itemTokens
					processedIndices.push(i)
				} else {
					break
				}
			}

			// Remove processed items from remainingTexts (in reverse order to maintain correct indices)
			for (let i = processedIndices.length - 1; i >= 0; i--) {
				remainingTexts.splice(processedIndices[i], 1)
			}

			if (currentBatch.length > 0) {
				const batchResult = await this._embedBatchWithRetries(currentBatch, modelToUse)
				allEmbeddings.push(...batchResult.embeddings)
				usage.promptTokens += batchResult.usage.promptTokens
				usage.totalTokens += batchResult.usage.totalTokens
			}
		}

		return { embeddings: allEmbeddings, usage }
	}

	/**
	 * Helper method to handle batch embedding with retries and exponential backoff
	 * @param batchTexts Array of texts to embed in this batch
	 * @param model Model identifier to use
	 * @returns Promise resolving to embeddings and usage statistics
	 */
	private async _embedBatchWithRetries(
		batchTexts: string[],
		model: string,
	): Promise<{ embeddings: number[][]; usage: { promptTokens: number; totalTokens: number } }> {
		for (let attempts = 0; attempts < MAX_RETRIES; attempts++) {
			try {
				const response = await this.embeddingsClient.embeddings.create({
					input: batchTexts,
					model: model,
				})

				return {
					embeddings: response.data.map((item) => item.embedding),
					usage: {
						promptTokens: response.usage?.prompt_tokens || 0,
						totalTokens: response.usage?.total_tokens || 0,
					},
				}
			} catch (error: any) {
				const hasMoreAttempts = attempts < MAX_RETRIES - 1

				// Check if it's a rate limit error
				if (error?.status === 429 && hasMoreAttempts) {
					const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempts)
					logger.warn(`Rate limit hit, retrying in ${delayMs}ms (attempt ${attempts + 1}/${MAX_RETRIES})`)
					await new Promise((resolve) => setTimeout(resolve, delayMs))
					continue
				}

				// Log the error for debugging
				logger.error(`OpenAI embedder error (attempt ${attempts + 1}/${MAX_RETRIES}):`, error)

				// If this is the last attempt or not a rate limit error, throw
				if (!hasMoreAttempts) {
					throw new Error(`Failed to create embeddings after ${MAX_RETRIES} attempts: ${error.message}`)
				}
			}
		}

		throw new Error(`Failed to create embeddings after ${MAX_RETRIES} attempts`)
	}

	/**
	 * Validates the OpenAI embedder configuration by attempting a minimal embedding request
	 * @returns Promise resolving to validation result with success status and optional error message
	 */
	async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
		try {
			// Test with a minimal embedding request
			const response = await this.embeddingsClient.embeddings.create({
				input: ["test"],
				model: this.defaultModelId,
			})

			// Check if we got a valid response
			if (!response.data || response.data.length === 0) {
				return {
					valid: false,
					error: "Invalid response format from OpenAI API",
				}
			}

			return { valid: true }
		} catch (error: any) {
			return {
				valid: false,
				error: error.message || "Failed to validate OpenAI configuration",
			}
		}
	}

	get embedderInfo(): EmbedderInfo {
		return {
			name: "openai",
		}
	}
}
