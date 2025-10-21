import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "react-hot-toast"
import { AuthProvider } from "@/contexts/AuthContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
	title: "Code Review Agent",
	description: "AI-powered code review and analysis tool",
	keywords: ["code review", "AI", "static analysis", "code quality"],
	authors: [{ name: "Code Review Agent Team" }],
}

// Next.js 13+ requires viewport to be exported separately
export const viewport = {
	width: "device-width",
	initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="h-full">
			<body className={`${inter.className} h-full bg-gray-50 dark:bg-gray-900`}>
				<AuthProvider>
					<div className="min-h-full">{children}</div>
					<Toaster
						position="top-right"
						toastOptions={{
							duration: 4000,
							style: {
								background: "#363636",
								color: "#fff",
							},
							success: {
								style: {
									background: "#22c55e",
								},
							},
							error: {
								style: {
									background: "#ef4444",
								},
							},
						}}
					/>
				</AuthProvider>
			</body>
		</html>
	)
}
