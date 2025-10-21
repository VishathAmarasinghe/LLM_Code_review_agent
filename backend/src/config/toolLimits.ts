import { ToolLimits } from "./types"
import { logger } from "../utils/logger"

export class ToolLimitsManager {
	private static instance: ToolLimitsManager
	private toolLimits: ToolLimits
	private requestCounts = new Map<string, { count: number; resetTime: number }>()
	private activeRequests = new Set<string>()

	private constructor() {
		this.toolLimits = this.getDefaultToolLimits()
	}

	public static getInstance(): ToolLimitsManager {
		if (!ToolLimitsManager.instance) {
			ToolLimitsManager.instance = new ToolLimitsManager()
		}
		return ToolLimitsManager.instance
	}

	/**
	 * Get default tool limits
	 */
	private getDefaultToolLimits(): ToolLimits {
		return {
			// Rate limiting
			maxRequestsPerMinute: 60,
			maxRequestsPerHour: 1000,
			maxConcurrentRequests: 10,

			// Resource constraints
			maxFileSize: 10 * 1024 * 1024, // 10MB
			maxFilesPerRequest: 100,
			maxSearchResults: 1000,
			maxDirectoryDepth: 10,

			// Memory limits
			maxCacheSize: 100 * 1024 * 1024, // 100MB
			maxMemoryUsage: 500 * 1024 * 1024, // 500MB

			// Timeout limits
			requestTimeout: 300000, // 5 minutes (increased for code reviews)
			toolExecutionTimeout: 300000, // 5 minutes (increased for code reviews)
			cacheTimeout: 300000, // 5 minutes
		}
	}

	/**
	 * Check if a request is within rate limits
	 */
	public async checkRateLimit(
		userId: string,
		toolName: string,
	): Promise<{ allowed: boolean; waitTime?: number; reason?: string }> {
		const now = Date.now()
		const key = `${userId}:${toolName}`

		// Check minute limit
		const minuteKey = `${key}:minute:${Math.floor(now / 60000)}`
		const minuteCount = this.requestCounts.get(minuteKey) || { count: 0, resetTime: now + 60000 }

		if (minuteCount.count >= this.toolLimits.maxRequestsPerMinute) {
			const waitTime = minuteCount.resetTime - now
			return {
				allowed: false,
				waitTime: Math.max(0, waitTime),
				reason: `Rate limit exceeded: ${this.toolLimits.maxRequestsPerMinute} requests per minute`,
			}
		}

		// Check hour limit
		const hourKey = `${key}:hour:${Math.floor(now / 3600000)}`
		const hourCount = this.requestCounts.get(hourKey) || { count: 0, resetTime: now + 3600000 }

		if (hourCount.count >= this.toolLimits.maxRequestsPerHour) {
			const waitTime = hourCount.resetTime - now
			return {
				allowed: false,
				waitTime: Math.max(0, waitTime),
				reason: `Rate limit exceeded: ${this.toolLimits.maxRequestsPerHour} requests per hour`,
			}
		}

		// Check concurrent requests
		if (this.activeRequests.size >= this.toolLimits.maxConcurrentRequests) {
			return {
				allowed: false,
				reason: `Too many concurrent requests: ${this.toolLimits.maxConcurrentRequests}`,
			}
		}

		return { allowed: true }
	}

	/**
	 * Record a request
	 */
	public recordRequest(userId: string, toolName: string): void {
		const now = Date.now()
		const key = `${userId}:${toolName}`

		// Increment minute count
		const minuteKey = `${key}:minute:${Math.floor(now / 60000)}`
		const minuteCount = this.requestCounts.get(minuteKey) || { count: 0, resetTime: now + 60000 }
		minuteCount.count++
		this.requestCounts.set(minuteKey, minuteCount)

		// Increment hour count
		const hourKey = `${key}:hour:${Math.floor(now / 3600000)}`
		const hourCount = this.requestCounts.get(hourKey) || { count: 0, resetTime: now + 3600000 }
		hourCount.count++
		this.requestCounts.set(hourKey, hourCount)

		// Add to active requests
		this.activeRequests.add(key)

		// Clean up old entries
		this.cleanupOldEntries(now)
	}

	/**
	 * Complete a request
	 */
	public completeRequest(userId: string, toolName: string): void {
		const key = `${userId}:${toolName}`
		this.activeRequests.delete(key)
	}

	/**
	 * Check file size limit
	 */
	public checkFileSizeLimit(fileSize: number): { allowed: boolean; reason?: string } {
		if (fileSize > this.toolLimits.maxFileSize) {
			return {
				allowed: false,
				reason: `File size ${fileSize} bytes exceeds limit ${this.toolLimits.maxFileSize} bytes`,
			}
		}
		return { allowed: true }
	}

