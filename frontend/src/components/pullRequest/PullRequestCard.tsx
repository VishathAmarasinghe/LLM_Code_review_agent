"use client"

import { useState } from "react"
import Link from "next/link"
import {
	ChatBubbleLeftIcon,
	EyeIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
	CodeBracketIcon,
	PlusIcon,
	MinusIcon,
	ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline"
import { GitPullRequest } from "lucide-react"
import { PullRequest } from "@/types/pullRequest"
import { formatDistanceToNow } from "date-fns"
import { useReviewStream } from "@/hooks/useReviewStream"

interface PullRequestCardProps {
	pullRequest: PullRequest
	repositoryName: string
	repositoryOwner: string
}

export function PullRequestCard({ pullRequest, repositoryName, repositoryOwner }: PullRequestCardProps) {
	const [isExpanded, setIsExpanded] = useState(false)
	const { startReview, status, error, taskId } = useReviewStream()

	const getStateIcon = (state: string) => {
		switch (state) {
			case "open":
				return <GitPullRequest className="w-4 h-4 text-green-500" />
			case "closed":
				return <XCircleIcon className="w-4 h-4 text-red-500" />
			case "merged":
				return <CheckCircleIcon className="w-4 h-4 text-purple-500" />
			default:
				return <ClockIcon className="w-4 h-4 text-gray-500" />
		}
	}

	const getStateColor = (state: string) => {
		switch (state) {
			case "open":
				return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
			case "closed":
				return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
			case "merged":
				return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
		}
	}

	const formatDate = (dateString: string) => {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true })
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
			{/* Header */}
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center space-x-3">
					{getStateIcon(pullRequest.state)}
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
							<Link
								href={`/repositories/${pullRequest.repositoryId}/pull-requests/${pullRequest.id}`}
								className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
								{pullRequest.title}
							</Link>
						</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							#{pullRequest.githubPrId} by {pullRequest.authorLogin} in {repositoryOwner}/{repositoryName}
						</p>
					</div>
				</div>

				<div className="flex items-center space-x-2">
					<span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(pullRequest.state)}`}>
						{pullRequest.state}
					</span>
					{pullRequest.draft && (
						<span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
							Draft
						</span>
					)}
					<a
						href={pullRequest.htmlUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
						<ArrowTopRightOnSquareIcon className="w-4 h-4" />
					</a>
				</div>
			</div>

			{/* Description */}
			{pullRequest.body && (
				<div className="mb-4">
					<p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">{pullRequest.body}</p>
				</div>
			)}

			{/* Stats */}
			<div className="flex items-center space-x-6 mb-4 text-sm text-gray-500 dark:text-gray-400">
				<div className="flex items-center space-x-1">
					<PlusIcon className="w-4 h-4 text-green-500" />
					<span>{pullRequest.additions.toLocaleString()}</span>
				</div>
				<div className="flex items-center space-x-1">
					<MinusIcon className="w-4 h-4 text-red-500" />
					<span>{pullRequest.deletions.toLocaleString()}</span>
				</div>
				<div className="flex items-center space-x-1">
					<CodeBracketIcon className="w-4 h-4" />
					<span>{pullRequest.changedFiles} files</span>
				</div>
				<div className="flex items-center space-x-1">
					<ChatBubbleLeftIcon className="w-4 h-4" />
					<span>{pullRequest.commentCount || 0} comments</span>
				</div>
				<div className="flex items-center space-x-1">
					<EyeIcon className="w-4 h-4" />
					<span>{pullRequest.reviewCount || 0} reviews</span>
				</div>
			</div>

			{/* Branch info */}
			<div className="mb-4">
				<div className="flex items-center space-x-2 text-sm">
					<span className="text-gray-500 dark:text-gray-400">Branch:</span>
					<span className="font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
						{pullRequest.headRef}
					</span>
					<span className="text-gray-400">→</span>
					<span className="font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
						{pullRequest.baseRef}
					</span>
				</div>
			</div>

			{/* Labels */}
			{pullRequest.labels && pullRequest.labels.length > 0 && (
				<div className="mb-4">
					<div className="flex flex-wrap gap-2">
						{pullRequest.labels.map((label, index) => (
							<span
								key={index}
								className="px-2 py-1 rounded-full text-xs font-medium"
								style={{
									backgroundColor: `#${label.color}20`,
									color: `#${label.color}`,
									borderColor: `#${label.color}`,
									border: "1px solid",
								}}>
								{label.name}
							</span>
						))}
					</div>
				</div>
			)}

			{/* Footer */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<img
						src={pullRequest.authorAvatarUrl}
						alt={pullRequest.authorLogin}
						className="w-6 h-6 rounded-full"
					/>
					<span className="text-sm text-gray-600 dark:text-gray-300">{pullRequest.authorLogin}</span>
					<span className="text-sm text-gray-400">opened {formatDate(pullRequest.githubCreatedAt)}</span>
				</div>

				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
					{isExpanded ? "Show less" : "Show more"}
				</button>
				<button
					onClick={() => startReview(repositoryOwner, repositoryName, pullRequest.githubPrId)}
					className="ml-3 text-sm px-3 py-1 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
					disabled={status === "running"}
					aria-label="Start code review">
					{status === "running" ? "Reviewing…" : "Review PR"}
				</button>
			</div>

			{/* Expanded content */}
			{isExpanded && (
				<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<h4 className="font-medium text-gray-900 dark:text-white mb-2">Details</h4>
							<div className="space-y-1 text-gray-600 dark:text-gray-300">
								<div>Commits: {pullRequest.commits}</div>
								<div>Review Comments: {pullRequest.reviewComments}</div>
								<div>Issue Comments: {pullRequest.comments}</div>
								<div>Mergeable: {pullRequest.mergeable ? "Yes" : "No"}</div>
							</div>
						</div>
						<div>
							<h4 className="font-medium text-gray-900 dark:text-white mb-2">Timeline</h4>
							<div className="space-y-1 text-gray-600 dark:text-gray-300">
								<div>Created: {formatDate(pullRequest.githubCreatedAt)}</div>
								<div>Updated: {formatDate(pullRequest.githubUpdatedAt)}</div>
								{pullRequest.closedAt && <div>Closed: {formatDate(pullRequest.closedAt)}</div>}
								{pullRequest.mergedAt && <div>Merged: {formatDate(pullRequest.mergedAt)}</div>}
							</div>
						</div>
					</div>
				</div>
			)}
			{status !== "idle" && (
				<div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
					<div>
						Task: {taskId || "—"} | Status: {status}
					</div>
					{error && <div className="text-red-500">{error}</div>}
				</div>
			)}
		</div>
	)
}
