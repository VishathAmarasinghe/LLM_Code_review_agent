import * as fs from "node:fs"
import * as path from "node:path"

export interface ListFilesOptions {
	recursive?: boolean
	limit?: number
}

export interface ListedEntry {
	name: string
	type: "file" | "folder"
}

export async function listFiles(
	cwd: string,
	relDirPath: string,
	options: ListFilesOptions = {},
): Promise<ListedEntry[]> {
	const absolute = path.resolve(cwd, relDirPath)
	const entries = await fs.promises.readdir(absolute, { withFileTypes: true })
	const out: ListedEntry[] = []

	for (const e of entries) {
		out.push({ name: e.name, type: e.isDirectory() ? "folder" : "file" })
		if (options.limit && out.length >= options.limit) break
	}

	return out
}
