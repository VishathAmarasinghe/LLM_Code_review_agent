"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

export default function AuthCallbackPage() {
	const { loading } = useAuth()
	const router = useRouter()

	useEffect(() => {
		// The AuthContext will handle the callback automatically
		// This page just shows loading state
	}, [])

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div className="text-center">
				<LoadingSpinner size="lg" className="mx-auto mb-4" />
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Completing Authentication</h2>
				<p className="text-gray-600 dark:text-gray-400">Please wait while we set up your account...</p>
			</div>
		</div>
	)
}
