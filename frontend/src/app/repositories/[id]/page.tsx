"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "../../../contexts/AuthContext"
import { useIndexing } from "../../../hooks/useIndexing"
import { Repository } from "../../../types/indexing"
import { indexingApi } from "../../../lib/indexingApi"
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner"
import { IndexingStatus } from "../../../components/indexing/IndexingStatus"
import { IndexingProgress } from "../../../components/indexing/IndexingProgress"
import { RepositoryHeader } from "../../../components/repository/RepositoryHeader"
import { RepositoryStats } from "../../../components/repository/RepositoryStats"
import { CodeSearch } from "../../../components/indexing/CodeSearch"
import { ReindexButton } from "../../../components/indexing/ReindexButton"

export default function RepositoryDetailsPage() {
	const params = useParams()
	const { user } = useAuth()
	const repositoryId = parseInt(params.id as string)

	const [repository, setRepository] = useState<Repository | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const {
		indexingJob,
		progress,
		isIndexing,
		isCompleted,
		isFailed,
		startIndexing,
		stopIndexing,
		reindexRepository,
		searchCode,
		loadIndexingStatus,
	} = useIndexing({
		repositoryId,
		userId: user?.id ? parseInt(user.id.toString()) : undefined,
		autoRefresh: true,
	})

	// Load repository details
	useEffect(() => {
		const loadRepository = async () => {
			if (!user?.id) return

			try {
				setIsLoading(true)
				setError(null)

				const repo = await indexingApi.getRepository(repositoryId, parseInt(user.id.toString()))
				if (!repo) {
					setError("Repository not found")
					return
				}

				setRepository(repo)
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load repository")
			} finally {
				setIsLoading(false)
			}
		}

		loadRepository()
	}, [repositoryId, user?.id])

	const handleStartIndexing = async () => {
		try {
			await startIndexing()
		} catch (err) {
			console.error("Failed to start indexing:", err)
		}
	}

	const handleReindex = async () => {
		try {
			await reindexRepository()
		} catch (err) {
			console.error("Failed to reindex repository:", err)
		}
	}

	const handleStopIndexing = async () => {
		try {
			await stopIndexing()
		} catch (err) {
			console.error("Failed to stop indexing:", err)
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<LoadingSpinner size="lg" />
			</div>
		)
	}

	if (error || !repository) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900 mb-4">Repository Not Found</h1>
					<p className="text-gray-600 mb-4">{error || "The requested repository could not be found."}</p>
					<button
						onClick={() => window.history.back()}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
						Go Back
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Repository Header */}
				<RepositoryHeader repository={repository} />

				{/* Repository Stats */}
				<RepositoryStats repository={repository} />

				{/* Indexing Section */}
				<div className="mt-8">
					<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-xl font-semibold text-gray-900">Code Indexing</h2>
							<div className="flex space-x-3">
								{!isIndexing && !isCompleted && (
									<button
										onClick={handleStartIndexing}
										className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
										Start Indexing
									</button>
								)}
								{isIndexing && (
									<button
										onClick={handleStopIndexing}
										className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
										Stop Indexing
									</button>
								)}
								{(isCompleted || isFailed) && (
									<ReindexButton
										repositoryId={repositoryId}
										userId={user?.id ? parseInt(user.id.toString()) : 0}
										onReindex={handleReindex}
										isIndexing={isIndexing}
										disabled={!user?.id}
									/>
								)}
								<button
									onClick={loadIndexingStatus}
									className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
									Refresh
								</button>
							</div>
						</div>

						{/* Indexing Status */}
						<IndexingStatus
							job={indexingJob}
							isIndexing={isIndexing}
							isCompleted={isCompleted}
							isFailed={isFailed}
						/>

						{/* Progress Display */}
						{isIndexing && progress && <IndexingProgress progress={progress} />}
					</div>
				</div>

				{/* Code Search Section */}
				{isCompleted && (
					<div className="mt-8">
						<CodeSearch repositoryId={repositoryId} onSearch={searchCode} />
					</div>
				)}
			</div>
		</div>
	)
}
