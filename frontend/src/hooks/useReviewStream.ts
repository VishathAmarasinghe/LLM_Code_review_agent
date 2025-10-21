import { useCallback, useEffect, useRef, useState } from "react"
import { apiClient } from "@/lib/api"

export type ReviewEvent = {
	type: string
	taskId?: string
	stepId?: string
	message?: string
	data?: any
	timestamp?: string
}

export function useReviewStream() {
	const [taskId, setTaskId] = useState<string | null>(null)
	const [events, setEvents] = useState<ReviewEvent[]>([])
	const [status, setStatus] = useState<"idle" | "running" | "completed" | "failed">("idle")
	const [error, setError] = useState<string | null>(null)
	const eventSourceRef = useRef<EventSource | null>(null)

	const startReview = useCallback(async (owner: string, repo: string, prNumber: number) => {
		setError(null)
		setEvents([])
		setStatus("running")

		try {
			const resp = await apiClient.post<{ success: boolean; data?: { taskId: string }; error?: string }>(
				`/code-review/start/${owner}/${repo}/${prNumber}`,
			)
			const id = resp.data?.data?.taskId
			if (!id) throw new Error(resp.data?.error || "Failed to start review")
			setTaskId(id)

			// Open SSE connection
			const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
			const es = new EventSource(`${base}/events/stream?taskId=${encodeURIComponent(id)}`)
			eventSourceRef.current = es

			es.addEventListener("connected", (e) => {
				console.log("SSE connected:", (e as MessageEvent).data)
				setEvents((prev) => [...prev, { type: "connected", data: (e as MessageEvent).data } as any])
			})

			// Add a generic event listener to catch all events for debugging
			es.addEventListener("message", (e) => {
				console.log("SSE message received:", e.type, e.data)
			})

			es.addEventListener("workflow_started", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("assistant_delta", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("tool_call_started", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("tool_call_completed", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("step_started", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("step_completed", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("step_failed", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				setEvents((prev) => [...prev, payload])
				setStatus("failed")
			})
			es.addEventListener("llm_input", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				console.log("Received llm_input event:", payload)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("llm_output", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				console.log("Received llm_output event:", payload)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("thinking_checkpoint", (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				console.log("Received thinking_checkpoint event:", payload)
				setEvents((prev) => [...prev, payload])
			})
			es.addEventListener("workflow_completed", async (e) => {
				const payload = JSON.parse((e as MessageEvent).data)
				setEvents((prev) => [...prev, payload])
				setStatus("completed")
				// Close stream
				es.close()
				// Optionally fetch final aggregate result
				try {
					const res = await apiClient.get<{ success: boolean; data?: any }>(`/code-review/result/${id}`)
					if (res.data?.data) {
						setEvents((prev) => [...prev, { type: "final_result", data: res.data.data }])
					}
				} catch (_) {}
			})

			es.onerror = () => {
				setError("Connection lost")
			}
		} catch (err: any) {
			setError(err?.message || "Failed to start review")
			setStatus("failed")
		}
	}, [])

	useEffect(() => {
		return () => {
			eventSourceRef.current?.close()
		}
	}, [])

	return { taskId, events, status, error, startReview }
}
