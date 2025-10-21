import { WorkspaceManager } from "../workspace/workspaceManager"
import { AgentOrchestrator } from "../orchestration"
import { githubService } from "./githubService"
import { ResultCache } from "./resultCache"
import { logger } from "../utils/logger"

export class PrReviewService {
	/**
	 * Extract the final summary message from the full LLM response
	 * This should be the last message before <finish></finish> tag
	 */
	private extractFinalSummary(fullText: string): string {
		if (!fullText || !fullText.trim()) {
			return ""
		}

		// Look for the <finish></finish> tag
		const finishIndex = fullText.lastIndexOf("<finish></finish>")
		if (finishIndex === -1) {
			// No finish tag found, return the full text
			return fullText.trim()
		}

		// Find the start of the final message (look for the last significant content before finish)
		// We want to capture the final summary, not the entire conversation
		const beforeFinish = fullText.substring(0, finishIndex).trim()

		// Look for patterns that indicate the start of the final summary
		const finalSummaryPatterns = [
			/## 🚨 CODE SMELLS & ANTI-PATTERNS DETECTED[\s\S]*$/i,
			/## 📋 Executive Summary[\s\S]*$/i,
			/## 🔍 Code Smell Analysis Details[\s\S]*$/i,
			/## 🚨 CRITICAL: Structured JSON Output[\s\S]*$/i,
			/### 🚨 CODE SMELLS & ANTI-PATTERNS DETECTED[\s\S]*$/i,
			/### 📋 Executive Summary[\s\S]*$/i,
			/### 🔍 Code Smell Analysis Details[\s\S]*$/i,
			/### 🚨 CRITICAL: Structured JSON Output[\s\S]*$/i,
			/Executive Summary[\s\S]*$/i,
			/Final Summary[\s\S]*$/i,
			/Summary[\s\S]*$/i,
			/## Final Assessment[\s\S]*$/i,
			/## Key Findings[\s\S]*$/i,
			/## Recommendations[\s\S]*$/i,
			/## Overall Assessment[\s\S]*$/i,
		]

		// Try to find the start of the final summary
		for (const pattern of finalSummaryPatterns) {
			const match = beforeFinish.match(pattern)
			if (match) {
				return match[0].trim()
			}
		}

		// If no specific pattern found, try to find the last substantial content
		// Look for the last section that contains structured content
		const sections = beforeFinish.split(/\n\s*\n/)
		const lastSubstantialSection = sections[sections.length - 1]

		if (lastSubstantialSection && lastSubstantialSection.length > 100) {
			return lastSubstantialSection.trim()
		}

		// Fallback: return the last 2000 characters (should be the final summary)
		const fallback =
			beforeFinish.length > 2000 ? beforeFinish.substring(beforeFinish.length - 2000).trim() : beforeFinish.trim()

		return fallback
	}

