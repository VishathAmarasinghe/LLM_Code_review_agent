import { EventEmitter } from "events"

export type EventPayload = {
	type: string
	taskId?: string
	stepId?: string
	message?: string
	data?: any
	timestamp?: string
}

export class EventBus {
	private static instance: EventBus
	private emitter = new EventEmitter()

	private constructor() {}

	public static getInstance(): EventBus {
		if (!EventBus.instance) {
			EventBus.instance = new EventBus()
		}
		return EventBus.instance
	}

	public publish(channel: string, event: EventPayload): void {
		this.emitter.emit(channel, { ...event, timestamp: new Date().toISOString() })
	}

	public subscribe(channel: string, handler: (event: EventPayload) => void): () => void {
		const wrapped = (event: EventPayload) => handler(event)
		this.emitter.on(channel, wrapped)
		return () => this.emitter.off(channel, wrapped)
	}
}
