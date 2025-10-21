"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { CodeBracketIcon } from "@heroicons/react/24/outline"

export default function LoginPage() {
	const { user, loading, login, isAuthenticated } = useAuth()
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (!loading && isAuthenticated) {
			router.push("/dashboard")
		}
	}, [loading, isAuthenticated, router])

	useEffect(() => {
		// Check for OAuth error in URL
		const urlParams = new URLSearchParams(window.location.search)
		const errorParam = urlParams.get("error")

		if (errorParam) {
			let errorMessage = "Authentication failed. Please try again."

			switch (errorParam) {
				case "oauth_failed":
					errorMessage = "GitHub OAuth failed. Please check your GitHub app configuration."
					break
				case "no_user":
					errorMessage = "User not found. Please try logging in again."
					break
				case "callback_error":
					errorMessage = "OAuth callback error. Please try again."
					break
				default:
					errorMessage = `Authentication error: ${errorParam}`
			}

			setError(errorMessage)

			// Clear the error from URL
			const newUrl = window.location.pathname
			window.history.replaceState({}, document.title, newUrl)
		}
	}, [])

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
					<p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
				</div>
			</div>
		)
	}

	if (isAuthenticated) {
		return null
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mx-auto">
						<CodeBracketIcon className="w-8 h-8 text-white" />
					</div>
					<h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
						Welcome to Code Review Agent
					</h2>
					<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
						Sign in with your GitHub account to get started
					</p>
				</div>

				<div className="mt-8 space-y-6">
					{error && (
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
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
									<h3 className="text-sm font-medium text-red-800 dark:text-red-200">
										Authentication Error
									</h3>
									<div className="mt-2 text-sm text-red-700 dark:text-red-300">
										<p>{error}</p>
									</div>
								</div>
							</div>
						</div>
					)}

					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
						<div className="space-y-4">
							<div className="text-center">
								<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
									GitHub Authentication
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
									We'll access your public repositories and profile information to provide
									personalized code reviews.
								</p>
							</div>

							<button
								onClick={login}
								className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
								<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
										clipRule="evenodd"
									/>
								</svg>
								Sign in with GitHub
							</button>

							<div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
								<p>By signing in, you agree to:</p>
								<ul className="list-disc list-inside space-y-1">
									<li>Access your public repositories</li>
									<li>View your GitHub profile information</li>
									<li>Store repository metadata for analysis</li>
								</ul>
							</div>
						</div>
					</div>

					<div className="text-center">
						<p className="text-xs text-gray-500 dark:text-gray-400">
							Don't have a GitHub account?{" "}
							<a
								href="https://github.com/join"
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary-600 hover:text-primary-500 font-medium">
								Create one here
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
