"use client"

import { useState } from "react"
import { PlayIcon, TrashIcon, DocumentTextIcon, CodeBracketIcon } from "@heroicons/react/24/outline"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import type { SupportedLanguage, ReviewType } from "@/types/codeReview"

interface ReviewFormProps {
	language: SupportedLanguage
	onLanguageChange: (language: SupportedLanguage) => void
	filename: string
	onFilenameChange: (filename: string) => void
	reviewType: ReviewType
	onReviewTypeChange: (type: ReviewType) => void
	customInstructions: string
	onCustomInstructionsChange: (instructions: string) => void
	onSubmit: () => void
	onClear: () => void
	isLoading: boolean
	disabled: boolean
}

const languages: { value: SupportedLanguage; label: string }[] = [
	{ value: "javascript", label: "JavaScript" },
	{ value: "typescript", label: "TypeScript" },
	{ value: "python", label: "Python" },
	{ value: "java", label: "Java" },
	{ value: "cpp", label: "C++" },
	{ value: "csharp", label: "C#" },
	{ value: "go", label: "Go" },
	{ value: "rust", label: "Rust" },
	{ value: "php", label: "PHP" },
	{ value: "ruby", label: "Ruby" },
	{ value: "swift", label: "Swift" },
	{ value: "kotlin", label: "Kotlin" },
	{ value: "scala", label: "Scala" },
	{ value: "html", label: "HTML" },
	{ value: "css", label: "CSS" },
	{ value: "sql", label: "SQL" },
	{ value: "yaml", label: "YAML" },
	{ value: "json", label: "JSON" },
	{ value: "markdown", label: "Markdown" },
	{ value: "dockerfile", label: "Dockerfile" },
	{ value: "shell", label: "Shell" },
]

const reviewTypes: { value: ReviewType; label: string; description: string }[] = [
	{
		value: "comprehensive",
		label: "Comprehensive",
		description: "Full analysis including security, performance, and style",
	},
	{
		value: "security",
		label: "Security",
		description: "Focus on security vulnerabilities and best practices",
	},
	{
		value: "performance",
		label: "Performance",
		description: "Optimize for speed, memory usage, and efficiency",
	},
	{
		value: "style",
		label: "Style & Standards",
		description: "Code style, formatting, and best practices",
	},
]

export function ReviewForm({
	language,
	onLanguageChange,
	filename,
	onFilenameChange,
	reviewType,
	onReviewTypeChange,
	customInstructions,
	onCustomInstructionsChange,
	onSubmit,
	onClear,
	isLoading,
	disabled,
}: ReviewFormProps) {
	const [showAdvanced, setShowAdvanced] = useState(false)

	return (
		<div className="space-y-6">
			{/* Language Selection */}
			<div>
				<label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					<CodeBracketIcon className="inline w-4 h-4 mr-1" />
					Programming Language
				</label>
				<select
					id="language"
					value={language}
					onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
					className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
					disabled={isLoading}>
					{languages.map((lang) => (
						<option key={lang.value} value={lang.value}>
							{lang.label}
						</option>
					))}
				</select>
			</div>

			{/* Filename */}
			<div>
				<label htmlFor="filename" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					<DocumentTextIcon className="inline w-4 h-4 mr-1" />
					Filename (optional)
				</label>
				<input
					type="text"
					id="filename"
					value={filename}
					onChange={(e) => onFilenameChange(e.target.value)}
					placeholder="e.g., user-service.js"
					className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
					disabled={isLoading}
				/>
			</div>

			{/* Review Type */}
			<div>
				<label htmlFor="reviewType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					Review Type
				</label>
				<select
					id="reviewType"
					value={reviewType}
					onChange={(e) => onReviewTypeChange(e.target.value as ReviewType)}
					className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
					disabled={isLoading}>
					{reviewTypes.map((type) => (
						<option key={type.value} value={type.value}>
							{type.label} - {type.description}
						</option>
					))}
				</select>
			</div>

			{/* Advanced Options Toggle */}
			<div>
				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
					disabled={isLoading}>
					{showAdvanced ? "Hide" : "Show"} Advanced Options
				</button>
			</div>

			{/* Custom Instructions */}
			{showAdvanced && (
				<div>
					<label
						htmlFor="customInstructions"
						className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Custom Instructions (optional)
					</label>
					<textarea
						id="customInstructions"
						value={customInstructions}
						onChange={(e) => onCustomInstructionsChange(e.target.value)}
						placeholder="Add specific instructions for the code review..."
						rows={3}
						className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none"
						disabled={isLoading}
					/>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Provide specific guidance or context for the AI review
					</p>
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex space-x-3">
				<button
					onClick={onSubmit}
					disabled={disabled || isLoading}
					className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
					{isLoading ? (
						<>
							<LoadingSpinner size="sm" className="mr-2" />
							Analyzing...
						</>
					) : (
						<>
							<PlayIcon className="w-4 h-4 mr-2" />
							Analyze Code
						</>
					)}
				</button>

				<button
					onClick={onClear}
					disabled={isLoading}
					className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
					<TrashIcon className="w-4 h-4" />
				</button>
			</div>
		</div>
	)
}
