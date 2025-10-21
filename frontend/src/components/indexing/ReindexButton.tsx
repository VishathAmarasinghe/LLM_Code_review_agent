"use client"

import { useState } from "react"
import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline"
import { IndexingJobOptions } from "../../types/indexing"

interface ReindexButtonProps {
	repositoryId: number
	userId: number
	onReindex: (options?: IndexingJobOptions) => Promise<void>
	isIndexing: boolean
	disabled?: boolean
	className?: string
}

export function ReindexButton({
	repositoryId,
	userId,
	onReindex,
	isIndexing,
	disabled = false,
	className = "",
}: ReindexButtonProps) {
	const [isReindexing, setIsReindexing] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)

	const handleReindex = async () => {
		if (showConfirm) {
			try {
				setIsReindexing(true)
				await onReindex()
				setShowConfirm(false)
			} catch (error) {
				console.error("Reindexing failed:", error)
			} finally {
				setIsReindexing(false)
			}
		} else {
			setShowConfirm(true)
		}
	}

	const handleCancel = () => {
		setShowConfirm(false)
	}

	if (showConfirm) {
		return (
			<div className={`flex items-center space-x-2 ${className}`}>
				<div className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
					<ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
					<span className="text-sm text-yellow-800 font-medium">Clear existing index?</span>
				</div>
				<button
					onClick={handleReindex}
					disabled={isReindexing || disabled}
					className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
					{isReindexing ? (
						<>
							<ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
							Reindexing...
						</>
					) : (
						"Yes, Reindex"
					)}
				</button>
				<button
					onClick={handleCancel}
					disabled={isReindexing}
					className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
					Cancel
				</button>
			</div>
		)
	}

	return (
		<button
			onClick={handleReindex}
			disabled={isIndexing || disabled || isReindexing}
			className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
			title="Clear existing index and create a new one">
			<ArrowPathIcon className="w-4 h-4 mr-2" />
			{isReindexing ? "Reindexing..." : "Reindex"}
		</button>
	)
}
