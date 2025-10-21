"use client"

import { useAuth } from "@/contexts/AuthContext"
import { CodeBracketIcon, UserCircleIcon } from "@heroicons/react/24/outline"

export default function TestLoginPage() {
	const { user, isAuthenticated, login, loading } = useAuth()

	const handleLogin = () => {
		console.log("Login button clicked")
		console.log("Environment variables:", {
			NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
			NODE_ENV: process.env.NODE_ENV,
		})
		login()
	}

	const testBackend = async () => {
		try {
			const response = await fetch("http://localhost:3001/api/test/test")
			const data = await response.json()
			console.log("Backend test response:", data)
			alert(`Backend Status: ${data.message}\nGitHub OAuth: ${data.environment.GITHUB_CLIENT_ID}`)
		} catch (error) {
			console.error("Backend test failed:", error)
			alert("Backend test failed. Make sure the backend is running on port 3001.")
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
			<div className="max-w-md w-full space-y-8 p-8">
				<div className="text-center">
					<div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mx-auto">
						<CodeBracketIcon className="w-8 h-8 text-white" />
					</div>
					<h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">Test Login Page</h2>
					<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Debug authentication flow</p>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<div className="space-y-4">
						<div>
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
								Authentication Status
							</h3>
							<div className="space-y-2 text-sm">
								<p>
									<span className="font-medium">Loading:</span> {loading ? "Yes" : "No"}
								</p>
								<p>
									<span className="font-medium">Authenticated:</span> {isAuthenticated ? "Yes" : "No"}
								</p>
								<p>
									<span className="font-medium">User:</span> {user ? user.username : "None"}
								</p>
								<p>
									<span className="font-medium">API URL:</span> {process.env.NEXT_PUBLIC_API_URL}
								</p>
							</div>
						</div>

						<div>
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">OAuth URL</h3>
							<p className="text-sm text-gray-600 dark:text-gray-400 break-all">
								{process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}/auth-simple/github-simple
							</p>
						</div>

						<div className="space-y-3">
							<button
								onClick={testBackend}
								className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors">
								Test Backend Connection
							</button>

							<button
								onClick={handleLogin}
								disabled={loading}
								className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors disabled:opacity-50">
								<UserCircleIcon className="w-5 h-5 mr-2" />
								{loading ? "Loading..." : "Test GitHub Login"}
							</button>
						</div>

						<div className="text-xs text-gray-500 dark:text-gray-400">
							<p>Check the browser console for debug information</p>
						</div>
					</div>
				</div>

				<div className="text-center">
					<a href="/" className="text-primary-600 hover:text-primary-500 text-sm font-medium">
						← Back to Home
					</a>
				</div>
			</div>
		</div>
	)
}
