"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface ProtectedRouteProps {
	children: React.ReactNode
	redirectTo?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, redirectTo = "/auth/login" }) => {
	const { user, loading, isAuthenticated } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (!loading && !isAuthenticated) {
			router.push(redirectTo)
		}
	}, [loading, isAuthenticated, router, redirectTo])

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
				<div className="text-center">
					<LoadingSpinner size="lg" className="mx-auto mb-4" />
					<p className="text-gray-600 dark:text-gray-400">Loading...</p>
				</div>
			</div>
		)
	}

	if (!isAuthenticated) {
		return null
	}

	return <>{children}</>
}
