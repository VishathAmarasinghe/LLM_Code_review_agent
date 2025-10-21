"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { apiClient } from "@/lib/api"
import toast from "react-hot-toast"

export interface User {
	id: string
	githubId: number
	username: string
	displayName: string
	email?: string
	avatarUrl: string
	profileUrl: string
	lastLoginAt: string
	createdAt: string
}

interface AuthContextType {
	user: User | null
	loading: boolean
	login: () => void
	logout: () => void
	refreshUser: () => Promise<void>
	isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return context
}

interface AuthProviderProps {
	children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)
	const router = useRouter()

	// Initialize authentication state
	useEffect(() => {
		initializeAuth()
	}, [])

	const initializeAuth = async () => {
		try {
			const token = Cookies.get("auth_token")

			if (token) {
				// Set token in API client
				apiClient.setAuthToken(token)

				// Fetch user data
				await refreshUser()
			}
		} catch (error) {
			console.error("Auth initialization error:", error)
			// Clear invalid token
			Cookies.remove("auth_token")
		} finally {
			setLoading(false)
		}
	}

	const login = () => {
		// Use the original OAuth route (you'll need to update GitHub app callback URL)
		const authUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}/auth/github`
		console.log("Redirecting to GitHub OAuth (original):", authUrl)
		window.location.href = authUrl
	}

	const logout = async () => {
		try {
			// Call backend logout endpoint
			await apiClient.post("/auth/logout")
		} catch (error) {
			console.error("Logout error:", error)
		} finally {
			// Clear local state
			setUser(null)
			Cookies.remove("auth_token")
			apiClient.clearAuthToken()

			// Redirect to login
			router.push("/auth/login")
			toast.success("Logged out successfully")
		}
	}

	const refreshUser = async (): Promise<void> => {
		try {
			const response = await apiClient.get("/auth/me")

			if (
				response.data &&
				typeof response.data === "object" &&
				"success" in response.data &&
				response.data.success &&
				"data" in response.data &&
				response.data.data
			) {
				setUser((response.data as any).data)
			} else {
				throw new Error("Failed to fetch user data")
			}
		} catch (error) {
			console.error("Error refreshing user:", error)
			// Clear invalid session
			setUser(null)
			Cookies.remove("auth_token")
			apiClient.clearAuthToken()
			throw error
		}
	}

	const handleAuthCallback = async (token: string) => {
		try {
			setLoading(true)

			// Store token
			Cookies.set("auth_token", token, { expires: 7 }) // 7 days
			apiClient.setAuthToken(token)

			// Fetch user data
			await refreshUser()

			// Redirect to dashboard
			router.push("/dashboard")
			toast.success("Login successful!")
		} catch (error) {
			console.error("Auth callback error:", error)
			toast.error("Login failed. Please try again.")
			router.push("/auth/login")
		} finally {
			setLoading(false)
		}
	}

	// Handle OAuth callback
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search)
		const token = urlParams.get("token")

		if (token) {
			handleAuthCallback(token)
		}
	}, [])

	const value: AuthContextType = {
		user,
		loading,
		login,
		logout,
		refreshUser,
		isAuthenticated: !!user,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
