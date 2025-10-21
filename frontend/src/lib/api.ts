import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios"

class ApiClient {
	private client: AxiosInstance

	constructor() {
		this.client = axios.create({
			baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
			timeout: 30000, // 30 seconds
			headers: {
				"Content-Type": "application/json",
			},
		})

		this.setupInterceptors()
	}

	private setupInterceptors() {
		// Request interceptor
		this.client.interceptors.request.use(
			(config) => {
				// Add auth token if available
				const token = localStorage.getItem("auth_token")
				if (token) {
					config.headers.Authorization = `Bearer ${token}`
				}

				console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)
				return config
			},
			(error) => {
				console.error("Request error:", error)
				return Promise.reject(error)
			},
		)

		// Response interceptor
		this.client.interceptors.response.use(
			(response: AxiosResponse) => {
				console.log(`Response from ${response.config.url}:`, response.status)
				return response
			},
			(error: AxiosError) => {
				console.error("Response error:", error.response?.data || error.message)

				// Handle common HTTP errors
				if (error.response?.status === 429) {
					// Handle rate limiting
					console.warn("Rate limit exceeded. Please try again later.")
				} else if (error.response?.status && error.response.status >= 500) {
					// Handle server errors
					console.error("Server error:", error.response.data)
				}

				return Promise.reject(error)
			},
		)
	}

	// HTTP Methods
	async get<T>(url: string, params?: any): Promise<AxiosResponse<T>> {
		return this.client.get<T>(url, { params })
	}

	async post<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
		return this.client.post<T>(url, data)
	}

	async put<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
		return this.client.put<T>(url, data)
	}

	async patch<T>(url: string, data?: any): Promise<AxiosResponse<T>> {
		return this.client.patch<T>(url, data)
	}

	async delete<T>(url: string): Promise<AxiosResponse<T>> {
		return this.client.delete<T>(url)
	}

	// Health check
	async healthCheck(): Promise<boolean> {
		try {
			const response = await this.client.get("/health")
			return response.status === 200
		} catch (error) {
			console.error("Health check failed:", error)
			return false
		}
	}

	// Set auth token
	setAuthToken(token: string) {
		localStorage.setItem("auth_token", token)
	}

	// Clear auth token
	clearAuthToken() {
		localStorage.removeItem("auth_token")
	}
}

export const apiClient = new ApiClient()