	public async startPrReview(params: {
		owner: string
		repo: string
		prNumber: number
		userId: number
		accessToken: string
	}): Promise<{ id: string }> {
		const { owner, repo, prNumber, userId, accessToken } = params

		const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

		const pr = await githubService.getPullRequest(accessToken, owner, repo, prNumber)
		const repository = await githubService.getRepository(accessToken, owner, repo)
		const repositoryId = Number(repository.id)

		const workspaceManager = await WorkspaceManager.getInstance().createPRWorkspace(
			{
				owner,
				repo,
				fullName: `${owner}/${repo}`,
				// include repositoryId inside workspace context for later derivation
				repositoryId,
				defaultBranch: repository.default_branch || "",
				cloneUrl: repository.clone_url || "",
				sshUrl: repository.ssh_url || "",
				htmlUrl: repository.html_url || "",
				isPrivate: !!repository.private,
				language: repository.language || "",
				description: repository.description || "",
			} as any,
			{
				number: pr.number,
				title: pr.title,
				body: pr.body || "",
				state: (pr.state === "open" ? "open" : pr.merged_at ? "merged" : "closed") as any,
				head: {
					ref: pr.head.ref,
					sha: pr.head.sha,
					repo: {
						owner,
						repo,
						fullName: `${owner}/${repo}`,
						repositoryId,
						defaultBranch: repository.default_branch || "",
						cloneUrl: repository.clone_url || "",
						sshUrl: repository.ssh_url || "",
						htmlUrl: repository.html_url || "",
						isPrivate: !!repository.private,
						language: repository.language || "",
						description: repository.description || "",
					} as any,
				},
				base: {
					ref: pr.base.ref,
					sha: pr.base.sha,
					repo: {
						owner,
						repo,
						fullName: `${owner}/${repo}`,
						repositoryId,
						defaultBranch: repository.default_branch || "",
						cloneUrl: repository.clone_url || "",
						sshUrl: repository.ssh_url || "",
						htmlUrl: repository.html_url || "",
						isPrivate: !!repository.private,
						language: repository.language || "",
						description: repository.description || "",
					} as any,
				},
				user: {
					login: pr.user.login,
					id: pr.user.id,
					avatar_url: pr.user.avatar_url,
				},
				created_at: pr.created_at,
				updated_at: pr.updated_at,
				merged_at: pr.merged_at,
				closed_at: pr.closed_at,
			},
			accessToken,
		)

		const context = {
			workspacePath: workspaceManager.getWorkspaceContext().workspacePath,
			userId: Number(userId),
			pullRequestId: pr.number,
			variables: { taskId, owner, repo, prNumber },
			results: new Map<string, any>(),
			metadata: { workflowType: "code_review", repo: `${owner}/${repo}` },
			workspaceManager,
			accessToken,
			repositoryId,
		}

		const orchestrator = AgentOrchestrator.getInstance()
		orchestrator
			.executeCodeReview(userId, context as any)
			.then(async (workflowResult) => {
				// Extract orchestrator step result from workflow engine results map
				const resultsContainer: any = (workflowResult as any)?.results
				let orchestrated: any = null
				if (resultsContainer && typeof resultsContainer.get === "function") {
					// Map<string, any>
					for (const v of resultsContainer.values()) {
						orchestrated = v
						break
					}
				} else if (Array.isArray(resultsContainer)) {
					orchestrated = resultsContainer[0]
				} else if (resultsContainer && typeof resultsContainer === "object") {
					const firstKey = Object.keys(resultsContainer)[0]
					orchestrated = resultsContainer[firstKey as any]
				}

				// Normalize result into text + structured issues
				const fullText = orchestrated?.response ?? (workflowResult as any)?.response ?? ""
				const structured = orchestrated?.structured ?? (workflowResult as any)?.structured ?? { issues: [] }

				// Extract only the final summary message (the last message before <finish></finish>)
				const text = this.extractFinalSummary(fullText)

				logger.info("Review result extracted:", {
					fullTextLength: fullText.length,
					finalSummaryLength: text.length,
					structuredIssuesCount: structured.issues?.length || 0,
				})

				// Prepare GitHub review posting (precise inline comments + summary)
				try {
					const changedFiles = await githubService.getPullRequestFiles(accessToken, owner, repo, prNumber)
					const validPaths = new Set((changedFiles || []).map((f: any) => f.filename))

					// Build a quick lookup of file patch hunks for mapping HEAD lines to diff lines
					const filePatchByPath = new Map<string, string>()
					for (const f of changedFiles || []) {
						if (f && typeof f.filename === "string" && typeof f.patch === "string") {
							filePatchByPath.set(f.filename, f.patch as string)
						}
					}

					const mapHeadToDiffLine = (patch: string | undefined, headLine: number): number | null => {
						if (!patch || !Number.isFinite(headLine)) return null
						const lines: string[] = (patch || "").split("\n")
						let curOld = 0
						let curNew = 0
						for (const hunkLine of lines) {
							if (hunkLine.startsWith("@@")) {
								// Parse hunk header: @@ -a,b +c,d @@
								const m = hunkLine.match(/\+([0-9]+)(?:,([0-9]+))?/) // capture c and optional d
								if (m && m[1]) {
									curNew = parseInt(m[1], 10)
								}
								continue
							}
							if (hunkLine.startsWith(" ")) {
								// context line: both counters advance
								if (curNew === headLine) return curNew
								curNew++
								continue
							}
							if (hunkLine.startsWith("+")) {
								// addition: advances new only
								if (curNew === headLine) return curNew
								curNew++
								continue
							}
							if (hunkLine.startsWith("-")) {
								// deletion: advances old only (new does not change)
								continue
							}
						}
						return null
					}

					// Build line comments from structured issues bound to a line and valid path
					const rawLineIssues = (structured.issues as any[])
						.filter(
							(i: any) =>
								i &&
								typeof i.path === "string" &&
								Number.isFinite(Number(i.line)) &&
								validPaths.has(i.path),
						)
						.slice(0, 50) // safety cap

					const lineComments = rawLineIssues
						.map((i: any) => {
							const patch = filePatchByPath.get(i.path)
							const mappedEnd = mapHeadToDiffLine(patch, Number(i.line))
							const mappedStart = Number.isFinite(Number(i?.range?.startLine))
								? mapHeadToDiffLine(patch, Number(i.range.startLine))
								: null

							// Check if this issue has a code suggestion (specific code change)
							const hasCodeSuggestion =
								i.codeSuggestion && i.codeSuggestion.oldCode && i.codeSuggestion.newCode

							// Check if this is a code smell or anti-pattern
							const isCodeSmell = i.type === "code_smell" || i.type === "anti_pattern"

							let body = `[${(i.severity || "info").toString().toUpperCase()}] ${i.message || ""}`

							// Add context for code smells and anti-patterns
							if (isCodeSmell) {
								body += `\n\n**${i.type === "code_smell" ? "Code Smell" : "Anti-Pattern"}** detected`
							}

							if (hasCodeSuggestion && i.codeSuggestion) {
								// Use GitHub suggestion block for specific code changes
								body += `\n\n\`\`\`suggestion\n${i.codeSuggestion.newCode}\n\`\`\``
							} else if (i.improvement) {
								// Use regular text for general suggestions
								body += `\n\nSuggested change:\n\n${i.improvement}`
							}

							return {
								path: i.path,
								line: mappedEnd !== null ? mappedEnd : undefined,
								body: body,
								side: "RIGHT" as const,
								start_line:
									mappedStart !== null && mappedStart !== (mappedEnd ?? Number(i.line))
										? mappedStart
										: undefined,
								start_side: "RIGHT" as const,
							}
						})
						// Only keep comments that mapped to a valid diff line (GitHub requires diff context)
						.filter((c: any) => Number.isFinite(c.line))

					// Summary body for non-line or invalid-path issues
					const summaryIssues = (structured.issues as any[]).filter(
						(i: any) =>
							!(
								i &&
								Number.isFinite(Number(i.line)) &&
								typeof i.path === "string" &&
								validPaths.has(i.path)
							),
					)
					const summaryBody =
						`Automated review summary for ${owner}/${repo} PR #${prNumber}` +
						(summaryIssues.length
							? `\n\nGeneral findings:\n` +
								summaryIssues
									.slice(0, 50)
									.map(
										(i: any) =>
											`- ${i.path ? `${i.path}: ` : ""}[${(i.severity || "info").toString().toUpperCase()}] ${i.message || ""}`,
									)
									.join("\n")
							: "")

					// Prefer precise per-comment API to ensure inline visibility (supports multi-line)
					for (const c of lineComments) {
						logger.info("Attempting inline PR comment", {
							owner,
							repo,
							prNumber,
							path: c.path,
							headLine: (c as any)._debug?.headLine,
							mappedLine: c.line,
							mappedStart: c.start_line,
						})
						try {
							const payload: any = { path: c.path, body: c.body }
							if (Number.isFinite(c.start_line)) {
								payload.start_line = c.start_line
								payload.start_side = c.start_side
							}
							if (Number.isFinite(c.line)) {
								payload.line = c.line
								payload.side = c.side
							}
							await githubService.createPullRequestLineComment(
								accessToken,
								owner,
								repo,
								prNumber,
								payload,
							)
							logger.info("Inline PR comment posted", {
								path: c.path,
								line: c.line,
								start_line: c.start_line,
							})
						} catch (e: any) {
							const errData = e?.response?.data || e?.message || String(e)
							logger.warn("Inline PR comment failed", {
								path: c.path,
								line: c.line,
								start_line: c.start_line,
								error: errData,
							})
							// continue with others
						}
					}

					// Post the full LLM review response as the main comment
					const fullReviewBody = text && text.trim() ? text.trim() : summaryBody

					await githubService.createPullRequestReview(accessToken, owner, repo, prNumber, {
						body: fullReviewBody,
						event: "COMMENT",
						comments: [],
					})

					logger.info("Posted full LLM review response as PR comment", {
						owner,
						repo,
						prNumber,
						responseLength: fullReviewBody.length,
					})
				} catch (e) {
					// Swallow posting failures to avoid breaking result delivery
				}

				ResultCache.getInstance().set(taskId, {
					success: true,
					text,
					structured,
				})
			})
			.catch((err) => {
				ResultCache.getInstance().set(taskId, { success: false, error: err?.message || "failed" })
			})

		return { id: taskId }
	}

