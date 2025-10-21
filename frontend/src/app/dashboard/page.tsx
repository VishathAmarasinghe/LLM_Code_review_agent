"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Header } from "@/components/layout/Header"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { SyncProgressModal } from "@/components/sync/SyncProgressModal"
import {
	CodeBracketIcon,
	StarIcon,
	EyeIcon,
	ClockIcon,
	MagnifyingGlassIcon,
	FunnelIcon,
	ArrowUpIcon,
	ArrowDownIcon,
} from "@heroicons/react/24/outline"
import { apiClient } from "@/lib/api"
import toast from "react-hot-toast"

interface Repository {
	id: number
	githubId: number
	name: string
	fullName: string
	description?: string
	language?: string
	starsCount: number
	forksCount: number
	watchersCount: number
	isPrivate: boolean
	isFork: boolean
	updatedAt: string
	pushedAt: string
	htmlUrl: string
}

export default function DashboardPage() {
	const { user } = useAuth()
	const [repositories, setRepositories] = useState<Repository[]>([])
	const [loading, setLoading] = useState(true)
	const [showSyncModal, setShowSyncModal] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedLanguage, setSelectedLanguage] = useState("")
	const [isPrivateFilter, setIsPrivateFilter] = useState("")
	const [isForkFilter, setIsForkFilter] = useState("")
	const [sortBy, setSortBy] = useState("repoUpdatedAt")
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
	const [availableLanguages, setAvailableLanguages] = useState<string[]>([])
	const [totalCount, setTotalCount] = useState(0)

	useEffect(() => {
		fetchRepositories()
		fetchAvailableLanguages()
	}, [])

	// Fetch repositories with current filters and sorting (excluding search)
	useEffect(() => {
		fetchRepositories()
	}, [selectedLanguage, isPrivateFilter, isForkFilter, sortBy, sortOrder])

	// Debounced search effect
	useEffect(() => {
		const timeout = setTimeout(() => {
			fetchRepositories()
		}, 500)

		return () => clearTimeout(timeout)
	}, [searchQuery])

	const fetchRepositories = async () => {
		try {
			setLoading(true)

			// Build query parameters
			const params = new URLSearchParams()
			if (searchQuery.trim()) params.append("search", searchQuery.trim())
			if (selectedLanguage) params.append("language", selectedLanguage)
			if (isPrivateFilter) params.append("isPrivate", isPrivateFilter)
			if (isForkFilter) params.append("isFork", isForkFilter)
			params.append("sortBy", sortBy)
			params.append("sortOrder", sortOrder)

			const response = await apiClient.get(`/github/repos?${params.toString()}`)

			if (
				response.data &&
				typeof response.data === "object" &&
				"success" in response.data &&
				response.data.success
			) {
				const data = (response.data as any).data
				setRepositories(data.repositories)
				setTotalCount(data.pagination?.total || data.repositories.length)
				console.log(`Fetched ${data.repositories.length} repositories from API`)
			}
		} catch (error) {
			console.error("Error fetching repositories:", error)
			toast.error("Failed to fetch repositories")
		} finally {
			setLoading(false)
		}
	}

	const fetchAvailableLanguages = async () => {
		try {
			const response = await apiClient.get("/github/repos/languages")

			if (
				response.data &&
				typeof response.data === "object" &&
				"success" in response.data &&
				response.data.success
			) {
				const languages = (response.data as any).data.languages
				setAvailableLanguages(Array.isArray(languages) ? languages : [])
			} else {
				setAvailableLanguages([])
			}
		} catch (error) {
			console.error("Error fetching languages:", error)
			setAvailableLanguages([])
		}
	}

	const handleSyncComplete = async () => {
		console.log("Sync completed, refreshing repository list...")
		// Add a small delay to ensure backend has finished processing
		setTimeout(async () => {
			await fetchRepositories()
			await fetchAvailableLanguages()
		}, 500)
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		})
	}

	const handleSort = (field: string) => {
		if (sortBy === field) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc")
		} else {
			setSortBy(field)
			setSortOrder("desc")
		}
	}

	const clearFilters = () => {
		setSearchQuery("")
		setSelectedLanguage("")
		setIsPrivateFilter("")
		setIsForkFilter("")
		setSortBy("repoUpdatedAt")
		setSortOrder("desc")
	}

	const handleSearchChange = (value: string) => {
		setSearchQuery(value)
	}

	return (
		<ProtectedRoute>
			<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
				<Header />

				<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					{/* Welcome Section */}
					<div className="mb-8">
						<div className="flex items-center space-x-4 mb-4">
							<Image
								src={user?.avatarUrl || "/default-avatar.png"}
								alt={user?.username || "User"}
								width={48}
								height={48}
								className="w-12 h-12 rounded-full"
							/>
							<div>
								<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
									Welcome back, {user?.displayName}!
								</h1>
								<p className="text-gray-600 dark:text-gray-400">@{user?.username}</p>
							</div>
						</div>

						<div className="flex items-center space-x-4">
							<button
								onClick={() => setShowSyncModal(true)}
								className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors">
								<CodeBracketIcon className="w-4 h-4 mr-2" />
								Sync Repositories
							</button>

							<a
								href="/"
								className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded-md transition-colors">
								<CodeBracketIcon className="w-4 h-4 mr-2" />
								Code Review
							</a>
						</div>
					</div>

					{/* Repositories Section */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
						<div className="p-6 border-b border-gray-200 dark:border-gray-700">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
										Your Repositories
									</h2>
									<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
										{repositories.length} of {totalCount} repositories
									</p>
								</div>
								<button
									onClick={clearFilters}
									className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
									Clear filters
								</button>
							</div>

							{/* Search and Filter Bar */}
							<div className="space-y-4">
								{/* First Row: Search */}
								<div className="flex flex-col sm:flex-row gap-4">
									<div className="flex-1 relative">
										<MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
										<input
											type="text"
											placeholder="Search repositories..."
											value={searchQuery}
											onChange={(e) => handleSearchChange(e.target.value)}
											className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								</div>

								{/* Second Row: Filters */}
								<div className="flex flex-col sm:flex-row gap-4">
									{/* Language Filter */}
									<div className="sm:w-48">
										<select
											value={selectedLanguage}
											onChange={(e) => setSelectedLanguage(e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
											<option value="">All Languages</option>
											{availableLanguages?.map((language) => (
												<option key={language} value={language}>
													{language}
												</option>
											))}
										</select>
									</div>

									{/* Private Filter */}
									<div className="sm:w-32">
										<select
											value={isPrivateFilter}
											onChange={(e) => setIsPrivateFilter(e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
											<option value="">All Types</option>
											<option value="true">Private</option>
											<option value="false">Public</option>
										</select>
									</div>

									{/* Fork Filter */}
									<div className="sm:w-32">
										<select
											value={isForkFilter}
											onChange={(e) => setIsForkFilter(e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
											<option value="">All Repos</option>
											<option value="true">Forks</option>
											<option value="false">Original</option>
										</select>
									</div>
								</div>
							</div>
						</div>

						<div className="overflow-x-auto">
							{loading ? (
								<div className="flex items-center justify-center py-12">
									<LoadingSpinner size="lg" />
									<span className="ml-3 text-gray-600 dark:text-gray-400">
										Loading repositories...
									</span>
								</div>
							) : repositories.length === 0 ? (
								<div className="text-center py-12">
									<CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
									<h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
										{searchQuery || selectedLanguage
											? "No repositories match your filters"
											: "No repositories found"}
									</h3>
									<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
										{searchQuery || selectedLanguage
											? "Try adjusting your search or filters"
											: 'Click "Sync Repositories" to load your GitHub repositories'}
									</p>
								</div>
							) : (
								<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
									<thead className="bg-gray-50 dark:bg-gray-700">
										<tr>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												<button
													onClick={() => handleSort("name")}
													className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100">
													<span>Repository</span>
													{sortBy === "name" &&
														(sortOrder === "asc" ? (
															<ArrowUpIcon className="w-3 h-3" />
														) : (
															<ArrowDownIcon className="w-3 h-3" />
														))}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												Language
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												<button
													onClick={() => handleSort("stars")}
													className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100">
													<StarIcon className="w-3 h-3" />
													<span>Stars</span>
													{sortBy === "stars" &&
														(sortOrder === "asc" ? (
															<ArrowUpIcon className="w-3 h-3" />
														) : (
															<ArrowDownIcon className="w-3 h-3" />
														))}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												<button
													onClick={() => handleSort("forks")}
													className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100">
													<CodeBracketIcon className="w-3 h-3" />
													<span>Forks</span>
													{sortBy === "forks" &&
														(sortOrder === "asc" ? (
															<ArrowUpIcon className="w-3 h-3" />
														) : (
															<ArrowDownIcon className="w-3 h-3" />
														))}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												<button
													onClick={() => handleSort("updated")}
													className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-100">
													<ClockIcon className="w-3 h-3" />
													<span>Updated</span>
													{sortBy === "updated" &&
														(sortOrder === "asc" ? (
															<ArrowUpIcon className="w-3 h-3" />
														) : (
															<ArrowDownIcon className="w-3 h-3" />
														))}
												</button>
											</th>
											<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
												Actions
											</th>
										</tr>
									</thead>
									<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
										{repositories.map((repo) => (
											<tr key={repo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center">
														<div className="flex-shrink-0 h-8 w-8">
															<div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
																<CodeBracketIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
															</div>
														</div>
														<div className="ml-4">
															<div className="flex items-center space-x-2">
																<div className="text-sm font-medium text-gray-900 dark:text-white">
																	{repo.name}
																</div>
																<div className="flex items-center space-x-1">
																	{repo.isPrivate && (
																		<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
																			Private
																		</span>
																	)}
																	{repo.isFork && (
																		<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
																			Fork
																		</span>
																	)}
																</div>
															</div>
															<div className="text-sm text-gray-500 dark:text-gray-400">
																{repo.fullName}
															</div>
															{repo.description && (
																<div className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-md truncate">
																	{repo.description}
																</div>
															)}
														</div>
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{repo.language ? (
														<div className="flex items-center">
															<div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
															<span className="text-sm text-gray-900 dark:text-white">
																{repo.language}
															</span>
														</div>
													) : (
														<span className="text-sm text-gray-500 dark:text-gray-400">
															—
														</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center text-sm text-gray-900 dark:text-white">
														<StarIcon className="w-4 h-4 mr-1 text-yellow-400" />
														{repo.starsCount.toLocaleString()}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center text-sm text-gray-900 dark:text-white">
														<CodeBracketIcon className="w-4 h-4 mr-1 text-gray-400" />
														{repo.forksCount.toLocaleString()}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center text-sm text-gray-900 dark:text-white">
														<ClockIcon className="w-4 h-4 mr-1 text-gray-400" />
														{formatDate(repo.updatedAt)}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
													<div className="flex space-x-3">
														<a
															href={`/repositories/${repo.id}`}
															className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
															Index
														</a>
														<a
															href={repo.htmlUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
															GitHub
														</a>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					</div>
				</main>

				{/* Sync Progress Modal */}
				<SyncProgressModal
					isOpen={showSyncModal}
					onClose={() => setShowSyncModal(false)}
					onSyncComplete={handleSyncComplete}
				/>
			</div>
		</ProtectedRoute>
	)
}
