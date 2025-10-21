import axios from "axios"
import {
	PullRequest,
	PullRequestDetails,
	PullRequestStats,
	PullRequestSearchFilters,
	PullRequestListResponse,
	PullRequestDetailsResponse,
	PullRequestStatsResponse,
	SyncResponse,
} from "@/types/pullRequest"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

// Create axios instance with default config
const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
	const token = localStorage.getItem("auth_token") || localStorage.getItem("authToken")
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// Handle auth errors
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem("authToken")
			window.location.href = "/auth/login"
		}
		return Promise.reject(error)
	},
)

export const pullRequestApi = {
	/**
	 * Get all pull requests for a repository
	 */
	async getPullRequests(
		repositoryIdOrAll: number | "all",
		filters?: {
			state?: string
			limit?: number
			offset?: number
			refresh?: boolean
		},
	): Promise<PullRequestListResponse> {
		const params = new URLSearchParams()

		if (filters?.state) params.append("state", filters.state)
		if (filters?.limit) params.append("limit", filters.limit.toString())
		if (filters?.offset) params.append("offset", filters.offset.toString())
		if (filters?.refresh) params.append("refresh", "true")

		const path =
			repositoryIdOrAll === "all"
				? `/pull-requests?${params.toString()}`
				: `/repositories/${repositoryIdOrAll}/pull-requests?${params.toString()}`

		// Debug log to verify query being called from the UI
		if (process.env.NODE_ENV !== "production") {
			// eslint-disable-next-line no-console
			console.log("[pullRequestApi] GET", `${API_BASE_URL}${path}`)
		}

		const response = await apiClient.get(path)
		return response.data
	},

	/**
	 * Get a specific pull request with full details
	 */
	async getPullRequestDetails(pullRequestId: number): Promise<PullRequestDetailsResponse> {
		const response = await apiClient.get(`/pull-requests/${pullRequestId}`)
		return response.data
	},

	/**
	 * Search pull requests with filters
	 */
	async searchPullRequests(
		repositoryId: number,
		filters: PullRequestSearchFilters,
	): Promise<PullRequestListResponse> {
		const params = new URLSearchParams()

		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				params.append(key, value.toString())
			}
		})

		const response = await apiClient.get(`/repositories/${repositoryId}/pull-requests/search?${params.toString()}`)
		return response.data
	},

	/**
	 * Sync all pull requests for a repository
	 */
	async syncPullRequests(repositoryId: number): Promise<SyncResponse> {
		const response = await apiClient.post(`/repositories/${repositoryId}/pull-requests/sync`)
		return response.data
	},

	/**
	 * Sync a specific pull request
	 */
	async syncPullRequest(repositoryId: number, pullNumber: number): Promise<SyncResponse> {
		const response = await apiClient.post(`/repositories/${repositoryId}/pull-requests/${pullNumber}/sync`)
		return response.data
	},

	/**
	 * Get pull request statistics for a repository
	 */
	async getPullRequestStats(repositoryId: number): Promise<PullRequestStatsResponse> {
		const response = await apiClient.get(`/repositories/${repositoryId}/pull-requests/stats`)
		return response.data
	},

	/**
	 * Get webhook events for a repository
	 */
	async getWebhookEvents(repositoryId: number, limit?: number, offset?: number): Promise<any> {
		const params = new URLSearchParams()

		if (limit) params.append("limit", limit.toString())
		if (offset) params.append("offset", offset.toString())

		const response = await apiClient.get(`/repositories/${repositoryId}/webhooks/events?${params.toString()}`)
		return response.data
	},

	/**
	 * Reprocess a webhook event
	 */
	async reprocessWebhookEvent(eventId: number): Promise<any> {
		const response = await apiClient.post(`/webhooks/events/${eventId}/reprocess`)
		return response.data
	},

	/**
	 * Test webhook endpoint
	 */
	async testWebhook(): Promise<any> {
		const response = await apiClient.get("/webhooks/test")
		return response.data
	},
}

export default pullRequestApi
