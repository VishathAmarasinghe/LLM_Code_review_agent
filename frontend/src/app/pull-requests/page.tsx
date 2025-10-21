"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Header } from "@/components/layout/Header"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { indexingApi } from "@/lib/indexingApi"
import { pullRequestApi } from "@/lib/pullRequestApi"
import { PullRequestCard } from "@/components/pullRequest/PullRequestCard"
import { PullRequest } from "@/types/pullRequest"
import { Repository } from "@/types/indexing"
import {
	MagnifyingGlassIcon,
	FunnelIcon,
	ArrowPathIcon,
	PlusIcon,
	MinusIcon,
	CodeBracketIcon,
	ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline"
import toast from "react-hot-toast"

export default function PullRequestsPage() {
	const { isAuthenticated, user } = useAuth()
	const [repositories, setRepositories] = useState<Repository[]>([])
	const [allPullRequests, setAllPullRequests] = useState<PullRequest[]>([])
	const [filteredPRs, setFilteredPRs] = useState<PullRequest[]>([])
	const [loading, setLoading] = useState(true)
	const [syncing, setSyncing] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedRepo, setSelectedRepo] = useState("")
	const [selectedState, setSelectedState] = useState("")
	const isLoadingDataRef = useRef(false)
	const currentRepoRef = useRef<string>("")
	const REPO_BATCH_LIMIT = 10

	// Load repositories only
	const loadRepositories = async () => {
		if (!isAuthenticated || !user) return
		if (isLoadingDataRef.current) return

		try {
			isLoadingDataRef.current = true
			setLoading(true)

			const repos = await indexingApi.getRepositories(Number(user.id))
			setRepositories(repos)

			// Clear PRs until a repository is selected
			setAllPullRequests([])
			setFilteredPRs([])
		} catch (error) {
			console.error("Error loading repositories:", error)
			toast.error("Failed to load repositories")
		} finally {
			setLoading(false)
			isLoadingDataRef.current = false
		}
	}

	// Shared fetcher to load PRs for a given repository full name
	const fetchRepoPRsByFullName = async (repoFullName: string, state: string) => {
		if (!repoFullName) {
			setAllPullRequests([])
			setFilteredPRs([])
			currentRepoRef.current = ""
			return
		}

		const repo = repositories.find((r) => r.fullName === repoFullName)
		if (!repo) return

		// Prevent duplicate API calls for the same repository and state
		const cacheKey = `${repoFullName}-${state || "all"}`
		if (currentRepoRef.current === cacheKey && allPullRequests.length > 0) {
			console.log(`Skipping API call for ${cacheKey} - already loaded`)
			return
		}

		try {
			setLoading(true)
			console.log(`Fetching PRs for ${repoFullName} (${repo.id}) with state: ${state || "all"}`)
			const response = await pullRequestApi.getPullRequests(repo.id, {
				state: state || undefined,
				limit: 100,
				offset: 0,
				refresh: true,
			})
			if (response.success) {
				// Deduplicate pull requests by ID using a more robust method
				const seenIds = new Set<number>()
				const uniquePRs = response.data.pullRequests.filter((pr: PullRequest) => {
					if (seenIds.has(pr.id)) {
						console.warn(`Duplicate PR found: ID ${pr.id}, GitHub PR ${pr.githubPrId}, Title: ${pr.title}`)
						return false
					}
					seenIds.add(pr.id)
					return true
				})

				console.log(
					`Fetched ${response.data.pullRequests.length} PRs, ${uniquePRs.length} unique for ${repoFullName}`,
				)
				console.log(
					"Raw PRs from API:",
					response.data.pullRequests.map((pr: any) => ({
						id: pr.id,
						githubPrId: pr.githubPrId,
						title: pr.title,
					})),
				)
				console.log(
					"Unique PRs after dedup:",
					uniquePRs.map((pr: any) => ({ id: pr.id, githubPrId: pr.githubPrId, title: pr.title })),
				)
				setAllPullRequests(uniquePRs)
				setFilteredPRs(uniquePRs)
				currentRepoRef.current = cacheKey
			} else {
				setAllPullRequests([])
				setFilteredPRs([])
			}
		} catch (err: any) {
			const status = err?.response?.status
			if (status === 429) {
				toast.error("Rate limited. Please wait a moment and try again.")
			} else {
				toast.error("Failed to load pull requests for the repository")
			}
			setAllPullRequests([])
			setFilteredPRs([])
		} finally {
			setLoading(false)
		}
	}

	// Sync all repositories
	const syncAllRepositories = async () => {
		if (!repositories.length) return

		try {
			setSyncing(true)
			let syncedCount = 0

			for (const repo of repositories) {
				try {
					await pullRequestApi.syncPullRequests(repo.id)
					syncedCount++
				} catch (error) {
					console.error(`Error syncing ${repo.fullName}:`, error)
				}
			}

			toast.success(`Synced pull requests for ${syncedCount} repositories`)

			// Reload repositories after sync
			await loadRepositories()
		} catch (error) {
			toast.error("Failed to sync pull requests")
		} finally {
			setSyncing(false)
		}
	}

	// Sync selected repository's PRs
	const syncSelectedRepository = async () => {
		if (!selectedRepo) return
		const repo = repositories.find((r) => r.fullName === selectedRepo)
		if (!repo) return
		try {
			setSyncing(true)
			await pullRequestApi.syncPullRequests(repo.id)
			toast.success(`Sync started for ${repo.fullName}`)
			// Refetch PRs after a short delay to allow background sync to populate
			setTimeout(() => {
				fetchRepoPRsByFullName(selectedRepo, selectedState)
			}, 1500)
		} catch (error) {
			console.error(`Error syncing ${repo.fullName}:`, error)
			toast.error("Failed to start sync for repository")
		} finally {
			setSyncing(false)
		}
	}

	// Filter pull requests
	const filterPullRequests = () => {
		let filtered = allPullRequests

		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			filtered = filtered.filter(
				(pr) =>
					pr.title.toLowerCase().includes(query) ||
					pr.authorLogin.toLowerCase().includes(query) ||
					(pr.body && pr.body.toLowerCase().includes(query)),
			)
		}

		if (selectedRepo) {
			filtered = filtered.filter((pr) => {
				const repo = repositories.find((r) => r.id === pr.repositoryId)
				return repo && repo.fullName === selectedRepo
			})
		}

		if (selectedState) {
			filtered = filtered.filter((pr) => pr.state === selectedState)
		}

		// Deduplicate filtered results by ID using a more robust method
		const seenIds = new Set<number>()
		const uniqueFiltered = filtered.filter((pr: PullRequest) => {
			if (seenIds.has(pr.id)) {
				console.warn(
					`Duplicate PR in filtered results: ID ${pr.id}, GitHub PR ${pr.githubPrId}, Title: ${pr.title}`,
				)
				return false
			}
			seenIds.add(pr.id)
			return true
		})

		console.log(`Filtered ${allPullRequests.length} PRs to ${uniqueFiltered.length} unique results`)
		setFilteredPRs(uniqueFiltered)
	}

	// Initial load: fetch repositories only
	useEffect(() => {
		if (isAuthenticated) {
			loadRepositories()
		}
	}, [isAuthenticated])

	// Fetch PRs when a repository or state is selected/changed
	useEffect(() => {
		const fetchRepoPRs = async () => {
			await fetchRepoPRsByFullName(selectedRepo, selectedState)
		}

		if (isAuthenticated && selectedRepo) {
			fetchRepoPRs()
		}
	}, [isAuthenticated, selectedRepo, selectedState])

	// Filter when search/filter changes
	useEffect(() => {
		filterPullRequests()
	}, [searchQuery, selectedRepo, selectedState, allPullRequests])

	if (!isAuthenticated) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<Header />
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sign in required</h1>
						<p className="text-gray-600 dark:text-gray-400">
							Please sign in to view pull requests across your repositories.
						</p>
					</div>
				</div>
			</div>
		)
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<Header />
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="flex justify-center items-center min-h-[400px]">
						<LoadingSpinner />
					</div>
				</div>
			</div>
		)
	}

	// Get repository info for a PR
	const getRepositoryInfo = (pr: PullRequest) => {
		const repo = repositories.find((r) => r.id === pr.repositoryId)
		return repo ? { name: repo.name, owner: repo.ownerLogin } : { name: "Unknown", owner: "Unknown" }
	}

	// Get stats summary
	const stats = filteredPRs.reduce(
		(acc, pr) => {
			acc.totalAdditions += pr.additions
			acc.totalDeletions += pr.deletions
			acc.totalFiles += pr.changedFiles
			acc.totalComments += pr.commentCount || 0
			return acc
		},
		{ totalAdditions: 0, totalDeletions: 0, totalFiles: 0, totalComments: 0 },
	)

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<Header />

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pull Requests</h1>
						<p className="text-gray-600 dark:text-gray-400 mt-2">
							{filteredPRs.length} pull requests across {repositories.length} repositories
						</p>
					</div>

					<div className="flex gap-2">
						{selectedRepo && (
							<button
								onClick={syncSelectedRepository}
								disabled={syncing}
								className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
								<ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
								{syncing ? "Syncing..." : "Sync Selected Repository"}
							</button>
						)}
						<button
							onClick={syncAllRepositories}
							disabled={syncing || repositories.length === 0}
							className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
							<ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
							{syncing ? "Syncing..." : "Sync All Repositories"}
						</button>
					</div>
				</div>

				{/* Search and Filters */}
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
					<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
						{/* Search */}
						<div className="lg:col-span-2">
							<div className="relative">
								<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
								<input
									type="text"
									placeholder="Search pull requests..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
								/>
							</div>
						</div>

						{/* Repository filter */}
						<div>
							<select
								value={selectedRepo}
								onChange={async (e) => {
									const value = e.target.value
									setSelectedRepo(value)
									await fetchRepoPRsByFullName(value, selectedState)
								}}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
								<option value="">All repositories</option>
								{repositories.map((repo) => (
									<option key={repo.id} value={repo.fullName}>
										{repo.fullName}
									</option>
								))}
							</select>
						</div>

						{/* State filter */}
						<div>
							<select
								value={selectedState}
								onChange={(e) => setSelectedState(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
								<option value="">All states</option>
								<option value="open">Open</option>
								<option value="closed">Closed</option>
								<option value="merged">Merged</option>
							</select>
						</div>
					</div>
				</div>

				{/* Stats summary */}
				{filteredPRs.length > 0 && (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
									<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
										Files Changed
									</p>
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
									<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
										Total Comments
									</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-white">
										{stats.totalComments.toLocaleString()}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Pull requests list */}
				<div className="space-y-4">
					{filteredPRs.length === 0 ? (
						<div className="text-center py-12">
							<div className="text-gray-400 dark:text-gray-500 mb-4">
								<svg
									className="mx-auto h-12 w-12"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
								{selectedRepo ? "No pull requests found" : "Select a repository to view pull requests"}
							</h3>
							<p className="text-gray-500 dark:text-gray-400 mb-4">
								{selectedRepo
									? searchQuery || selectedState
										? "Try adjusting your search or filters."
										: "Try syncing the selected repository to fetch PRs from GitHub."
									: "Choose a repository from the dropdown to fetch PRs."}
							</p>
							{!selectedRepo && (
								<button
									onClick={syncAllRepositories}
									disabled={syncing || repositories.length === 0}
									className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
									<ArrowPathIcon className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
									{syncing ? "Syncing..." : "Sync All Repositories"}
								</button>
							)}
						</div>
					) : (
						(() => {
							console.log(
								"Rendering PRs:",
								filteredPRs.map((pr: any) => ({
									id: pr.id,
									githubPrId: pr.githubPrId,
									title: pr.title,
								})),
							)
							return filteredPRs.map((pr) => {
								const repoInfo = getRepositoryInfo(pr)
								return (
									<PullRequestCard
										key={`${pr.id}-${pr.githubPrId}-${pr.repositoryId}`}
										pullRequest={pr}
										repositoryName={repoInfo.name}
										repositoryOwner={repoInfo.owner}
									/>
								)
							})
						})()
					)}
				</div>
			</div>
		</div>
	)
}
