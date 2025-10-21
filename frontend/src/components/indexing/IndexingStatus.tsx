"use client"

import { IndexingJob } from "../../types/indexing"

interface IndexingStatusProps {
	job: IndexingJob | null
	isIndexing: boolean
	isCompleted: boolean
	isFailed: boolean
}

export function IndexingStatus({ job, isIndexing, isCompleted, isFailed }: IndexingStatusProps) {
	if (!job) {
		return (
			<div className="text-center py-8">
				<div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
					<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
				</div>
				<h3 className="text-lg font-medium text-gray-900 mb-2">No Indexing History</h3>
				<p className="text-gray-500">This repository has not been indexed yet.</p>
			</div>
		)
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800"
			case "running":
				return "bg-blue-100 text-blue-800"
			case "failed":
				return "bg-red-100 text-red-800"
			case "cancelled":
				return "bg-yellow-100 text-yellow-800"
			case "pending":
				return "bg-gray-100 text-gray-800"
			default:
				return "bg-gray-100 text-gray-800"
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "completed":
				return (
					<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clipRule="evenodd"
						/>
					</svg>
				)
			case "running":
				return (
					<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"></circle>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				)
			case "failed":
				return (
					<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clipRule="evenodd"
						/>
					</svg>
				)
			case "cancelled":
				return (
					<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clipRule="evenodd"
						/>
					</svg>
				)
			default:
				return (
					<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
							clipRule="evenodd"
						/>
					</svg>
				)
		}
	}

	const formatDate = (date: Date | string) => {
		return new Date(date).toLocaleString()
	}

	const formatDuration = (startedAt: Date | string, completedAt?: Date | string) => {
		const start = new Date(startedAt)
		const end = completedAt ? new Date(completedAt) : new Date()
		const duration = end.getTime() - start.getTime()

		const seconds = Math.floor(duration / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`
		} else {
			return `${seconds}s`
		}
	}

	return (
		<div className="space-y-6">
			{/* Status Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<span
						className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
						{getStatusIcon(job.status)}
						<span className="ml-2 capitalize">{job.status}</span>
					</span>
					{job.stage && (
						<span className="text-sm text-gray-500">
							Stage: <span className="font-medium capitalize">{job.stage}</span>
						</span>
					)}
					{isIndexing && (
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
							<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
							Live
						</span>
					)}
				</div>
				<div className="text-sm text-gray-500">Job #{job.id}</div>
			</div>

			{/* Progress Bar */}
			{isIndexing && (
				<div className="space-y-2">
					<div className="flex justify-between text-sm text-gray-600">
						<span>Progress: {job.progress ?? 0}%</span>
						<span>
							Stage: {job.stage ? job.stage.charAt(0).toUpperCase() + job.stage.slice(1) : "Unknown"}
						</span>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-3">
						<div
							className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
							style={{ width: `${job.progress ?? 0}%` }}
						/>
					</div>
				</div>
			)}

			{/* Stage Progress */}
			{isIndexing && job.stage && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-sm font-medium text-blue-900">Current Stage</h3>
						<span className="text-sm text-blue-700 capitalize">{job.stage}</span>
					</div>
					<div className="flex space-x-2">
						{["initializing", "scanning", "parsing", "embedding", "storing", "completed"].map(
							(stage, index) => {
								const isActive = job.stage === stage
								const isCompleted =
									["initializing", "scanning", "parsing", "embedding", "storing"].indexOf(
										job.stage || "",
									) > index
								return (
									<div key={stage} className="flex items-center">
										<div
											className={`w-3 h-3 rounded-full ${
												isActive
													? "bg-blue-600 animate-pulse"
													: isCompleted
														? "bg-green-500"
														: "bg-gray-300"
											}`}
										/>
										{index < 5 && (
											<div
												className={`w-8 h-0.5 mx-1 ${
													isCompleted ? "bg-green-500" : "bg-gray-300"
												}`}
											/>
										)}
									</div>
								)
							},
						)}
					</div>
				</div>
			)}

			{/* Job Details */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-gray-50 rounded-lg p-4">
					<div className="text-sm font-medium text-gray-500">Progress</div>
					<div className="text-2xl font-bold text-gray-900">{job.progress ?? 0}%</div>
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<div className="text-sm font-medium text-gray-500">Files Processed</div>
					<div className="text-2xl font-bold text-gray-900">
						{(job.processedFiles ?? 0).toLocaleString()}
						{(job.totalFiles ?? 0) > 0 && (
							<span className="text-sm text-gray-500"> / {(job.totalFiles ?? 0).toLocaleString()}</span>
						)}
					</div>
					{(job.totalFiles ?? 0) > 0 && (
						<div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
							<div
								className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
								style={{ width: `${((job.processedFiles ?? 0) / (job.totalFiles ?? 1)) * 100}%` }}
							/>
						</div>
					)}
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<div className="text-sm font-medium text-gray-500">Blocks Indexed</div>
					<div className="text-2xl font-bold text-gray-900">
						{(job.indexedBlocks ?? 0).toLocaleString()}
						{(job.totalBlocks ?? 0) > 0 && (
							<span className="text-sm text-gray-500"> / {(job.totalBlocks ?? 0).toLocaleString()}</span>
						)}
					</div>
					{(job.totalBlocks ?? 0) > 0 && (
						<div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
							<div
								className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
								style={{ width: `${((job.indexedBlocks ?? 0) / (job.totalBlocks ?? 1)) * 100}%` }}
							/>
						</div>
					)}
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<div className="text-sm font-medium text-gray-500">Duration</div>
					<div className="text-2xl font-bold text-gray-900">
						{formatDuration(job.startedAt, job.completedAt)}
					</div>
				</div>
			</div>

			{/* Message */}
			{job.message && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex">
						<div className="flex-shrink-0">
							<svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm text-blue-700">{job.message}</p>
						</div>
					</div>
				</div>
			)}

			{/* Error Message */}
			{job.error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4">
					<div className="flex">
						<div className="flex-shrink-0">
							<svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm text-red-700">{job.error}</p>
						</div>
					</div>
				</div>
			)}

			{/* Timestamps */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
				<div>
					<span className="font-medium">Started:</span> {formatDate(job.startedAt)}
				</div>
				{job.completedAt && (
					<div>
						<span className="font-medium">Completed:</span> {formatDate(job.completedAt)}
					</div>
				)}
			</div>
		</div>
	)
}