	/**
	 * Check files per request limit
	 */
	public checkFilesPerRequestLimit(fileCount: number): { allowed: boolean; reason?: string } {
		if (fileCount > this.toolLimits.maxFilesPerRequest) {
			return {
				allowed: false,
				reason: `Request for ${fileCount} files exceeds limit ${this.toolLimits.maxFilesPerRequest} files`,
			}
		}
		return { allowed: true }
	}

	/**
	 * Check search results limit
	 */
	public checkSearchResultsLimit(resultCount: number): { allowed: boolean; reason?: string } {
		if (resultCount > this.toolLimits.maxSearchResults) {
			return {
				allowed: false,
				reason: `Search returned ${resultCount} results, exceeds limit ${this.toolLimits.maxSearchResults}`,
			}
		}
		return { allowed: true }
	}

	/**
	 * Check directory depth limit
	 */
	public checkDirectoryDepthLimit(depth: number): { allowed: boolean; reason?: string } {
		if (depth > this.toolLimits.maxDirectoryDepth) {
			return {
				allowed: false,
				reason: `Directory depth ${depth} exceeds limit ${this.toolLimits.maxDirectoryDepth}`,
			}
		}
		return { allowed: true }
	}

	/**
	 * Check memory usage
	 */
	public checkMemoryUsage(currentUsage: number): { allowed: boolean; reason?: string } {
		if (currentUsage > this.toolLimits.maxMemoryUsage) {
			return {
				allowed: false,
				reason: `Memory usage ${currentUsage} bytes exceeds limit ${this.toolLimits.maxMemoryUsage} bytes`,
			}
		}
		return { allowed: true }
	}

	/**
	 * Check cache size
	 */
	public checkCacheSize(currentSize: number): { allowed: boolean; reason?: string } {
		if (currentSize > this.toolLimits.maxCacheSize) {
			return {
				allowed: false,
				reason: `Cache size ${currentSize} bytes exceeds limit ${this.toolLimits.maxCacheSize} bytes`,
			}
		}
		return { allowed: true }
	}

	/**
	 * Get request timeout
	 */
	public getRequestTimeout(): number {
		return this.toolLimits.requestTimeout
	}

	/**
	 * Get tool execution timeout
	 */
	public getToolExecutionTimeout(): number {
		return this.toolLimits.toolExecutionTimeout
	}

	/**
	 * Get cache timeout
	 */
	public getCacheTimeout(): number {
		return this.toolLimits.cacheTimeout
	}

	/**
	 * Update tool limits
	 */
	public updateToolLimits(limits: Partial<ToolLimits>): void {
		this.toolLimits = { ...this.toolLimits, ...limits }
		logger.info("Tool limits updated", { limits })
	}

	/**
	 * Get all tool limits
	 */
	public getToolLimits(): ToolLimits {
		return { ...this.toolLimits }
	}

	/**
	 * Reset to default limits
	 */
	public resetToDefaults(): void {
		this.toolLimits = this.getDefaultToolLimits()
		this.requestCounts.clear()
		this.activeRequests.clear()
		logger.info("Tool limits reset to defaults")
	}

	/**
	 * Get current usage statistics
	 */
	public getUsageStats(): {
		activeRequests: number
		totalRequests: number
		requestCounts: Map<string, { count: number; resetTime: number }>
	} {
		return {
			activeRequests: this.activeRequests.size,
			totalRequests: Array.from(this.requestCounts.values()).reduce((sum, entry) => sum + entry.count, 0),
			requestCounts: new Map(this.requestCounts),
		}
	}

	/**
	 * Clean up old request count entries
	 */
	private cleanupOldEntries(now: number): void {
		const cutoffTime = now - 3600000 // 1 hour ago

		for (const [key, entry] of this.requestCounts.entries()) {
			if (entry.resetTime < cutoffTime) {
				this.requestCounts.delete(key)
			}
		}
	}

	/**
	 * Get rate limit status for a user
	 */
	public getRateLimitStatus(
		userId: string,
		toolName: string,
	): {
		minuteCount: number
		hourCount: number
		activeRequests: number
		limits: {
			maxRequestsPerMinute: number
			maxRequestsPerHour: number
			maxConcurrentRequests: number
		}
	} {
		const now = Date.now()
		const key = `${userId}:${toolName}`

		const minuteKey = `${key}:minute:${Math.floor(now / 60000)}`
		const minuteCount = this.requestCounts.get(minuteKey)?.count || 0

		const hourKey = `${key}:hour:${Math.floor(now / 3600000)}`
		const hourCount = this.requestCounts.get(hourKey)?.count || 0

		return {
			minuteCount,
			hourCount,
			activeRequests: this.activeRequests.size,
			limits: {
				maxRequestsPerMinute: this.toolLimits.maxRequestsPerMinute,
				maxRequestsPerHour: this.toolLimits.maxRequestsPerHour,
				maxConcurrentRequests: this.toolLimits.maxConcurrentRequests,
			},
		}
	}
}
