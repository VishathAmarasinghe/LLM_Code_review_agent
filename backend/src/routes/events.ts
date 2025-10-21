import { Router } from "express"
import { EventBus } from "../services/eventBus"

const router = Router()

// SSE: /api/events/stream?taskId=...
router.get("/stream", (req, res) => {
	const taskId = (req.query.taskId as string) || "global"
	const channel = `task:${taskId}`

	res.setHeader("Content-Type", "text/event-stream")
	res.setHeader("Cache-Control", "no-cache")
	res.setHeader("Connection", "keep-alive")
	res.flushHeaders?.()

	const unsubscribe = EventBus.getInstance().subscribe(channel, (event) => {
		res.write(`event: ${event.type}\n`)
		res.write(`data: ${JSON.stringify(event)}\n\n`)
	})

	req.on("close", () => {
		unsubscribe()
		res.end()
	})

	// initial ping
	res.write(`event: connected\n`)
	res.write(`data: ${JSON.stringify({ ok: true, taskId })}\n\n`)
})

export default router
