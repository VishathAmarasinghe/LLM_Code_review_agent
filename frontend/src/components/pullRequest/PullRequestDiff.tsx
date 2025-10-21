"use client"

import React from "react"
import { PullRequestFile } from "@/types/pullRequest"

interface PullRequestDiffProps {
	file: PullRequestFile
}

const classify = (line: string) => {
	if (line.startsWith("@@")) return "hunk"
	if (line.startsWith("+++") || line.startsWith("---")) return "meta"
	if (line.startsWith("+")) return "add"
	if (line.startsWith("-")) return "del"
	return "ctx"
}

export function PullRequestDiff({ file }: PullRequestDiffProps) {
	const patch = file.patch || ""

	if (!patch) {
		return <div className="text-sm text-gray-500 dark:text-gray-400 italic">No diff available for this file.</div>
	}

	let leftLine = 0
	let rightLine = 0

	const rows = patch.split("\n").map((raw, idx) => {
		const type = classify(raw)

		if (raw.startsWith("@@")) {
			// Parse hunk header like @@ -1,5 +1,7 @@
			const match = raw.match(/@@\s*-([0-9]+)(?:,[0-9]+)?\s*\+([0-9]+)(?:,[0-9]+)?\s*@@/)
			if (match) {
				leftLine = parseInt(match[1], 10)
				rightLine = parseInt(match[2], 10)
			}
			return { key: idx, type, left: "", right: "", text: raw }
		}

		let left = ""
		let right = ""

		if (type === "add") {
			right = String(rightLine++)
		} else if (type === "del") {
			left = String(leftLine++)
		} else if (type === "ctx") {
			left = String(leftLine++)
			right = String(rightLine++)
		}

		return { key: idx, type, left, right, text: raw }
	})

	return (
		<div className="overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
			<table className="min-w-full text-xs">
				<colgroup>
					<col className="w-12" />
					<col className="w-12" />
					<col />
				</colgroup>
				<tbody>
					{rows.map((row) => {
						const base = "whitespace-pre px-3 py-0.5"
						const bg =
							row.type === "add"
								? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300"
								: row.type === "del"
									? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300"
									: row.type === "hunk"
										? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
										: row.type === "meta"
											? "bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400"
											: "text-gray-800 dark:text-gray-200"

						return (
							<tr key={row.key} className={bg}>
								<td className="select-none text-right pr-2 pl-3 text-gray-400">{row.left}</td>
								<td className="select-none text-right pr-2 text-gray-400">{row.right}</td>
								<td className={base}>{row.text}</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

export default PullRequestDiff
