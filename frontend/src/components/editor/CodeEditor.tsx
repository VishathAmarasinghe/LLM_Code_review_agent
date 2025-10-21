"use client"

interface CodeEditorProps {
	value: string
	onChange: (value: string) => void
	language: string
	placeholder?: string
}

export function CodeEditor({ value, onChange, language, placeholder }: CodeEditorProps) {
	return (
		<div className="relative">
			<textarea
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full h-96 p-4 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white resize-none"
				style={{ fontFamily: "JetBrains Mono, Menlo, Monaco, monospace" }}
			/>
		</div>
	)
}
