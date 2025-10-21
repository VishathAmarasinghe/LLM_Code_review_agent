import { cn } from "@/lib/utils"
import {
	ExclamationTriangleIcon,
	InformationCircleIcon,
	CheckCircleIcon,
	XCircleIcon,
} from "@heroicons/react/24/outline"

interface AlertProps {
	variant?: "info" | "success" | "warning" | "error"
	className?: string
	children: React.ReactNode
}

const variantClasses = {
	info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
	success:
		"bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
	warning:
		"bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
	error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
}

const iconMap = {
	info: InformationCircleIcon,
	success: CheckCircleIcon,
	warning: ExclamationTriangleIcon,
	error: XCircleIcon,
}

export function Alert({ variant = "info", className, children }: AlertProps) {
	const Icon = iconMap[variant]

	return (
		<div
			className={cn("rounded-lg border p-4 flex items-start space-x-3", variantClasses[variant], className)}
			role="alert">
			<Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
			<div className="flex-1 text-sm">{children}</div>
		</div>
	)
}
