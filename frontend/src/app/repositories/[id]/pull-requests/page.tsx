"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import { PullRequestList } from "@/components/pullRequest/PullRequestList"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { githubApi } from "@/lib/api"

interface Repository {
	id: number
	name: string
	fullName: string
	ownerLogin: string
	description?: string
	language?: string
	starsCount: number
	forksCount: number
	htmlUrl: string
}

export default function RepositoryPullRequestsPage() {
	const params = useParams()
	const repositoryId = params?.id as string
	const [repository, setRepository] = useState<Repository | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadRepository = async () => {
			if (!repositoryId) return

			try {
				setLoading(true)
				const response = await githubApi.getRepository(parseInt(repositoryId))
				if (response.success) {
					setRepository(response.data)
				}
			} catch (error) {
				console.error("Error loading repository:", error)
			} finally {
				setLoading(false)
			}
		}

		loadRepository()
	}, [repositoryId])

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="flex justify-center items-center min-h-[400px]">
						<LoadingSpinner />
					</div>
				</div>
			</div>
		)
	}

	if (!repository) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Repository not found</h1>
						<p className="text-gray-600 dark:text-gray-400 mb-8">
							The repository you're looking for doesn't exist or you don't have access to it.
						</p>
						<Link
							href="/dashboard"
							className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
							<ArrowLeftIcon className="w-4 h-4 mr-2" />
							Back to Dashboard
						</Link>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Breadcrumb */}
				<nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
					<Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
						Dashboard
					</Link>
					<span>/</span>
					<Link
						href={`/repositories/${repository.id}`}
						className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
						{repository.name}
					</Link>
					<span>/</span>
					<span className="text-gray-900 dark:text-white font-medium">Pull Requests</span>
				</nav>

				{/* Repository header */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<div className="flex items-center space-x-3 mb-2">
								<Link
									href={`/repositories/${repository.id}`}
									className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
									<ArrowLeftIcon className="w-4 h-4 mr-1" />
									Back to Repository
								</Link>
							</div>

							<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
								{repository.fullName}
							</h1>

							{repository.description && (
								<p className="text-gray-600 dark:text-gray-400 mb-4">{repository.description}</p>
							)}

							<div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
								{repository.language && (
									<span className="inline-flex items-center">
										<div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
										{repository.language}
									</span>
								)}
								<span>⭐ {repository.starsCount.toLocaleString()}</span>
								<span>🍴 {repository.forksCount.toLocaleString()}</span>
								<a
									href={repository.htmlUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
									View on GitHub
								</a>
							</div>
						</div>
					</div>
				</div>

				{/* Pull requests */}
				<PullRequestList
					repositoryId={repository.id}
					repositoryName={repository.name}
					repositoryOwner={repository.ownerLogin}
				/>
			</div>
		</div>
	)
}
