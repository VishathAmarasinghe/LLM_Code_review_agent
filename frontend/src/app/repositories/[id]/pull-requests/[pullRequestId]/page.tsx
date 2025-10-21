"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { pullRequestApi } from "@/lib/pullRequestApi"
import { PullRequestDetails, PullRequestFile } from "@/types/pullRequest"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { PullRequestDiff } from "@/components/pullRequest/PullRequestDiff"
import { ArrowTopRightOnSquareIcon, CodeBracketIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/outline"
import { useReviewStream } from "@/hooks/useReviewStream"
import { ReviewResults } from "@/components/review/ReviewResults"

export default function PullRequestDetailsPage() {
	const params = useParams()
	const router = useRouter()
	const [details, setDetails] = useState<PullRequestDetails | null>(null)
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState<"files" | "comments" | "reviews" | "live-review">("files")
	const [expandedFiles, setExpandedFiles] = useState<Record<number, boolean>>({})
	const [fileQuery, setFileQuery] = useState("")
	const [statusFilter, setStatusFilter] = useState<string>("")
	const { startReview, status, error, taskId, events } = (useReviewStream as any)() as ReturnType<
		typeof useReviewStream
	>
	const chatEndRef = useRef<HTMLDivElement>(null)

	const pullRequestId = Number((params as any)?.pullRequestId)

	// Auto-scroll to bottom when new events arrive
	useEffect(() => {
		if (events.length > 0 && chatEndRef.current) {
			chatEndRef.current.scrollIntoView({ behavior: "smooth" })
		}
	}, [events])

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true)
				const resp = await pullRequestApi.getPullRequestDetails(pullRequestId)
				console.log("Pull request details received:", {
					id: resp.data.id,
					githubPrId: resp.data.githubPrId,
					title: resp.data.title,
					changedFiles: resp.data.changedFiles,
					filesCount: resp.data.files?.length || 0,
					files:
						resp.data.files?.map((f: any) => ({ id: f.id, filename: f.filename, status: f.status })) || [],
				})
				setDetails(resp.data)
			} catch (e) {
				router.push("/pull-requests")
			} finally {
				setLoading(false)
			}
		}
		if (!isNaN(pullRequestId)) load()
	}, [pullRequestId])

	const toggleFile = (file: PullRequestFile) => {
		setExpandedFiles((prev) => ({ ...prev, [file.id]: !prev[file.id] }))
	}

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<LoadingSpinner />
			</div>
		)
	}

	if (!details) {
		return <div className="p-6">Failed to load pull request.</div>
	}

	return (
		<div className="space-y-6">
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{details.title}</h1>
						<div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
							<span>
								#{details.githubPrId} by {details.authorLogin}
							</span>
							<span className="px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
								{details.headRef}
							</span>
							<span className="text-gray-400">→</span>
							<span className="px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
								{details.baseRef}
							</span>
							<span
								className={`ml-2 px-2 py-0.5 rounded-full text-xs ${details.state === "open" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300" : details.state === "merged" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
								{details.state}
							</span>
							{details.draft && (
								<span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
									Draft
								</span>
							)}
						</div>
					</div>
					<div>
						<a
							href={details.htmlUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800">
							View on GitHub
							<ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
						</a>
						<button
							onClick={() => {
								// Derive owner/repo from the GitHub PR URL: https://github.com/{owner}/{repo}/pull/{number}
								try {
									const url = new URL(details.htmlUrl)
									const segments = url.pathname.split("/").filter(Boolean)
									const owner = segments[0]
									const repo = segments[1]
									if (owner && repo) {
										startReview(owner, repo, details.githubPrId)
										setActiveTab("live-review") // Switch to Live Review tab
									}
								} catch (_) {
									// no-op
								}
							}}
							className="ml-3 inline-flex items-center text-sm px-3 py-1 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
							disabled={status === "running"}>
							{status === "running" ? "Reviewing…" : "Review PR"}
						</button>
					</div>
				</div>
				{details.body && (
					<div className="mt-4 text-gray-700 dark:text-gray-200 whitespace-pre-line">{details.body}</div>
				)}
				<div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
					<div className="flex items-center gap-1">
						<PlusIcon className="w-4 h-4 text-green-500" /> {details.additions}
					</div>
					<div className="flex items-center gap-1">
						<MinusIcon className="w-4 h-4 text-red-500" /> {details.deletions}
					</div>
					<div className="flex items-center gap-1">
						<CodeBracketIcon className="w-4 h-4" /> {details.changedFiles} files
					</div>
				</div>
			</div>

			<div className="border-b border-gray-200 dark:border-gray-700">
				<nav className="-mb-px flex gap-6" aria-label="Tabs">
					{(["files", "comments", "reviews", "live-review"] as const).map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={`pb-2 text-sm flex items-center gap-2 ${activeTab === tab ? "border-b-2 border-primary-600 text-primary-600" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}>
							{tab === "live-review" ? (
								<>
									Live Review
									{status === "running" && (
										<div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
									)}
									{status === "completed" && (
										<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									)}
									{status === "failed" && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
								</>
							) : (
								tab[0].toUpperCase() + tab.slice(1)
							)}
						</button>
					))}
				</nav>
			</div>

			{activeTab === "files" && (
				<div className="space-y-4">
					<div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
						<div className="flex-1">
							<input
								value={fileQuery}
								onChange={(e) => setFileQuery(e.target.value)}
								placeholder="Filter files by name..."
								className="w-full md:max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
							/>
						</div>
						<div className="flex items-center gap-2">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
								<option value="">All changes</option>
								<option value="added">Added</option>
								<option value="modified">Modified</option>
								<option value="removed">Removed</option>
								<option value="renamed">Renamed</option>
							</select>
							<button
								onClick={() => {
									const allExpanded = details.files.reduce(
										(acc, f) => ({ ...acc, [f.id]: true }),
										{} as Record<number, boolean>,
									)
									setExpandedFiles(allExpanded)
								}}
								className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
								Expand all
							</button>
							<button
								onClick={() => setExpandedFiles({})}
								className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
								Collapse all
							</button>
						</div>
					</div>

					{(() => {
						const filteredFiles = details.files.filter(
							(f) =>
								(!fileQuery || f.filename.toLowerCase().includes(fileQuery.toLowerCase())) &&
								(!statusFilter || f.status === statusFilter),
						)
						console.log("File filtering:", {
							totalFiles: details.files.length,
							fileQuery,
							statusFilter,
							filteredFiles: filteredFiles.length,
							files: details.files.map((f) => ({ filename: f.filename, status: f.status })),
						})
						return filteredFiles.length === 0 ? (
							<div className="text-sm text-gray-500 dark:text-gray-400">
								No files match the current filters.
							</div>
						) : (
							filteredFiles.map((file) => (
								<div
									key={file.id}
									className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
									<button
										onClick={() => toggleFile(file)}
										className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
										<div className="flex items-center gap-2">
											<span className="font-mono text-sm text-gray-800 dark:text-gray-200">
												{file.filename}
											</span>
											<span className="text-xs text-gray-500 dark:text-gray-400">
												({file.status})
											</span>
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											+{file.additions} / -{file.deletions}
										</div>
									</button>
									{expandedFiles[file.id] && (
										<div className="px-4 pb-4">
											<PullRequestDiff file={file} />
										</div>
									)}
								</div>
							))
						)
					})()}
				</div>
			)}

			{activeTab === "comments" && (
				<div className="space-y-4">
					{details.comments.length === 0 ? (
						<div className="text-sm text-gray-500 dark:text-gray-400">No comments.</div>
					) : (
						details.comments.map((c) => (
							<div
								key={c.id}
								className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
								<div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{c.authorLogin}</div>
								<div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{c.body}</div>
							</div>
						))
					)}
				</div>
			)}

			{activeTab === "reviews" && (
				<div className="space-y-4">
					{details.reviews.length === 0 ? (
						<div className="text-sm text-gray-500 dark:text-gray-400">No reviews.</div>
					) : (
						details.reviews.map((r) => (
							<div
								key={r.id}
								className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
								<div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
									{r.authorLogin} — {r.state}
								</div>
								{r.body && (
									<div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{r.body}</div>
								)}
							</div>
						))
					)}
				</div>
			)}

			{activeTab === "live-review" && (
				<div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
					{/* Chat Header */}
					<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
								<CodeBracketIcon className="w-5 h-5 text-white" />
							</div>
							<div>
								<h3 className="font-medium text-gray-900 dark:text-white">AI Code Review</h3>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{status === "idle" && "Ready to start review"}
									{status === "running" && "Reviewing your code..."}
									{status === "completed" && "Review completed"}
									{status === "failed" && "Review failed"}
								</p>
							</div>
						</div>
						<button
							onClick={() => {
								try {
									const url = new URL(details.htmlUrl)
									const segments = url.pathname.split("/").filter(Boolean)
									const owner = segments[0]
									const repo = segments[1]
									if (owner && repo) {
										startReview(owner, repo, details.githubPrId)
									}
								} catch (_) {
									// no-op
								}
							}}
							className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={status === "running"}>
							{status === "running" ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
									Reviewing…
								</>
							) : status === "completed" ? (
								"Review Again"
							) : (
								"Start Review"
							)}
						</button>
					</div>

					{/* Chat Messages Area */}
					<div className="flex-1 overflow-y-auto p-4 space-y-4">
						{status === "idle" && (
							<div className="flex flex-col items-center justify-center h-full text-center">
								<div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
									<CodeBracketIcon className="w-8 h-8 text-gray-400" />
								</div>
								<h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
									Ready to Review
								</h4>
								<p className="text-gray-500 dark:text-gray-400 max-w-md">
									Click "Start Review" to begin an AI-powered analysis of this pull request. The AI
									will examine your code for issues, improvements, and best practices.
								</p>
							</div>
						)}

						{events.length > 0 && (
							<div className="space-y-4">
								{/* Welcome Message */}
								<div className="flex items-start gap-3">
									<div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
										<CodeBracketIcon className="w-5 h-5 text-white" />
									</div>
									<div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-w-3xl">
										<p className="text-sm text-gray-900 dark:text-white">
											Hello! I'm your AI code reviewer. I'll analyze this pull request for code
											quality, potential issues, and improvements. Let me start by examining the
											changes...
										</p>
									</div>
								</div>

								{/* Review Events as Chat Messages */}
								{events.map((event, idx) => (
									<div key={idx} className="flex items-start gap-3">
										{event.type === "assistant_delta" ? (
											<>
												<div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
													<CodeBracketIcon className="w-5 h-5 text-white" />
												</div>
												<div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 max-w-3xl">
													<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
														AI Assistant
													</div>
													<div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
														{event.data?.text}
													</div>
												</div>
											</>
										) : event.type === "tool_call_started" ? (
											<>
												<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
													<div className="w-4 h-4 bg-white rounded"></div>
												</div>
												<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 max-w-3xl">
													<div className="text-xs text-blue-600 dark:text-blue-300 mb-1">
														🔧 Using tool: {event.data?.name}
													</div>
													<div className="text-sm text-blue-800 dark:text-blue-200">
														<div className="font-mono text-xs bg-blue-100 dark:bg-blue-800 p-2 rounded mt-1 overflow-x-auto">
															<pre>
																{JSON.stringify(event.data?.params ?? {}, null, 2)}
															</pre>
														</div>
													</div>
												</div>
											</>
										) : event.type === "tool_call_completed" ? (
											<>
												<div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
													<div className="w-4 h-4 bg-white rounded"></div>
												</div>
												<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 max-w-3xl">
													<div className="text-xs text-green-600 dark:text-green-300 mb-1">
														✅ Tool completed: {event.data?.name}
													</div>
													{event.data?.result && (
														<div className="text-sm text-green-800 dark:text-green-200">
															<div className="font-mono text-xs bg-green-100 dark:bg-green-800 p-2 rounded mt-1 overflow-x-auto max-h-32">
																<pre>{JSON.stringify(event.data.result, null, 2)}</pre>
															</div>
														</div>
													)}
												</div>
											</>
										) : event.type === "workflow_started" ? (
											<>
												<div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
													<div className="w-4 h-4 bg-white rounded"></div>
												</div>
												<div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 max-w-3xl">
													<div className="text-xs text-purple-600 dark:text-purple-300 mb-1">
														🚀 Workflow Started
													</div>
													<div className="text-sm text-purple-800 dark:text-purple-200">
														{event.data?.name || "Code review workflow initiated"}
													</div>
												</div>
											</>
										) : event.type === "llm_input" ? (
											<>
												<div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
													<div className="w-4 h-4 bg-white rounded"></div>
												</div>
												<div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 max-w-3xl">
													<div className="text-xs text-indigo-600 dark:text-indigo-300 mb-1">
														📤 Sending to LLM
													</div>
													<div className="text-sm text-indigo-800 dark:text-indigo-200">
														<div className="mb-2">
															<strong>Model:</strong> {event.data?.model}
														</div>
														<details className="mt-2">
															<summary className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100">
																View full input ({event.data?.messages?.length || 0}{" "}
																messages)
															</summary>
															<div className="mt-2 font-mono text-xs bg-indigo-100 dark:bg-indigo-800 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
																<pre>{JSON.stringify(event.data, null, 2)}</pre>
															</div>
														</details>
													</div>
												</div>
											</>
										) : event.type === "llm_output" ? (
											<>
												<div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
													<div className="w-4 h-4 bg-white rounded"></div>
												</div>
												<div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 max-w-3xl">
													<div className="text-xs text-emerald-600 dark:text-emerald-300 mb-1">
														📥 LLM Response
													</div>
													<div className="text-sm text-emerald-800 dark:text-emerald-200">
														<div className="mb-2 flex items-center gap-4 text-xs">
															<span>
																<strong>Model:</strong> {event.data?.model}
															</span>
															<span>
																<strong>Finish:</strong> {event.data?.finish_reason}
															</span>
															{event.data?.usage && (
																<span>
																	<strong>Tokens:</strong>{" "}
																	{event.data.usage.total_tokens}
																</span>
															)}
														</div>
														{event.data?.response?.content && (
															<div className="mb-2 p-2 bg-emerald-100 dark:bg-emerald-800 rounded text-xs">
																{event.data.response.content}
															</div>
														)}
														<details className="mt-2">
															<summary className="cursor-pointer text-xs text-emerald-600 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-100">
																View full response
															</summary>
															<div className="mt-2 font-mono text-xs bg-emerald-100 dark:bg-emerald-800 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
																<pre>{JSON.stringify(event.data, null, 2)}</pre>
															</div>
														</details>
													</div>
												</div>
											</>
										) : (
											<div className="flex items-start gap-3 w-full">
												<div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
													<div className="w-4 h-4 bg-white rounded"></div>
												</div>
												<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-w-3xl">
													<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
														System Event
													</div>
													<div className="text-sm text-gray-700 dark:text-gray-300">
														{event.type.replace(/_/g, " ")}
													</div>
												</div>
											</div>
										)}
									</div>
								))}

								{/* Status Messages */}
								{status === "running" && (
									<div className="flex items-start gap-3">
										<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
											<div className="w-4 h-4 bg-white rounded"></div>
										</div>
										<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 max-w-3xl">
											<div className="text-xs text-blue-600 dark:text-blue-300 mb-1">
												🔄 Review in Progress
											</div>
											<div className="text-sm text-blue-800 dark:text-blue-200">
												Analyzing your code... This may take a few minutes.
											</div>
										</div>
									</div>
								)}

								{status === "completed" && (
									<div className="flex items-start gap-3">
										<div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
											<div className="w-4 h-4 bg-white rounded"></div>
										</div>
										<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 max-w-3xl">
											<div className="text-xs text-green-600 dark:text-green-300 mb-1">
												✅ Review Completed
											</div>
											<div className="text-sm text-green-800 dark:text-green-200">
												Code review finished successfully. Check the analysis above for insights
												and recommendations.
											</div>
										</div>
									</div>
								)}

								{status === "failed" && (
									<div className="flex items-start gap-3">
										<div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
											<div className="w-4 h-4 bg-white rounded"></div>
										</div>
										<div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-w-3xl">
											<div className="text-xs text-red-600 dark:text-red-300 mb-1">
												❌ Review Failed
											</div>
											<div className="text-sm text-red-800 dark:text-red-200">
												{error || "An error occurred during the review process."}
											</div>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Auto-scroll target */}
						<div ref={chatEndRef} />
					</div>

					{/* Chat Input Area (Optional - for future enhancements) */}
					<div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
						<div className="text-xs text-gray-500 dark:text-gray-400 text-center">
							AI Code Review • {taskId ? `Task: ${taskId}` : "Ready to start"}
						</div>
					</div>
				</div>
			)}

			<div>
				<Link href={`/pull-requests`} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800">
					Back to list
				</Link>
			</div>
		</div>
	)
}
