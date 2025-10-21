"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import {
	CodeBracketIcon,
	Bars3Icon,
	XMarkIcon,
	SunIcon,
	MoonIcon,
	UserCircleIcon,
	ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline"

export function Header() {
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [isDarkMode, setIsDarkMode] = useState(false)
	const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
	const { user, isAuthenticated, login, logout } = useAuth()

	const toggleDarkMode = () => {
		setIsDarkMode(!isDarkMode)
		document.documentElement.classList.toggle("dark")
	}

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen)
	}

	return (
		<header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					{/* Logo */}
					<div className="flex items-center">
						<Link href="/" className="flex items-center space-x-2">
							<div className="flex items-center justify-center w-8 h-8 bg-primary-600 rounded-lg">
								<CodeBracketIcon className="w-5 h-5 text-white" />
							</div>
							<span className="text-xl font-bold text-gray-900 dark:text-white">Code Review Agent</span>
						</Link>
					</div>

					{/* Desktop Navigation */}
					<nav className="hidden md:flex items-center space-x-8">
						<Link
							href="/"
							className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
							Home
						</Link>
						{isAuthenticated && (
							<>
								<Link
									href="/dashboard"
									className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
									Dashboard
								</Link>
								<Link
									href="/pull-requests"
									className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
									Pull Requests
								</Link>
							</>
						)}
						<Link
							href="/reviews"
							className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
							Reviews
						</Link>
						<Link
							href="/stats"
							className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
							Statistics
						</Link>
						<Link
							href="/docs"
							className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
							Documentation
						</Link>
						{!isAuthenticated && (
							<Link
								href="/auth/login"
								className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
								Login
							</Link>
						)}
					</nav>

					{/* Right side actions */}
					<div className="flex items-center space-x-4">
						{/* Authentication */}
						{isAuthenticated ? (
							<div className="relative">
								<button
									onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
									className="flex items-center space-x-2 p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
									<img src={user?.avatarUrl} alt={user?.username} className="w-6 h-6 rounded-full" />
									<span className="hidden md:block text-sm font-medium">{user?.displayName}</span>
								</button>

								{/* User dropdown menu */}
								{isUserMenuOpen && (
									<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
										<div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
											<p className="text-sm font-medium text-gray-900 dark:text-white">
												{user?.displayName}
											</p>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												@{user?.username}
											</p>
										</div>
										<a
											href="/dashboard"
											className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											onClick={() => setIsUserMenuOpen(false)}>
											Dashboard
										</a>
										<a
											href={user?.profileUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
											onClick={() => setIsUserMenuOpen(false)}>
											GitHub Profile
										</a>
										<button
											onClick={() => {
												logout()
												setIsUserMenuOpen(false)
											}}
											className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
											Sign out
										</button>
									</div>
								)}
							</div>
						) : (
							<button
								onClick={login}
								className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30 transition-colors">
								<UserCircleIcon className="w-4 h-4 mr-2" />
								Sign in
							</button>
						)}

						{/* Dark mode toggle */}
						<button
							onClick={toggleDarkMode}
							className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
							aria-label="Toggle dark mode">
							{isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
						</button>

						{/* Mobile menu button */}
						<button
							onClick={toggleMenu}
							className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
							aria-label="Toggle menu">
							{isMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
						</button>
					</div>
				</div>

				{/* Mobile Navigation */}
				{isMenuOpen && (
					<div className="md:hidden border-t border-gray-200 dark:border-gray-700">
						<nav className="py-4 space-y-2">
							<Link
								href="/"
								className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
								onClick={() => setIsMenuOpen(false)}>
								Home
							</Link>
							{isAuthenticated && (
								<>
									<Link
										href="/dashboard"
										className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
										onClick={() => setIsMenuOpen(false)}>
										Dashboard
									</Link>
									<Link
										href="/pull-requests"
										className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
										onClick={() => setIsMenuOpen(false)}>
										Pull Requests
									</Link>
								</>
							)}
							<Link
								href="/reviews"
								className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
								onClick={() => setIsMenuOpen(false)}>
								Reviews
							</Link>
							<Link
								href="/stats"
								className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
								onClick={() => setIsMenuOpen(false)}>
								Statistics
							</Link>
							<Link
								href="/docs"
								className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
								onClick={() => setIsMenuOpen(false)}>
								Documentation
							</Link>

							{/* Mobile authentication */}
							<div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
								{isAuthenticated ? (
									<div className="px-3 py-2">
										<div className="flex items-center space-x-3 mb-3">
											<img
												src={user?.avatarUrl}
												alt={user?.username}
												className="w-8 h-8 rounded-full"
											/>
											<div>
												<p className="text-sm font-medium text-gray-900 dark:text-white">
													{user?.displayName}
												</p>
												<p className="text-xs text-gray-500 dark:text-gray-400">
													@{user?.username}
												</p>
											</div>
										</div>
										<button
											onClick={() => {
												logout()
												setIsMenuOpen(false)
											}}
											className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
											<ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
											Sign out
										</button>
									</div>
								) : (
									<button
										onClick={() => {
											login()
											setIsMenuOpen(false)
										}}
										className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
										<UserCircleIcon className="w-4 h-4 mr-2" />
										Sign in with GitHub
									</button>
								)}
							</div>
						</nav>
					</div>
				)}
			</div>
		</header>
	)
}
