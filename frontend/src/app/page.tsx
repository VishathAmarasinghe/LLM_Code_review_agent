"use client"

import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { CodeEditor } from "@/components/editor/CodeEditor"
import { ReviewResults } from "@/components/review/ReviewResults"
import { ReviewForm } from "@/components/forms/ReviewForm"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { Alert } from "@/components/ui/Alert"
import { useCodeReview } from "@/hooks/useCodeReview"
import { useAuth } from "@/contexts/AuthContext"
import { CodeBracketIcon, UserCircleIcon } from "@heroicons/react/24/outline"
import type { CodeReviewRequest, CodeReviewResponse, SupportedLanguage } from "@/types/codeReview"

export default function HomePage() {
	const [code, setCode] = useState("")
	const [language, setLanguage] = useState<SupportedLanguage>("javascript")
	const [filename, setFilename] = useState("")
	const [reviewType, setReviewType] = useState<"security" | "performance" | "style" | "comprehensive">(
		"comprehensive",
	)
	const [customInstructions, setCustomInstructions] = useState("")

	const { user, isAuthenticated, login } = useAuth()
	const { reviewResult, isLoading, error, analyzeCode, clearResults } = useCodeReview()

	const handleSubmit = async () => {
		if (!code.trim()) {
			return
		}

		const request: CodeReviewRequest = {
			code,
			language,
			filename: filename || undefined,
			reviewType,
			customInstructions: customInstructions || undefined,
		}

		await analyzeCode(request)
	}

	const handleClear = () => {
		setCode("")
		setFilename("")
		setCustomInstructions("")
		clearResults()
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<Header />

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Login Prompt for Unauthenticated Users */}
				{!isAuthenticated && (
					<div className="mb-8 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg border border-primary-200 dark:border-primary-800 p-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-full">
									<CodeBracketIcon className="w-6 h-6 text-white" />
								</div>
								<div>
									<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
										Welcome to Code Review Agent
									</h2>
									<p className="text-gray-600 dark:text-gray-400">
										Sign in with GitHub to access your repositories and get personalized code
										reviews
									</p>
								</div>
							</div>
							<button
								onClick={login}
								className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm">
								<UserCircleIcon className="w-5 h-5 mr-2" />
								Sign in with GitHub
							</button>
						</div>
					</div>
				)}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Left Column - Code Input */}
					<div className="space-y-6">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
							<div className="p-6 border-b border-gray-200 dark:border-gray-700">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Code Input</h2>
								<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
									Paste your code or start typing to get AI-powered review
								</p>
							</div>

							<div className="p-6">
								<ReviewForm
									language={language}
									onLanguageChange={setLanguage}
									filename={filename}
									onFilenameChange={setFilename}
									reviewType={reviewType}
									onReviewTypeChange={setReviewType}
									customInstructions={customInstructions}
									onCustomInstructionsChange={setCustomInstructions}
									onSubmit={handleSubmit}
									onClear={handleClear}
									isLoading={isLoading}
									disabled={!code.trim()}
								/>
							</div>
						</div>

						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
							<div className="p-6 border-b border-gray-200 dark:border-gray-700">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Code Editor</h3>
							</div>

							<div className="p-6">
								<CodeEditor
									value={code}
									onChange={setCode}
									language={language}
									placeholder="Paste your code here or start typing..."
								/>
							</div>
						</div>
					</div>

					{/* Right Column - Review Results */}
					<div className="space-y-6">
						<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
							<div className="p-6 border-b border-gray-200 dark:border-gray-700">
								<h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Results</h2>
								<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
									AI-powered analysis and recommendations
								</p>
							</div>

							<div className="p-6">
								{isLoading && (
									<div className="flex items-center justify-center py-12">
										<LoadingSpinner size="lg" />
										<span className="ml-3 text-gray-600 dark:text-gray-400">
											Analyzing your code...
										</span>
									</div>
								)}

								{error && (
									<Alert variant="error" className="mb-4">
										{error}
									</Alert>
								)}

								{reviewResult && !isLoading && <ReviewResults review={reviewResult} />}

								{!reviewResult && !isLoading && !error && (
									<div className="text-center py-12">
										<div className="text-gray-400 dark:text-gray-600 mb-4">
											<svg
												className="mx-auto h-12 w-12"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor">
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={1}
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
										</div>
										<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
											No review yet
										</h3>
										<p className="text-gray-600 dark:text-gray-400">
											Enter some code and click "Analyze Code" to get started
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	)
}
