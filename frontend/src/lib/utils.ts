import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
	return clsx(inputs)
}

export function formatDate(date: Date | string): string {
	const d = new Date(date)
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

export function formatFileSize(bytes: number): string {
	const sizes = ["Bytes", "KB", "MB", "GB"]
	if (bytes === 0) return "0 Bytes"
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
}

export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength) + "..."
}

export function getSeverityColor(severity: string): string {
	switch (severity) {
		case "critical":
			return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20"
		case "high":
			return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20"
		case "medium":
			return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20"
		case "low":
			return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20"
		default:
			return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20"
	}
}

export function getIssueTypeColor(type: string): string {
	switch (type) {
		case "security":
			return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20"
		case "error":
			return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20"
		case "warning":
			return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20"
		case "suggestion":
			return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20"
		default:
			return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20"
	}
}

export function getMetricScore(score: number): {
	label: string
	color: string
	bgColor: string
} {
	if (score >= 80) {
		return {
			label: "Excellent",
			color: "text-green-600 dark:text-green-400",
			bgColor: "bg-green-500",
		}
	} else if (score >= 60) {
		return {
			label: "Good",
			color: "text-blue-600 dark:text-blue-400",
			bgColor: "bg-blue-500",
		}
	} else if (score >= 40) {
		return {
			label: "Average",
			color: "text-yellow-600 dark:text-yellow-400",
			bgColor: "bg-yellow-500",
		}
	} else {
		return {
			label: "Poor",
			color: "text-red-600 dark:text-red-400",
			bgColor: "bg-red-500",
		}
	}
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null

	return (...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => func(...args), wait)
	}
}

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
	let inThrottle: boolean

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args)
			inThrottle = true
			setTimeout(() => (inThrottle = false), limit)
		}
	}
}
