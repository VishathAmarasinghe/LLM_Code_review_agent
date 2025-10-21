import { apiClient } from "./api"
import {
	IndexingJob,
	IndexingProgress,
	IndexingConfiguration,
	SearchResult,
	IndexingJobOptions,
	IndexingStats,
	Repository,
	ApiResponse,
	PaginatedResponse,
} from "../types/indexing"

export class IndexingApiService {
	// Indexing Jobs
	async startIndexing(repositoryId: number, userId: number, options?: IndexingJobOptions): Promise<IndexingJob> {
		try {
			const response = await apiClient.post<ApiResponse<IndexingJob>>("/indexing/start", {
				repositoryId,
				userId,
				options,
			})

			if (!response.data.success || !response.data.data) {
				throw new Error(response.data.error || "Failed to start indexing")
			}

			return response.data.data
		} catch (error: any) {
			// Handle rate limiting specifically
			if (error.response?.status === 429) {
				throw new Error("Rate limit exceeded. Please wait a moment before starting indexing again.")
			}
			throw error
		}
	}

	async stopIndexing(repositoryId: number, userId: number): Promise<boolean> {
		const response = await apiClient.post<ApiResponse<boolean>>("/indexing/stop", {
			repositoryId,
			userId,
		})

		return response.data.success || false
	}

	async reindexRepository(repositoryId: number, userId: number, options?: IndexingJobOptions): Promise<IndexingJob> {
		try {
			const response = await apiClient.post<ApiResponse<IndexingJob>>("/indexing/reindex", {
				repositoryId,
				userId,
				options,
			})

			if (!response.data.success || !response.data.data) {
				throw new Error(response.data.error || "Failed to reindex repository")
			}

			return response.data.data
		} catch (error: any) {
			// Handle rate limiting specifically
			if (error.response?.status === 429) {
				throw new Error("Rate limit exceeded. Please wait a moment before reindexing again.")
			}
			throw error
		}
	}

	async getIndexingStatus(repositoryId: number, userId: number): Promise<IndexingJob | null> {
		try {
			const response = await apiClient.get<ApiResponse<IndexingJob>>(`/indexing/status/${repositoryId}/${userId}`)

			return response.data.data || null
		} catch (error: any) {
			// Handle rate limiting specifically
			if (error.response?.status === 429) {
				console.warn("Rate limit exceeded while getting indexing status. Please try again later.")
				throw new Error("Rate limit exceeded. Please wait a moment and try again.")
			}
			console.error("Error getting indexing status:", error)
			return null
		}
	}

	async getIndexingJobs(userId: number, limit: number = 10): Promise<IndexingJob[]> {
		try {
			const response = await apiClient.get<ApiResponse<IndexingJob[]>>(`/indexing/jobs/${userId}?limit=${limit}`)

			return response.data.data || []
		} catch (error) {
			console.error("Error getting indexing jobs:", error)
			return []
		}
	}

	async deleteIndexingJob(jobId: number, userId: number): Promise<boolean> {
		try {
			const response = await apiClient.delete<ApiResponse<boolean>>(`/indexing/jobs/${jobId}?userId=${userId}`)

			return response.data.success || false
		} catch (error) {
			console.error("Error deleting indexing job:", error)
			return false
		}
	}

	// Configuration
	async getIndexingConfiguration(userId: number): Promise<IndexingConfiguration | null> {
		try {
			const response = await apiClient.get<ApiResponse<IndexingConfiguration>>(`/indexing/config/${userId}`)

			return response.data.data || null
		} catch (error) {
			console.error("Error getting indexing configuration:", error)
			return null
		}
	}

	async updateIndexingConfiguration(
		userId: number,
		config: Partial<IndexingConfiguration>,
	): Promise<IndexingConfiguration | null> {
		try {
			const response = await apiClient.put<ApiResponse<IndexingConfiguration>>(
				`/indexing/config/${userId}`,
				config,
			)

			return response.data.data || null
		} catch (error) {
			console.error("Error updating indexing configuration:", error)
			return null
		}
	}

	// Statistics
	async getIndexingStats(userId: number): Promise<IndexingStats | null> {
		try {
			const response = await apiClient.get<ApiResponse<IndexingStats>>(`/indexing/stats/${userId}`)

			return response.data.data || null
		} catch (error) {
			console.error("Error getting indexing stats:", error)
			return null
		}
	}

	// Search
	async searchCode(query: string, repositoryId: number, userId: number, limit: number = 50): Promise<SearchResult[]> {
		try {
			const response = await apiClient.post<ApiResponse<{ results: SearchResult[] }>>(
				`/search/repositories/${repositoryId}/code`,
				{
					query,
					limit,
				},
			)

			return response.data.data?.results || []
		} catch (error) {
			console.error("Error searching code:", error)
			return []
		}
	}

	// Repositories
	async getRepositories(userId: number): Promise<Repository[]> {
		try {
			const response = await apiClient.get<ApiResponse<Repository[]>>(`/repositories?userId=${userId}`)

			return response.data.data || []
		} catch (error) {
			console.error("Error getting repositories:", error)
			return []
		}
	}

	async getRepository(repositoryId: number, userId: number): Promise<Repository | null> {
		try {
			const response = await apiClient.get<ApiResponse<Repository>>(
				`/repositories/${repositoryId}?userId=${userId}`,
			)

			return response.data.data || null
		} catch (error) {
			console.error("Error getting repository:", error)
			return null
		}
	}

	// WebSocket connection for real-time updates
	createProgressWebSocket(repositoryId: number, userId: number): WebSocket | null {
		try {
			const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
			const token = localStorage.getItem("auth_token")

			if (!token) {
				console.error("No auth token available for WebSocket connection")
				return null
			}

			const ws = new WebSocket(`${wsUrl}/ws/indexing/${repositoryId}/${userId}?token=${token}`)

			ws.onopen = () => {
				console.log("WebSocket connected for indexing progress")
			}

			ws.onerror = (error) => {
				console.error("WebSocket error:", error)
			}

			ws.onclose = () => {
				console.log("WebSocket disconnected")
			}

			return ws
		} catch (error) {
			console.error("Error creating WebSocket connection:", error)
			return null
		}
	}
}

export const indexingApi = new IndexingApiService()
