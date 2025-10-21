import * as fs from "node:fs"
import * as path from "node:path"

export interface ReadFileOptions {
	startLine?: number
	lineLimit?: number
}

export interface ReadFileResult {
	filePath: string
	lineCount: number
	content: string
	startLine: number
	endLine: number
}

export async function readFileWithRange(
	cwd: string,
	relPath: string,
	options: ReadFileOptions = {},
): Promise<ReadFileResult> {
	const absolutePath = path.resolve(cwd, relPath)
	const raw = await fs.promises.readFile(absolutePath, "utf8")
	const lines = raw.split(/\r?\n/)

	const startLine = Math.max(1, options.startLine ?? 1)
	const limit = options.lineLimit ?? lines.length
	const startIdx = Math.min(lines.length, startLine - 1)
	const endIdx = Math.min(lines.length, startIdx + limit)
	const selected = lines.slice(startIdx, endIdx)

	return {
		filePath: path.relative(cwd, absolutePath),
		lineCount: lines.length,
		content: selected.join("\n"),
		startLine,
		endLine: startIdx + selected.length,
	}
}
