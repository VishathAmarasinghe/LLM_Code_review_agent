"use client"

import { Repository } from "../../types/indexing"

interface RepositoryHeaderProps {
	repository: Repository
}

export function RepositoryHeader({ repository }: RepositoryHeaderProps) {
	const formatDate = (date: Date | string) => {
		return new Date(date).toLocaleDateString()
	}

	const formatSize = (bytes: number) => {
		const sizes = ["B", "KB", "MB", "GB"]
		if (bytes === 0) return "0 B"
		const i = Math.floor(Math.log(bytes) / Math.log(1024))
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
	}

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<div className="flex items-start justify-between">
				<div className="flex-1 min-w-0">
					{/* Repository Name and Description */}
					<div className="flex items-center space-x-3 mb-4">
						<div className="flex-shrink-0">
							<div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
								<svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm2 2a1 1 0 000 2h6a1 1 0 100-2H5z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
						</div>
						<div className="flex-1 min-w-0">
							<h1 className="text-2xl font-bold text-gray-900 truncate">{repository.name}</h1>
							<p className="text-sm text-gray-500 truncate">{repository.fullName}</p>
						</div>
					</div>

					{/* Description */}
					{repository.description && <p className="text-gray-700 mb-4">{repository.description}</p>}

					{/* Repository Stats */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-gray-900">{repository.language || "Unknown"}</div>
							<div className="text-sm text-gray-500">Language</div>
						</div>

						<div className="text-center">
							<div className="text-2xl font-bold text-gray-900">{formatSize(repository.size)}</div>
							<div className="text-sm text-gray-500">Size</div>
						</div>

						<div className="text-center">
							<div className="text-2xl font-bold text-gray-900">
								{repository.isPrivate ? "Private" : "Public"}
							</div>
							<div className="text-sm text-gray-500">Visibility</div>
						</div>

						<div className="text-center">
							<div className="text-2xl font-bold text-gray-900">{repository.defaultBranch}</div>
							<div className="text-sm text-gray-500">Default Branch</div>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col space-y-2 ml-6">
					<a
						href={repository.htmlUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
							/>
						</svg>
						View on GitHub
					</a>

					<button
						onClick={() => navigator.clipboard.writeText(repository.cloneUrl)}
						className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
						<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
						Copy Clone URL
					</button>
				</div>
			</div>

			{/* Repository Metadata */}
			<div className="mt-6 pt-6 border-t border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
					<div>
						<span className="font-medium">Created:</span> {formatDate(repository.createdAt)}
					</div>
					<div>
						<span className="font-medium">Updated:</span> {formatDate(repository.updatedAt)}
					</div>
				</div>
			</div>
		</div>
	)
}
