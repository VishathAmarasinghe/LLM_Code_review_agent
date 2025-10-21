"use client"

import { IndexingProgress as IndexingProgressType } from "../../types/indexing"

interface IndexingProgressProps {
	progress: IndexingProgressType
}

export function IndexingProgress({ progress }: IndexingProgressProps) {
	const getStageColor = (stage: string) => {
		switch (stage) {
			case "initializing":
				return "bg-gray-500"
			case "scanning":
				return "bg-blue-500"
			case "parsing":
				return "bg-yellow-500"
			case "embedding":
				return "bg-purple-500"
			case "storing":
				return "bg-green-500"
			case "completed":
				return "bg-green-600"
			default:
				return "bg-gray-500"
		}
	}

	const getStageIcon = (stage: string) => {
		switch (stage) {
			case "initializing":
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				)
			case "scanning":
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				)
			case "parsing":
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
						/>
					</svg>
				)
			case "embedding":
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
						/>
					</svg>
				)
			case "storing":
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
						/>
					</svg>
				)
			case "completed":
				return (
					<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clipRule="evenodd"
						/>
					</svg>
				)
			default:
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				)
		}
	}

	const stages = [
		{ key: "initializing", label: "Initializing", description: "Setting up services and configuration" },
		{ key: "scanning", label: "Scanning", description: "Discovering files in repository" },
		{ key: "parsing", label: "Parsing", description: "Analyzing code structure and blocks" },
		{ key: "embedding", label: "Embedding", description: "Generating vector embeddings" },
		{ key: "storing", label: "Storing", description: "Saving to vector database" },
		{ key: "completed", label: "Completed", description: "Indexing finished successfully" },
	]

	const currentStageIndex = stages.findIndex((stage) => stage.key === progress.stage)
	const isCurrentStage = (stageIndex: number) => stageIndex === currentStageIndex
	const isCompletedStage = (stageIndex: number) => stageIndex < currentStageIndex
	const isPendingStage = (stageIndex: number) => stageIndex > currentStageIndex

	return (
		<div className="space-y-6">
			{/* Progress Header */}
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium text-gray-900">Indexing Progress</h3>
				<div className="text-sm text-gray-500">{progress.progress}% Complete</div>
			</div>

			{/* Progress Bar */}
			<div className="w-full bg-gray-200 rounded-full h-3">
				<div
					className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
					style={{ width: `${progress.progress}%` }}
				/>
			</div>

			{/* Stage Progress */}
			<div className="space-y-4">
				{stages.map((stage, index) => {
					const isCurrent = isCurrentStage(index)
					const isCompleted = isCompletedStage(index)
					const isPending = isPendingStage(index)

					return (
						<div key={stage.key} className="flex items-center space-x-4">
							{/* Stage Icon */}
							<div
								className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
									isCompleted
										? "bg-green-100 text-green-600"
										: isCurrent
											? `${getStageColor(stage.key)} text-white`
											: "bg-gray-100 text-gray-400"
								}`}>
								{isCompleted ? (
									<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
								) : (
									getStageIcon(stage.key)
								)}
							</div>

							{/* Stage Content */}
							<div className="flex-1 min-w-0">
								<div
									className={`text-sm font-medium ${
										isCurrent ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"
									}`}>
									{stage.label}
									{isCurrent && (
										<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
											Current
										</span>
									)}
								</div>
								<div className="text-sm text-gray-500">{stage.description}</div>
							</div>

							{/* Progress Indicator */}
							{isCurrent && (
								<div className="flex-shrink-0">
									<div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
								</div>
							)}
						</div>
					)
				})}
			</div>

			{/* Current File */}
			{progress.currentFile && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<svg
								className="h-5 w-5 text-blue-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<p className="text-sm font-medium text-blue-800">Currently Processing</p>
							<p className="text-sm text-blue-600">{progress.currentFile}</p>
						</div>
					</div>
				</div>
			)}

			{/* Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-gray-50 rounded-lg p-4">
					<div className="text-sm font-medium text-gray-500">Files Processed</div>
					<div className="text-2xl font-bold text-gray-900">
						{progress.processedFiles.toLocaleString()}
						{progress.totalFiles > 0 && (
							<span className="text-sm text-gray-500"> / {progress.totalFiles.toLocaleString()}</span>
						)}
					</div>
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<div className="text-sm font-medium text-gray-500">Blocks Indexed</div>
					<div className="text-2xl font-bold text-gray-900">
						{progress.indexedBlocks.toLocaleString()}
						{progress.totalBlocks > 0 && (
							<span className="text-sm text-gray-500"> / {progress.totalBlocks.toLocaleString()}</span>
						)}
					</div>
				</div>

				<div className="bg-gray-50 rounded-lg p-4">
					<div className="text-sm font-medium text-gray-500">Progress</div>
					<div className="text-2xl font-bold text-gray-900">{progress.progress}%</div>
				</div>
			</div>

			{/* Message */}
			{progress.message && (
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
							<p className="text-sm text-blue-700">{progress.message}</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
