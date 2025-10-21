"use client"

import React from "react"
import { ReviewEvent } from "@/hooks/useReviewStream"

export function ReviewResults({ events }: { events?: ReviewEvent[] }) {
	if (!events || events.length === 0) {
		return (
			<div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
				<div className="text-sm text-gray-500 dark:text-gray-400">No activity yet...</div>
			</div>
		)
	}

	const getEventIcon = (type: string) => {
		switch (type) {
			case "connected":
				return "🔗"
			case "workflow_started":
				return "🚀"
			case "assistant_delta":
				return "💬"
			case "tool_call_started":
				return "🛠️"
			case "tool_call_completed":
				return "✅"
			case "step_started":
				return "⚡"
			case "step_completed":
				return "✅"
			case "step_failed":
				return "❌"
			case "workflow_completed":
				return "🎉"
			case "workflow_failed":
				return "💥"
			case "final_result":
				return "📋"
			default:
				return "📝"
		}
	}

	const getEventColor = (type: string) => {
		switch (type) {
			case "connected":
				return "text-green-600 dark:text-green-400"
			case "workflow_started":
				return "text-blue-600 dark:text-blue-400"
			case "assistant_delta":
				return "text-blue-700 dark:text-blue-300"
			case "tool_call_started":
				return "text-indigo-600 dark:text-indigo-400"
			case "tool_call_completed":
				return "text-green-600 dark:text-green-400"
			case "step_started":
				return "text-yellow-600 dark:text-yellow-400"
			case "step_completed":
				return "text-green-600 dark:text-green-400"
			case "step_failed":
				return "text-red-600 dark:text-red-400"
			case "workflow_completed":
				return "text-green-600 dark:text-green-400"
			case "workflow_failed":
				return "text-red-600 dark:text-red-400"
			case "final_result":
				return "text-purple-600 dark:text-purple-400"
			default:
				return "text-gray-600 dark:text-gray-400"
		}
	}

	return (
		<div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
			<div className="text-sm font-medium mb-3 text-gray-800 dark:text-gray-200">
				Live Review Activity ({events.length} events)
			</div>
			<div className="space-y-2 text-xs overflow-y-auto max-h-80">
				{events.map((event, idx) => (
					<div key={idx} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
						<span className="text-lg">{getEventIcon(event.type)}</span>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<span className={`font-medium ${getEventColor(event.type)}`}>
									{event.type.replace(/_/g, " ").toUpperCase()}
								</span>
								<span className="text-gray-400 text-xs">
									{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ""}
								</span>
							</div>
							{/* Assistant streaming text */}
							{event.type === "assistant_delta" && event.data?.text && (
								<div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
									{event.data.text}
								</div>
							)}
							{/* Tool calls */}
							{event.type === "tool_call_started" && (
								<div className="text-gray-700 dark:text-gray-300">
									Calling <span className="font-mono">{event.data?.name}</span> with params:
									<div className="text-gray-600 dark:text-gray-400 font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto mt-1">
										<pre>{JSON.stringify(event.data?.params ?? {}, null, 2)}</pre>
									</div>
								</div>
							)}
							{event.type === "tool_call_completed" && (
								<div className="text-gray-700 dark:text-gray-300">
									<span className="font-mono">{event.data?.name}</span> completed
									{event.data?.error ? (
										<span className="text-red-600 dark:text-red-400"> with error</span>
									) : (
										<span> successfully</span>
									)}
									{(event.data?.result || event.data?.error) && (
										<div className="text-gray-600 dark:text-gray-400 font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto mt-1">
											<pre>
												{JSON.stringify(
													event.data?.error
														? { error: event.data.error }
														: event.data?.result,
													null,
													2,
												)}
											</pre>
										</div>
									)}
								</div>
							)}
							{/* Fallback generic message */}
							{event.message && event.type !== "assistant_delta" && (
								<div className="text-gray-700 dark:text-gray-300 mb-1">{event.message}</div>
							)}
							{event.data &&
								!["assistant_delta", "tool_call_started", "tool_call_completed"].includes(
									event.type,
								) && (
									<div className="text-gray-600 dark:text-gray-400 font-mono text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
										<pre>{JSON.stringify(event.data, null, 2)}</pre>
									</div>
								)}
							{event.stepId && (
								<div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Step: {event.stepId}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
