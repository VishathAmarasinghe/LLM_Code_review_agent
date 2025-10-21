"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
	MagnifyingGlassIcon,
	FunnelIcon,
	ArrowPathIcon,
	PlusIcon,
	MinusIcon,
	CodeBracketIcon,
	ChatBubbleLeftIcon,
	EyeIcon,
} from "@heroicons/react/24/outline"
import { PullRequestCard } from "./PullRequestCard"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { pullRequestApi } from "@/lib/pullRequestApi"
import { PullRequest, PullRequestSearchFilters } from "@/types/pullRequest"

interface PullRequestListProps {
	repositoryId: number
	repositoryName: string
	repositoryOwner: string
}

export function PullRequestList({ repositoryId, repositoryName, repositoryOwner }: PullRequestListProps) {
	const router = useRouter()
	const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
	const [loading, setLoading] = useState(true)
	const [syncing, setSyncing] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedState, setSelectedState] = useState("")
	const [selectedAuthor, setSelectedAuthor] = useState("")
	const [currentPage, setCurrentPage] = useState(1)
	const [hasMore, setHasMore] = useState(false)
	const [total, setTotal] = useState(0)
	const [showFilters, setShowFilters] = useState(false)

	const itemsPerPage = 10

	// Load pull requests
	const loadPullRequests = async (page = 1, reset = false) => {
		try {
			setLoading(true)

			const filters: PullRequestSearchFilters = {
				limit: itemsPerPage,
				offset: (page - 1) * itemsPerPage,
				state: selectedState || undefined,
				q: searchQuery || undefined,
				author: selectedAuthor || undefined,
			}

			const response = await pullRequestApi.getPullRequests(repositoryId, {
				...filters,
				refresh: true,
			})

			if (reset) {
				setPullRequests(response.data.pullRequests)
			} else {
				setPullRequests((prev) => [...prev, ...response.data.pullRequests])
			}

			setTotal(response.data.total)
			setHasMore(response.data.hasMore)
			setCurrentPage(page)
		} catch (error: any) {
			toast.error("Failed to load pull requests")
			console.error("Error loading pull requests:", error)
		} finally {
			setLoading(false)
		}
	}

	// Sync pull requests
	const syncPullRequests = async () => {
		try {
			setSyncing(true)
			const response = await pullRequestApi.syncPullRequests(repositoryId)
			toast.success(response.message)

			// Reload pull requests after sync
			await loadPullRequests(1, true)
		} catch (error: any) {
			toast.error("Failed to sync pull requests")
			console.error("Error syncing pull requests:", error)
		} finally {
			setSyncing(false)
		}
	}

	// Handle search
	const handleSearch = () => {
		setCurrentPage(1)
		loadPullRequests(1, true)
	}

	// Handle filter change
	const handleFilterChange = () => {
		setCurrentPage(1)
		loadPullRequests(1, true)
	}

	// Load more
	const loadMore = () => {
		if (!loading && hasMore) {
			loadPullRequests(currentPage + 1, false)
		}
	}

	// Initial load
	useEffect(() => {
		loadPullRequests(1, true)
	}, [])

	// Get unique authors for filter
	const authors = Array.from(new Set(pullRequests.map((pr) => pr.authorLogin))).sort()

	// Get stats summary
	const stats = pullRequests.reduce(
		(acc, pr) => {
			acc.totalAdditions += pr.additions
			acc.totalDeletions += pr.deletions
			acc.totalFiles += pr.changedFiles
			return acc
		},
		{ totalAdditions: 0, totalDeletions: 0, totalFiles: 0 },
	)

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pull Requests</h2>
					<p className="text-gray-600 dark:text-gray-400">{total} pull requests found</p>
				</div>

				<button
					onClick={syncPullRequests}
					disabled={syncing}
					className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					<ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
					{syncing ? "Syncing..." : "Sync from GitHub"}
				</button>
			</div>

			{/* Search and Filters */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
				<div className="flex flex-col lg:flex-row gap-4">
					{/* Search */}
					<div className="flex-1">
						<div className="relative">
							<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
							<input
								type="text"
								placeholder="Search pull requests..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyPress={(e) => e.key === "Enter" && handleSearch()}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
							/>
						</div>
					</div>

					{/* Quick filters */}
					<div className="flex items-center space-x-2">
						<button
							onClick={() => setShowFilters(!showFilters)}
							className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
							<FunnelIcon className="w-4 h-4 mr-2" />
							Filters
						</button>

						<button
							onClick={handleSearch}
							className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
							<MagnifyingGlassIcon className="w-4 h-4 mr-2" />
							Search
						</button>
					</div>
				</div>

				{/* Advanced filters */}
				{showFilters && (
					<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									State
								</label>
								<select
									value={selectedState}
									onChange={(e) => {
										setSelectedState(e.target.value)
										handleFilterChange()
									}}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
									<option value="">All states</option>
									<option value="open">Open</option>
									<option value="closed">Closed</option>
									<option value="merged">Merged</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Author
								</label>
								<select
									value={selectedAuthor}
									onChange={(e) => {
										setSelectedAuthor(e.target.value)
										handleFilterChange()
									}}
									className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
									<option value="">All authors</option>
									{authors.map((author) => (
										<option key={author} value={author}>
											{author}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Stats summary */}
			{pullRequests.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
						<div className="flex items-center">
							<PlusIcon className="w-8 h-8 text-green-500 mr-3" />
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">Additions</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{stats.totalAdditions.toLocaleString()}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
						<div className="flex items-center">
							<MinusIcon className="w-8 h-8 text-red-500 mr-3" />
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">Deletions</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{stats.totalDeletions.toLocaleString()}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
						<div className="flex items-center">
							<CodeBracketIcon className="w-8 h-8 text-blue-500 mr-3" />
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">Files Changed</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{stats.totalFiles.toLocaleString()}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
						<div className="flex items-center">
							<ChatBubbleLeftIcon className="w-8 h-8 text-purple-500 mr-3" />
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Comments</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{pullRequests.reduce((sum, pr) => sum + (pr.commentCount || 0), 0).toLocaleString()}
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Pull requests list */}
			<div className="space-y-4">
				{loading && pullRequests.length === 0 ? (
					<div className="flex justify-center py-12">
						<LoadingSpinner />
					</div>
				) : pullRequests.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-gray-400 dark:text-gray-500 mb-4">
							<svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
							No pull requests found
						</h3>
						<p className="text-gray-500 dark:text-gray-400 mb-4">
							{searchQuery || selectedState || selectedAuthor
								? "Try adjusting your search or filters."
								: "Sync with GitHub to load pull requests for this repository."}
						</p>
						{!searchQuery && !selectedState && !selectedAuthor && (
							<button
								onClick={syncPullRequests}
								disabled={syncing}
								className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
								<ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
								{syncing ? "Syncing..." : "Sync from GitHub"}
							</button>
						)}
					</div>
				) : (
					<>
						{pullRequests.map((pr) => (
							<PullRequestCard
								key={pr.id}
								pullRequest={pr}
								repositoryName={repositoryName}
								repositoryOwner={repositoryOwner}
							/>
						))}

						{/* Load more button */}
						{hasMore && (
							<div className="flex justify-center pt-6">
								<button
									onClick={loadMore}
									disabled={loading}
									className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
									{loading ? (
										<>
											<ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
											Loading...
										</>
									) : (
										"Load More"
									)}
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
