import { useState, useEffect, useCallback, useRef } from "react"
import { indexingApi } from "../lib/indexingApi"
import {
	IndexingJob,
	IndexingProgress,
	IndexingConfiguration,
	SearchResult,
	IndexingJobOptions,
	Repository,
} from "../types/indexing"

export interface UseIndexingOptions {
	repositoryId?: number
	userId?: number
	autoRefresh?: boolean
	refreshInterval?: number
}

export function useIndexing(options: UseIndexingOptions = {}) {
	const { repositoryId, userId, autoRefresh = true, refreshInterval = 5000 } = options

	const [indexingJob, setIndexingJob] = useState<IndexingJob | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [progress, setProgress] = useState<IndexingProgress | null>(null)
	const [configuration, setConfiguration] = useState<IndexingConfiguration | null>(null)

	const wsRef = useRef<WebSocket | null>(null)
	const intervalRef = useRef<NodeJS.Timeout | null>(null)

	// Load indexing status with debouncing
	const loadIndexingStatus = useCallback(async () => {
		if (!repositoryId || !userId) return

		try {
			setIsLoading(true)
			setError(null)

			const job = await indexingApi.getIndexingStatus(repositoryId, userId)
			setIndexingJob(job)

			if (job) {
				setProgress({
					jobId: job.id,
					status: job.status,
					progress: job.progress,
					processedFiles: job.processedFiles,
					totalFiles: job.totalFiles,
					indexedBlocks: job.indexedBlocks,
					totalBlocks: job.totalBlocks,
					stage: job.stage,
					message: job.message,
					error: job.error,
					currentFile: undefined,
				})
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to load indexing status"
			setError(errorMessage)

			// Don't show error for rate limiting, just log it
			if (errorMessage.includes("Rate limit exceeded")) {
				console.warn("Rate limit exceeded while loading indexing status")
				setError(null) // Clear error for rate limiting
			}
		} finally {
			setIsLoading(false)
		}
	}, [repositoryId, userId])

	// Load configuration
	const loadConfiguration = useCallback(async () => {
		if (!userId) return

		try {
			const config = await indexingApi.getIndexingConfiguration(userId)
			setConfiguration(config)
		} catch (err) {
			console.error("Failed to load configuration:", err)
		}
	}, [userId])

	// Start indexing
	const startIndexing = useCallback(
		async (options?: IndexingJobOptions) => {
			if (!repositoryId || !userId) {
				throw new Error("Repository ID and User ID are required")
			}

			try {
				setIsLoading(true)
				setError(null)

				const job = await indexingApi.startIndexing(repositoryId, userId, options)
				setIndexingJob(job)

				setProgress({
					jobId: job.id,
					status: job.status,
					progress: job.progress,
					processedFiles: job.processedFiles,
					totalFiles: job.totalFiles,
					indexedBlocks: job.indexedBlocks,
					totalBlocks: job.totalBlocks,
					stage: job.stage,
					message: job.message,
					error: job.error,
				})

				return job
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to start indexing"
				setError(errorMessage)
				throw new Error(errorMessage)
			} finally {
				setIsLoading(false)
			}
		},
		[repositoryId, userId],
	)

	// Stop indexing
	const stopIndexing = useCallback(async () => {
		if (!repositoryId || !userId) return false

		try {
			const success = await indexingApi.stopIndexing(repositoryId, userId)

			if (success) {
				// Update local state
				setIndexingJob((prev) => (prev ? { ...prev, status: "cancelled" } : null))
				setProgress((prev) => (prev ? { ...prev, status: "cancelled" } : null))
			}

			return success
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to stop indexing")
			return false
		}
	}, [repositoryId, userId])

	// Reindex repository
	const reindexRepository = useCallback(
		async (options?: IndexingJobOptions) => {
			if (!repositoryId || !userId) {
				throw new Error("Repository ID and User ID are required")
			}

			try {
				setIsLoading(true)
				setError(null)

				const job = await indexingApi.reindexRepository(repositoryId, userId, options)
				setIndexingJob(job)

				setProgress({
					jobId: job.id,
					status: job.status,
					progress: job.progress,
					processedFiles: job.processedFiles,
					totalFiles: job.totalFiles,
					indexedBlocks: job.indexedBlocks,
					totalBlocks: job.totalBlocks,
					stage: job.stage,
					message: job.message,
					error: job.error,
				})

				return job
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "Failed to reindex repository"
				setError(errorMessage)
				throw new Error(errorMessage)
			} finally {
				setIsLoading(false)
			}
		},
		[repositoryId, userId],
	)

	// Search code
	const searchCode = useCallback(
		async (query: string, limit: number = 50): Promise<SearchResult[]> => {
			if (!repositoryId || !userId) return []

			try {
				return await indexingApi.searchCode(query, repositoryId, userId, limit)
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to search code")
				return []
			}
		},
		[repositoryId, userId],
	)

	// Setup WebSocket for real-time updates
	const setupWebSocket = useCallback(() => {
		if (!repositoryId || !userId || wsRef.current) return

		const ws = indexingApi.createProgressWebSocket(repositoryId, userId)
		if (!ws) return

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data)
				if (data.type === "progress") {
					setProgress(data.progress)
				} else if (data.type === "job_update") {
					setIndexingJob(data.job)
				}
			} catch (err) {
				console.error("Error parsing WebSocket message:", err)
			}
		}

		wsRef.current = ws
	}, [repositoryId, userId])

	// Cleanup WebSocket
	const cleanupWebSocket = useCallback(() => {
		if (wsRef.current) {
			wsRef.current.close()
			wsRef.current = null
		}
	}, [])

	// Setup polling for progress updates
	const setupPolling = useCallback(() => {
		if (!autoRefresh || intervalRef.current) return

		intervalRef.current = setInterval(() => {
			if (indexingJob?.status === "running") {
				loadIndexingStatus()
			}
		}, refreshInterval)
	}, [autoRefresh, indexingJob?.status, loadIndexingStatus, refreshInterval])

	// Cleanup polling
	const cleanupPolling = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
	}, [])

	// Initialize - only load status if we have valid IDs
	useEffect(() => {
		if (repositoryId && userId) {
			loadIndexingStatus()
			loadConfiguration()
		}
	}, [repositoryId, userId, loadIndexingStatus, loadConfiguration])

	// Setup real-time updates
	useEffect(() => {
		if (indexingJob?.status === "running") {
			setupWebSocket()
			setupPolling()
		} else {
			cleanupWebSocket()
			cleanupPolling()
		}

		return () => {
			cleanupWebSocket()
			cleanupPolling()
		}
	}, [indexingJob?.status, setupWebSocket, setupPolling, cleanupWebSocket, cleanupPolling])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cleanupWebSocket()
			cleanupPolling()
		}
	}, [cleanupWebSocket, cleanupPolling])

	return {
		// State
		indexingJob,
		progress,
		configuration,
		isLoading,
		error,

		// Actions
		startIndexing,
		stopIndexing,
		reindexRepository,
		searchCode,
		loadIndexingStatus,
		loadConfiguration,

		// Computed
		isIndexing: indexingJob?.status === "running",
		isCompleted: indexingJob?.status === "completed",
		isFailed: indexingJob?.status === "failed",
		isCancelled: indexingJob?.status === "cancelled",
		isPending: indexingJob?.status === "pending",

		// Progress helpers
		progressPercentage: progress?.progress || 0,
		filesProgress: progress ? `${progress.processedFiles}/${progress.totalFiles}` : "0/0",
		blocksProgress: progress ? `${progress.indexedBlocks}/${progress.totalBlocks}` : "0/0",
		currentStage: progress?.stage || "initializing",
		currentMessage: progress?.message || "",
		currentFile: progress?.currentFile || "",
	}
}
