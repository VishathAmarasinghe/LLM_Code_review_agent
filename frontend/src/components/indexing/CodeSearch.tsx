"use client"

import { useState, useRef, useEffect } from "react"
import { SearchResult } from "../../types/indexing"

interface CodeSearchProps {
	repositoryId: number
	onSearch: (query: string, limit?: number) => Promise<SearchResult[]>
}

export function CodeSearch({ repositoryId, onSearch }: CodeSearchProps) {
	const [query, setQuery] = useState("")
	const [results, setResults] = useState<SearchResult[]>([])
	const [isSearching, setIsSearching] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [searchHistory, setSearchHistory] = useState<string[]>([])
	const [showHistory, setShowHistory] = useState(false)
	const [limit, setLimit] = useState(50)
	const searchInputRef = useRef<HTMLInputElement>(null)

	// Load search history from localStorage
	useEffect(() => {
		const savedHistory = localStorage.getItem(`searchHistory_${repositoryId}`)
		if (savedHistory) {
			setSearchHistory(JSON.parse(savedHistory))
		}
	}, [repositoryId])

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!query.trim()) return

		try {
			setIsSearching(true)
			setError(null)
			setShowHistory(false)

			const searchResults = await onSearch(query.trim(), limit)
			setResults(searchResults)

			// Add to search history
			const newHistory = [query.trim(), ...searchHistory.filter((h) => h !== query.trim())].slice(0, 10)
			setSearchHistory(newHistory)
			localStorage.setItem(`searchHistory_${repositoryId}`, JSON.stringify(newHistory))
		} catch (err) {
			setError(err instanceof Error ? err.message : "Search failed")
		} finally {
			setIsSearching(false)
		}
	}

	const handleHistoryClick = (historyQuery: string) => {
		setQuery(historyQuery)
		setShowHistory(false)
		searchInputRef.current?.focus()
	}

	const handleInputFocus = () => {
		if (searchHistory.length > 0) {
			setShowHistory(true)
		}
	}

	const handleInputBlur = () => {
		// Delay hiding history to allow clicks
		setTimeout(() => setShowHistory(false), 200)
	}

	const getBlockTypeColor = (blockType: string) => {
		const colors: Record<string, string> = {
			function: "bg-blue-100 text-blue-800",
			method: "bg-blue-100 text-blue-800",
			arrow_function: "bg-blue-100 text-blue-800",
			class: "bg-green-100 text-green-800",
			interface: "bg-green-100 text-green-800",
			type: "bg-green-100 text-green-800",
			variable: "bg-yellow-100 text-yellow-800",
			constant: "bg-yellow-100 text-yellow-800",
			import: "bg-purple-100 text-purple-800",
			export: "bg-purple-100 text-purple-800",
			comment: "bg-gray-100 text-gray-800",
			docstring: "bg-gray-100 text-gray-800",
			heading: "bg-indigo-100 text-indigo-800",
			paragraph: "bg-indigo-100 text-indigo-800",
		}

		return colors[blockType] || "bg-gray-100 text-gray-800"
	}

	const getFileExtension = (filePath: string) => {
		return filePath.split(".").pop()?.toLowerCase() || ""
	}

	const getLanguageFromExtension = (extension: string) => {
		const languages: Record<string, string> = {
			js: "JavaScript",
			ts: "TypeScript",
			jsx: "React",
			tsx: "React",
			py: "Python",
			java: "Java",
			cpp: "C++",
			c: "C",
			h: "C",
			cs: "C#",
			php: "PHP",
			rb: "Ruby",
			go: "Go",
			rs: "Rust",
			swift: "Swift",
			kt: "Kotlin",
			scala: "Scala",
			dart: "Dart",
			r: "R",
			html: "HTML",
			css: "CSS",
			scss: "SCSS",
			sql: "SQL",
			yaml: "YAML",
			yml: "YAML",
			json: "JSON",
			xml: "XML",
			md: "Markdown",
			txt: "Text",
		}

		return languages[extension] || extension.toUpperCase()
	}

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<div className="mb-6">
				<h2 className="text-xl font-semibold text-gray-900 mb-2">Search Indexed Code</h2>
				<p className="text-gray-600">Search through the indexed code blocks using natural language queries.</p>
			</div>

			{/* Search Form */}
			<form onSubmit={handleSearch} className="mb-6">
				<div className="space-y-4">
					<div className="flex space-x-4">
						<div className="flex-1 relative">
							<input
								ref={searchInputRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onFocus={handleInputFocus}
								onBlur={handleInputBlur}
								placeholder="Search for functions, classes, variables, or any code..."
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								disabled={isSearching}
							/>

							{/* Search History Dropdown */}
							{showHistory && searchHistory.length > 0 && (
								<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
									{searchHistory.map((historyQuery, index) => (
										<button
											key={index}
											type="button"
											onClick={() => handleHistoryClick(historyQuery)}
											className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none">
											<div className="flex items-center space-x-2">
												<svg
													className="w-4 h-4 text-gray-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
												<span className="text-sm text-gray-700">{historyQuery}</span>
											</div>
										</button>
									))}
								</div>
							)}
						</div>
						<button
							type="submit"
							disabled={isSearching || !query.trim()}
							className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
							{isSearching ? (
								<div className="flex items-center">
									<div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
									Searching...
								</div>
							) : (
								"Search"
							)}
						</button>
					</div>

					{/* Search Options */}
					<div className="flex items-center space-x-4 text-sm text-gray-600">
						<div className="flex items-center space-x-2">
							<label htmlFor="limit" className="font-medium">
								Results limit:
							</label>
							<select
								id="limit"
								value={limit}
								onChange={(e) => setLimit(Number(e.target.value))}
								className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
								disabled={isSearching}>
								<option value={10}>10</option>
								<option value={25}>25</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</div>
						{searchHistory.length > 0 && (
							<div className="flex items-center space-x-2">
								<span className="text-gray-400">•</span>
								<span>Recent searches: {searchHistory.slice(0, 3).join(", ")}</span>
							</div>
						)}
					</div>
				</div>
			</form>

			{/* Error Message */}
			{error && (
				<div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
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
							<p className="text-sm text-red-700">{error}</p>
						</div>
					</div>
				</div>
			)}

			{/* Search Results */}
			{results.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-medium text-gray-900">Search Results ({results.length})</h3>
						<div className="text-sm text-gray-500">Sorted by relevance</div>
					</div>

					<div className="space-y-3">
						{results.map((result, index) => (
							<div
								key={`${result.id}-${index}`}
								className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
								<div className="flex items-start justify-between mb-2">
									<div className="flex items-center space-x-2">
										<span
											className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBlockTypeColor(result.blockType)}`}>
											{result.blockType}
										</span>
										{result.identifier && (
											<span className="text-sm font-medium text-gray-900">
												{result.identifier}
											</span>
										)}
									</div>
									<div className="flex items-center space-x-2 text-sm text-gray-500">
										<span>Score: {Math.round(result.score * 100)}%</span>
										<span>•</span>
										<span>
											Lines {result.startLine}-{result.endLine}
										</span>
									</div>
								</div>

								<div className="mb-2">
									<div className="flex items-center space-x-2 text-sm text-gray-600">
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
										<span className="font-medium">{result.filePath}</span>
										<span className="text-gray-400">•</span>
										<span className="text-gray-500">
											{getLanguageFromExtension(getFileExtension(result.filePath))}
										</span>
									</div>
								</div>

								<div className="bg-gray-50 rounded-lg p-3">
									<pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
										{result.content}
									</pre>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Search Suggestions */}
			{!query && results.length === 0 && !isSearching && !error && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
					<h3 className="text-lg font-medium text-blue-900 mb-3">💡 Search Tips</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
						<div>
							<h4 className="font-medium mb-2">Search by Functionality:</h4>
							<ul className="space-y-1">
								<li>• "user authentication"</li>
								<li>• "error handling"</li>
								<li>• "database connection"</li>
								<li>• "API endpoint"</li>
							</ul>
						</div>
						<div>
							<h4 className="font-medium mb-2">Search by Code Structure:</h4>
							<ul className="space-y-1">
								<li>• "function calculateTotal"</li>
								<li>• "class UserService"</li>
								<li>• "interface ApiResponse"</li>
								<li>• "const config"</li>
							</ul>
						</div>
					</div>
					<div className="mt-4 p-3 bg-blue-100 rounded-lg">
						<p className="text-sm text-blue-700">
							<strong>Pro tip:</strong> Use natural language! The search understands code semantics, not
							just exact matches.
						</p>
					</div>
				</div>
			)}

			{/* No Results */}
			{query && results.length === 0 && !isSearching && !error && (
				<div className="text-center py-8">
					<div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
						<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
					<p className="text-gray-500 mb-4">
						No code blocks matched your search query "{query}". Try different keywords or phrases.
					</p>
					<div className="text-sm text-gray-400">
						<p>Try searching for:</p>
						<ul className="mt-2 space-y-1">
							<li>• Function names (e.g., "calculateTotal", "handleClick")</li>
							<li>• Class names (e.g., "UserService", "ApiClient")</li>
							<li>• Variable names (e.g., "userData", "config")</li>
							<li>• Code patterns (e.g., "error handling", "async function")</li>
						</ul>
					</div>
				</div>
			)}
		</div>
	)
}
