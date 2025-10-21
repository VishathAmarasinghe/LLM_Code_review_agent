import { useState, useCallback } from "react"
import { toast } from "react-hot-toast"
import { CodeReviewRequest, CodeReviewResponse, ApiResponse } from "@/types/codeReview"
import { apiClient } from "@/lib/api"

export const useCodeReview = () => {
	const [reviewResult, setReviewResult] = useState<CodeReviewResponse | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const analyzeCode = useCallback(async (request: CodeReviewRequest) => {
		setIsLoading(true)
		setError(null)

		try {
			const response = await apiClient.post<ApiResponse<CodeReviewResponse>>("/code-review/analyze", request)

			if (response.data.success && response.data.data) {
				setReviewResult(response.data.data)
				toast.success("Code analysis completed successfully!")
			} else {
				throw new Error(response.data.error || "Analysis failed")
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
			setError(errorMessage)
			toast.error(errorMessage)
			console.error("Code review error:", err)
		} finally {
			setIsLoading(false)
		}
	}, [])

	const createReview = useCallback(async (request: CodeReviewRequest): Promise<CodeReviewResponse | null> => {
		setIsLoading(true)
		setError(null)

		try {
			const response = await apiClient.post<ApiResponse<CodeReviewResponse>>("/code-review/reviews", request)

			if (response.data.success && response.data.data) {
				setReviewResult(response.data.data)
				toast.success("Review saved successfully!")
				return response.data.data
			} else {
				throw new Error(response.data.error || "Failed to create review")
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
			setError(errorMessage)
			toast.error(errorMessage)
			console.error("Create review error:", err)
			return null
		} finally {
			setIsLoading(false)
		}
	}, [])

	const getReview = useCallback(async (id: string): Promise<CodeReviewResponse | null> => {
		setIsLoading(true)
		setError(null)

		try {
			const response = await apiClient.get<ApiResponse<CodeReviewResponse>>(`/code-review/reviews/${id}`)

			if (response.data.success && response.data.data) {
				setReviewResult(response.data.data)
				return response.data.data
			} else {
				throw new Error(response.data.error || "Review not found")
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
			setError(errorMessage)
			toast.error(errorMessage)
			console.error("Get review error:", err)
			return null
		} finally {
			setIsLoading(false)
		}
	}, [])

	const clearResults = useCallback(() => {
		setReviewResult(null)
		setError(null)
	}, [])

	const clearError = useCallback(() => {
		setError(null)
	}, [])

	return {
		reviewResult,
		isLoading,
		error,
		analyzeCode,
		createReview,
		getReview,
		clearResults,
		clearError,
	}
}
