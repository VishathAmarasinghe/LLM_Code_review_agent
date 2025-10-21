"use client"

import { useEffect, useState, useCallback } from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { apiClient } from "@/lib/api"
import toast from "react-hot-toast"

interface SyncStatus {
	syncId: number
	status: "pending" | "in_progress" | "completed" | "failed" | "not_found"
	progress: number
	totalItems?: number
	processedItems?: number
	message?: string
	error?: string
	startedAt: string
	completedAt?: string
}

interface SyncProgressModalProps {
	isOpen: boolean
	onClose: () => void
	onSyncComplete: () => void
}

export function SyncProgressModal({ isOpen, onClose, onSyncComplete }: SyncProgressModalProps) {
	const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
	const [isPolling, setIsPolling] = useState(false)

	const startSync = useCallback(async () => {
		try {
			const response = await apiClient.post("/auth/sync-repos")

			if (
				response.data &&
				typeof response.data === "object" &&
				"success" in response.data &&
				response.data.success
			) {
				const data = (response.data as any).data
				setSyncStatus({
					syncId: data.syncId,
					status: data.status,
					progress: data.progress,
					message: data.message,
					startedAt: new Date().toISOString(),
				})
			} else {
				throw new Error("Failed to start sync")
			}
		} catch (error) {
			console.error("Error starting sync:", error)
			toast.error("Failed to start repository sync")
			onClose()
		}
	}, [onClose])

	const pollSyncStatus = useCallback(async () => {
		if (!syncStatus?.syncId) return

		try {
			const response = await apiClient.get("/auth/sync-status")

			if (
				response.data &&
				typeof response.data === "object" &&
				"success" in response.data &&
				response.data.success
			) {
				const data = (response.data as any).data

				if (data.status === "not_found") {
					setSyncStatus(null)
					setIsPolling(false)
					return
				}

				setSyncStatus({
					syncId: data.syncId,
					status: data.status,
					progress: data.progress,
					totalItems: data.totalItems,
					processedItems: data.processedItems,
					message: data.message,
					error: data.error,
					startedAt: data.startedAt,
					completedAt: data.completedAt,
				})

				// Handle completion
				if (data.status === "completed") {
					setIsPolling(false)
					toast.success(
						`${data.message || "Repository sync completed successfully!"} Refreshing repository list...`,
					)
					setTimeout(() => {
						onSyncComplete()
						onClose()
					}, 1000)
				} else if (data.status === "failed") {
					setIsPolling(false)
					toast.error(data.error || "Repository sync failed")
					setTimeout(onClose, 2000)
				}
			}
		} catch (error) {
			console.error("Error polling sync status:", error)
		}
	}, [syncStatus?.syncId, onSyncComplete, onClose])

	useEffect(() => {
		if (isOpen && !syncStatus) {
			startSync()
		}
	}, [isOpen, syncStatus, startSync])

	useEffect(() => {
		if (syncStatus && ["in_progress", "pending"].includes(syncStatus.status)) {
			setIsPolling(true)
			const interval = setInterval(pollSyncStatus, 2000) // Poll every 2 seconds
			return () => clearInterval(interval)
		} else {
			setIsPolling(false)
		}
	}, [syncStatus, pollSyncStatus])

	const cancelSync = async () => {
		try {
			await apiClient.post("/auth/cancel-sync")
			toast.success("Sync cancelled")
			onClose()
		} catch (error) {
			console.error("Error cancelling sync:", error)
			toast.error("Failed to cancel sync")
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "text-green-600 dark:text-green-400"
			case "failed":
				return "text-red-600 dark:text-red-400"
			case "in_progress":
				return "text-blue-600 dark:text-blue-400"
			default:
				return "text-gray-600 dark:text-gray-400"
		}
	}

	const getStatusIcon = (status: string) => {
		if (["in_progress", "pending"].includes(status)) {
			return <LoadingSpinner size="sm" className="mr-2" />
		}
		return null
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
				<div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Syncing Repositories</h3>
					{!isPolling && (
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
							<XMarkIcon className="w-5 h-5" />
						</button>
					)}
				</div>

				<div className="p-6">
					{syncStatus ? (
						<div className="space-y-4">
							{/* Status */}
							<div className="flex items-center">
								{getStatusIcon(syncStatus.status)}
								<span className={`font-medium ${getStatusColor(syncStatus.status)}`}>
									{syncStatus.status === "in_progress"
										? "Syncing..."
										: syncStatus.status === "completed"
											? "Completed"
											: syncStatus.status === "failed"
												? "Failed"
												: "Pending"}
								</span>
							</div>

							{/* Progress Bar */}
							{syncStatus.status === "in_progress" && (
								<div className="space-y-2">
									<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
										<span>Progress</span>
										<span>{syncStatus.progress}%</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
										<div
											className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
											style={{ width: `${syncStatus.progress}%` }}
										/>
									</div>
								</div>
							)}

							{/* Details */}
							<div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
								{syncStatus.message && <p>{syncStatus.message}</p>}

								{syncStatus.totalItems && (
									<p>
										{syncStatus.processedItems || 0} of {syncStatus.totalItems} repositories
										processed
									</p>
								)}

								{syncStatus.error && (
									<p className="text-red-600 dark:text-red-400">{syncStatus.error}</p>
								)}
							</div>

							{/* Actions */}
							<div className="flex justify-end space-x-3 pt-4">
								{isPolling && (
									<button
										onClick={cancelSync}
										className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
										Cancel
									</button>
								)}

								{!isPolling && (
									<button
										onClick={onClose}
										className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
										Close
									</button>
								)}
							</div>
						</div>
					) : (
						<div className="flex items-center justify-center py-8">
							<LoadingSpinner size="lg" />
							<span className="ml-3 text-gray-600 dark:text-gray-400">Starting sync...</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
