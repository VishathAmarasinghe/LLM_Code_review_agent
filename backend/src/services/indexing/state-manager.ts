import { EventEmitter } from "events"
import { IndexingState, IndexingProgress } from "./interfaces"

export class CodeIndexStateManager {
	private _state: IndexingState["state"] = "Standby"
	private _message: string = ""
	private _progress: number = 0
	private _processedFiles: number = 0
	private _totalFiles: number = 0
	private _indexedBlocks: number = 0
	private _totalBlocks: number = 0
	private _currentFile?: string

	private _progressUpdateEmitter = new EventEmitter()

	public get onProgressUpdate() {
		return this._progressUpdateEmitter
	}

	public get state(): IndexingState["state"] {
		return this._state
	}

	public get message(): string {
		return this._message
	}

	public get progress(): number {
		return this._progress
	}

	public get processedFiles(): number {
		return this._processedFiles
	}

	public get totalFiles(): number {
		return this._totalFiles
	}

	public get indexedBlocks(): number {
		return this._indexedBlocks
	}

	public get totalBlocks(): number {
		return this._totalBlocks
	}

	public get currentFile(): string | undefined {
		return this._currentFile
	}

	/**
	 * Sets the system state
	 */
	public setSystemState(state: IndexingState["state"], message: string): void {
		this._state = state
		this._message = message
		this._emitProgressUpdate()
	}

	/**
	 * Reports file queue progress
	 */
	public reportFileQueueProgress(processedInBatch: number, totalInBatch: number, currentFile?: string): void {
		this._currentFile = currentFile
		this._emitProgressUpdate()
	}

	/**
	 * Reports block indexing progress
	 */
	public reportBlockIndexingProgress(indexedBlocks: number, totalBlocks: number): void {
		this._indexedBlocks = indexedBlocks
		this._totalBlocks = totalBlocks

		if (totalBlocks > 0) {
			this._progress = Math.round((indexedBlocks / totalBlocks) * 100)
		}

		this._emitProgressUpdate()
	}

	/**
	 * Gets the current status
	 */
	public getCurrentStatus(): IndexingProgress {
		return {
			jobId: 0, // Will be set by the caller
			status:
				this._state === "Standby"
					? "pending"
					: this._state === "Indexing"
						? "running"
						: this._state === "Indexed"
							? "completed"
							: "failed",
			progress: this._progress,
			processedFiles: this._processedFiles,
			totalFiles: this._totalFiles,
			indexedBlocks: this._indexedBlocks,
			totalBlocks: this._totalBlocks,
			stage: this._state === "Indexing" ? "scanning" : "completed",
			message: this._message,
			currentFile: this._currentFile,
		}
	}

	/**
	 * Disposes the state manager
	 */
	public dispose(): void {
		this._progressUpdateEmitter.removeAllListeners()
	}

	/**
	 * Emits progress update
	 */
	private _emitProgressUpdate(): void {
		this._progressUpdateEmitter.emit("progressUpdate", this.getCurrentStatus())
	}
}
