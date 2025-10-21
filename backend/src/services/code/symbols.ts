import * as fs from "node:fs"
import * as path from "node:path"

export interface CodeDefinition {
	name: string
	kind: "function" | "class" | "interface" | "type" | "unknown"
	startLine: number
	endLine: number
}

export async function listCodeDefinitionNames(cwd: string, relPath: string): Promise<CodeDefinition[]> {
	const absolute = path.resolve(cwd, relPath)
	const content = await fs.promises.readFile(absolute, "utf8")
	const lines = content.split(/\r?\n/)

	const defs: CodeDefinition[] = []
	const push = (name: string, kind: CodeDefinition["kind"], line: number) => {
		defs.push({ name, kind, startLine: line, endLine: line })
	}

	const fnRe = /function\s+([A-Za-z0-9_]+)/
	const clsRe = /class\s+([A-Za-z0-9_]+)/
	const ifaceRe = /interface\s+([A-Za-z0-9_]+)/
	const typeRe = /type\s+([A-Za-z0-9_]+)\s*=\s*/

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		let m
		if ((m = fnRe.exec(line))) push(m[1], "function", i + 1)
		else if ((m = clsRe.exec(line))) push(m[1], "class", i + 1)
		else if ((m = ifaceRe.exec(line))) push(m[1], "interface", i + 1)
		else if ((m = typeRe.exec(line))) push(m[1], "type", i + 1)
	}

	return defs
}