	public async getReviewResult(taskId: string): Promise<any | null> {
		return ResultCache.getInstance().get(taskId) || null
	}

	/**
	 * Utility: Post a test inline comment to a PR for a given file and HEAD line range
	 */
	public async postTestInlineComment(params: {
		owner: string
		repo: string
		prNumber: number
		accessToken: string
		path: string
		startLine: number
		endLine: number
		body: string
	}): Promise<{ success: boolean; posted?: any; reason?: string }> {
		const { owner, repo, prNumber, accessToken, path, startLine, endLine, body } = params

		// Fetch PR files and locate the patch for the target path
		const files = await githubService.getPullRequestFiles(accessToken, owner, repo, prNumber)
		const file = (files || []).find((f: any) => f.filename === path)
		if (!file || typeof file.patch !== "string") {
			return { success: false, reason: "File not found in PR or no patch available" }
		}

		// Map HEAD lines to diff lines in the PR patch
		const mapHeadToDiffLine = (patch: string, headLine: number): number | null => {
			const lines = patch.split("\n")
			let curNew = 0
			for (const hunkLine of lines) {
				if (hunkLine.startsWith("@@")) {
					const m = hunkLine.match(/\+([0-9]+)(?:,([0-9]+))?/) // +c[,d]
					const startStr = m?.[1]
					if (startStr) curNew = parseInt(startStr, 10)
					continue
				}
				if (hunkLine.startsWith(" ")) {
					if (curNew === headLine) return curNew
					curNew++
					continue
				}
				if (hunkLine.startsWith("+")) {
					if (curNew === headLine) return curNew
					curNew++
					continue
				}
				if (hunkLine.startsWith("-")) {
					// deletions do not advance new
					continue
				}
			}
			return null
		}

		const mappedStart = mapHeadToDiffLine(file.patch as string, startLine)
		const mappedEnd = mapHeadToDiffLine(file.patch as string, endLine)
		if (!Number.isFinite(mappedEnd as number)) {
			return { success: false, reason: "End line does not map into PR diff (no inline context)" }
		}

		// Build payload for multi-line if possible
		const payload: any = {
			path,
			body,
			line: mappedEnd,
			side: "RIGHT" as const,
		}
		if (Number.isFinite(mappedStart as number) && (mappedStart as number) !== (mappedEnd as number)) {
			payload.start_line = mappedStart
			payload.start_side = "RIGHT" as const
		}

		const posted = await githubService.createPullRequestLineComment(accessToken, owner, repo, prNumber, payload)
		return { success: true, posted }
	}
}

export const prReviewService = new PrReviewService()
