import { logger } from "../utils/logger"

export class ResultCache {
	private static instance: ResultCache
	private cache = new Map<string, { value: any; expiresAt: number }>()
	private defaultTtlMs = 60 * 60 * 1000 // 1 hour

	private constructor() {}

	public static getInstance(): ResultCache {
		if (!ResultCache.instance) {
			ResultCache.instance = new ResultCache()
		}
		return ResultCache.instance
	}

	public set(key: string, value: any, ttlMs: number = this.defaultTtlMs): void {
		const expiresAt = Date.now() + ttlMs
		this.cache.set(key, { value, expiresAt })
	}

	public get<T = any>(key: string): T | undefined {
		const entry = this.cache.get(key)
		if (!entry) return undefined
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key)
			return undefined
		}
		return entry.value as T
	}

	public delete(key: string): boolean {
		return this.cache.delete(key)
	}

	public clear(): void {
		this.cache.clear()
	}

	public cleanup(): void {
		const now = Date.now()
		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) this.cache.delete(key)
		}
	}
}
