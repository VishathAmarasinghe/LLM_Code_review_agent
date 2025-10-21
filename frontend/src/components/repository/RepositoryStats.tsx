"use client"

import { Repository } from "../../types/indexing"

interface RepositoryStatsProps {
	repository: Repository
}

export function RepositoryStats({ repository }: RepositoryStatsProps) {
	const formatDate = (date: Date | string) => {
		return new Date(date).toLocaleDateString()
	}

	const formatSize = (bytes: number) => {
		const sizes = ["B", "KB", "MB", "GB"]
		if (bytes === 0) return "0 B"
		const i = Math.floor(Math.log(bytes) / Math.log(1024))
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
	}

	const getLanguageColor = (language: string) => {
		const colors: Record<string, string> = {
			JavaScript: "bg-yellow-100 text-yellow-800",
			TypeScript: "bg-blue-100 text-blue-800",
			Python: "bg-green-100 text-green-800",
			Java: "bg-red-100 text-red-800",
			"C++": "bg-purple-100 text-purple-800",
			"C#": "bg-indigo-100 text-indigo-800",
			Go: "bg-cyan-100 text-cyan-800",
			Rust: "bg-orange-100 text-orange-800",
			PHP: "bg-pink-100 text-pink-800",
			Ruby: "bg-red-100 text-red-800",
			Swift: "bg-orange-100 text-orange-800",
			Kotlin: "bg-purple-100 text-purple-800",
			Scala: "bg-red-100 text-red-800",
			Dart: "bg-blue-100 text-blue-800",
			R: "bg-blue-100 text-blue-800",
			HTML: "bg-orange-100 text-orange-800",
			CSS: "bg-blue-100 text-blue-800",
			SQL: "bg-gray-100 text-gray-800",
			YAML: "bg-gray-100 text-gray-800",
			JSON: "bg-gray-100 text-gray-800",
			Markdown: "bg-gray-100 text-gray-800",
		}

		return colors[language] || "bg-gray-100 text-gray-800"
	}

	return (
		<div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{/* Language */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="flex items-center">
					<div className="flex-shrink-0">
						<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
							<svg
								className="w-4 h-4 text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
								/>
							</svg>
						</div>
					</div>
					<div className="ml-4">
						<p className="text-sm font-medium text-gray-500">Primary Language</p>
						<div className="mt-1">
							<span
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLanguageColor(repository.language || "Unknown")}`}>
								{repository.language || "Unknown"}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Size */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="flex items-center">
					<div className="flex-shrink-0">
						<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
							<svg
								className="w-4 h-4 text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
								/>
							</svg>
						</div>
					</div>
					<div className="ml-4">
						<p className="text-sm font-medium text-gray-500">Repository Size</p>
						<p className="text-2xl font-bold text-gray-900">{formatSize(repository.size)}</p>
					</div>
				</div>
			</div>

			{/* Visibility */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="flex items-center">
					<div className="flex-shrink-0">
						<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
							{repository.isPrivate ? (
								<svg
									className="w-4 h-4 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									/>
								</svg>
							) : (
								<svg
									className="w-4 h-4 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							)}
						</div>
					</div>
					<div className="ml-4">
						<p className="text-sm font-medium text-gray-500">Visibility</p>
						<p className="text-2xl font-bold text-gray-900">
							{repository.isPrivate ? "Private" : "Public"}
						</p>
					</div>
				</div>
			</div>

			{/* Default Branch */}
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="flex items-center">
					<div className="flex-shrink-0">
						<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
							<svg
								className="w-4 h-4 text-gray-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
					</div>
					<div className="ml-4">
						<p className="text-sm font-medium text-gray-500">Default Branch</p>
						<p className="text-2xl font-bold text-gray-900">{repository.defaultBranch}</p>
					</div>
				</div>
			</div>
		</div>
	)
}
