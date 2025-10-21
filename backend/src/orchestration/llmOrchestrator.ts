import { LLMManager } from "../llm/llmManager"
import { PromptBuilder } from "../prompts/promptBuilder"
import { CodeIndexManager } from "../services/indexing/CodeIndexManager"
import { EventBus } from "../services/eventBus"
import { logger } from "../utils/logger"
import { pullRequestService } from "../services/pullRequestService"

interface OrchestratorParams {
	taskId: string
	owner: string
	repo: string
	prNumber: number
}

const MAX_LOOPS = 20

export async function runLlmOrchestratedReview(
	cwd: string,
	params: OrchestratorParams,
	repositoryId?: number,
	userId?: number,
	workspaceManager?: any,
	accessToken?: string,
): Promise<{ response: string; loops: number; structured?: { issues: any[] }; suggestionWorkflow?: any }> {
	const { taskId, owner, repo, prNumber } = params
	const channel = `task:${taskId}`
	const publish = (event: any) => EventBus.getInstance().publish(channel, event)

	const llm = LLMManager.getInstance()
	if (!llm.getInitialized?.()) {
		throw new Error("LLM is not initialized")
	}

	// Pull PR/repo context as early as possible to ensure IDs are available BEFORE creating conversation context
	const prCtx = workspaceManager?.getWorkspaceContext?.()
	const pr = prCtx?.pullRequest
	const repoInfo = prCtx?.repository

	// If repositoryId wasn't provided, try to derive it from the workspace context (best-effort across common fields)
	if (typeof repositoryId !== "number") {
		const candidates = [
			repoInfo?.id,
			repoInfo?.databaseId,
			repoInfo?.repositoryId,
			pr?.base?.repo?.id,
			pr?.head?.repo?.id,
		]
		for (const cand of candidates) {
			if (typeof cand === "number" && Number.isFinite(cand)) {
				repositoryId = cand
				break
			}
		}
	}

	// Ensure userId is available for tools that require it
	if (typeof userId !== "number") {
		// Try to infer from workspace context; if unavailable, use a safe fallback
		const inferredUserId = prCtx?.user?.id ?? repoInfo?.owner?.id
		if (typeof inferredUserId === "number" && Number.isFinite(inferredUserId)) {
			userId = inferredUserId
		} else {
			userId = 1
			logger.warn("userId not provided; using fallback userId=1 for tool execution context")
		}
	}

	// (Context will be created below with these IDs)

	// Now that we have best-effort IDs, create the conversation context WITH them
	const contextId = llm.createConversationContext(
		cwd,
		repositoryId,
		userId,
		`Code review for PR #${prNumber} in ${owner}/${repo}`,
	)
	// Enrich the context with workspaceManager, accessToken, and taskId so tools can use GitHub APIs and events can be published
	const ctx = llm.getContext(contextId)
	if (ctx) {
		ctx.workspaceManager = workspaceManager
		if (accessToken !== undefined) {
			;(ctx as any).accessToken = accessToken
		}
		// Add taskId to context variables so LLM events can be published to the correct channel
		// Also initialize accumulator array for code smells found during intermediate responses
		;(ctx as any).variables = {
			taskId: taskId,
			owner: owner,
			repo: repo,
			prNumber: prNumber,
			accumulatedIssues: [], // Store all code smells found throughout the conversation
		}
	}

	const pb = PromptBuilder.getInstance()
	// If repositoryId is available, attempt to provide CodeIndexManager to the prompt builder
	if (typeof repositoryId === "number") {
		try {
			const cim = CodeIndexManager.getInstance(repositoryId)
			pb.setCodeIndexManager(cim)
		} catch (e) {
			logger.warn("Unable to initialize CodeIndexManager for prompt builder", {
				repositoryId,
				error: (e as any)?.message,
			})
		}
	}
	const systemPrompt = await pb.buildSystemPrompt({
		workspacePath: cwd,
		repositoryId,
		userId,
	} as any)

	const changedFiles = prCtx?.changedFiles || []
	let fileChangesSummary = ""

	if (Array.isArray(changedFiles) && changedFiles.length > 0) {
		const sortedFiles = [...changedFiles].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
		let summary = `CHANGED FILES (${sortedFiles.length} files):\n\n`
		sortedFiles.forEach((file: any, index: number) => {
			summary += `${index + 1}. ${file.filename} (${file.status}) - +${file.additions}/-${file.deletions} lines\n`
		})
		summary += `\nYou can use the read_file tool to examine each file: <read_file><path>filename</path></read_file>`
		fileChangesSummary = summary
	}

	const initialUserMessage = [
		`You are an expert code reviewer conducting a strategic analysis of PR #${prNumber} in ${owner}/${repo}.`,
		"",
		`**CRITICAL: CODE SMELL & ANTI-PATTERN DETECTION IS MANDATORY**`,
		`Your system prompt contains detailed step-by-step detection instructions for 11 CODE SMELLS and ANTI-PATTERNS. As you analyze EVERY piece of code, you MUST actively apply those detection methods. This is a PRIMARY responsibility.`,
		"",
		`**YOU MUST ACTIVELY CHECK FOR THESE CODE SMELLS (even if slightly present):**`,
		`1. MAGIC NUMBERS / MAGIC STRINGS - Scan for ANY hardcoded values (403, "admin", 5000, 0.08, etc.)`,
		`2. DUPLICATE CODE - Use codebase_search to find similar patterns across files`,
		`3. OVERLY-COMPLEX / SPAGHETTI FUNCTIONS - Count nesting levels (>3) and decision points (>10)`,
		`4. GLOBAL VARIABLES / NAMESPACE POLLUTION - Look for module-level variables`,
		`5. MUTABLE SHARED STATE - Find objects modified by multiple functions`,
		`6. MISSING ERROR HANDLING IN ASYNC CODE - Check EVERY async/await for try/catch`,
		`7. LONG METHOD / FUNCTION - Count lines (>30) and responsibilities (>3)`,
		`8. TIGHT COUPLING - Look for direct instantiation with "new" keyword`,
		`9. HARDCODED CONFIGURATION / SECRETS - Search for api_key, password, token`,
		`10. GOD CLASS / GOD OBJECT - Count methods (>15) and properties (>10)`,
		`11. DEAD CODE - Find unused variables and unreachable code`,
		"",
		`**When you find a code smell, you MUST:**`,
		`EXPLICITLY NAME it using the exact name from your system prompt`,
		`Provide EVIDENCE (exact line numbers, counts, metrics, similarity percentages)`,
		`Provide ACTIONABLE FIX - choose the appropriate format:`,
		`  • INLINE FIXES: Use \`\`\`suggestion block with EXACT refactored code at the EXACT line range`,
		`  • COMPLEX huge REFACTORS: Provide architectural guidance and code examples WITHOUT \`\`\`suggestion block`,
		`Add to your structured issues list with the exact code smell type and fix`,
		"",
		`**CRITICAL: When to Use \`\`\`suggestion Blocks:**`,
		`✅ USE \`\`\`suggestion FOR (can be applied to exact lines-please make sure that it can be able to directly replace the old code):`,
		`  • MAGIC NUMBERS → Replace with named constants (inline replacement)`,
		`  • MISSING ERROR HANDLING → Wrap with try/catch (inline addition)`,
		`  • HARDCODED SECRETS → Replace with env variables (inline replacement)`,
		`  • DEAD CODE → Remove unused code (inline deletion)`,
		`  • Simple MUTABLE STATE fixes → Change to immutable patterns (inline replacement)`,
		``,

		``,
		`**IMPORTANT**: `,
		`• Report code smells even if only slightly present. Do not ignore them!`,
		`• A SINGLE CODE SNIPPET CAN HAVE MULTIPLE CODE SMELLS - check for ALL smells, don't stop after finding one!`,
		`• Example: A function can be LONG METHOD + have MAGIC NUMBERS + have MISSING ERROR HANDLING all at once`,
		`• For simple inline fixes, ALWAYS provide \`\`\`suggestion block at the EXACT line range where it applies`,
		"",
		`**CONTEXT:**`,
		repoInfo?.description ? `Repository: ${repoInfo.description}` : "",
		pr?.title ? `PR Title: ${pr.title}` : "",
		pr?.body ? `PR Description:\n${pr.body}` : "",
		fileChangesSummary,
		"",
		`**YOUR MISSION:**`,
		`Conduct a comprehensive, intelligent code review as a senior developer would. Think strategically, investigate thoroughly, and provide actionable insights.`,
		"",
		`**INTELLIGENCE-DRIVEN APPROACH:**`,
		`1. **Think First**: Start by understanding what this PR is trying to achieve`,
		`2. **Explore the project as you need of you are lack of understanding of the project`,
		`3. **Explore the Whole Project**: Don't limit yourself to changed files - understand the entire codebase`,
		`4. **Get Full Context**: Use tools to explore project structure, architecture, and patterns`,
		`5. **Investigate Strategically**: Use tools only when you have a clear reason`,
		`6. **Identify code smells and anti-patterns**: When analyzing code snippets, systematically check for ALL 11 code smells - especially MAGIC NUMBERS, GLOBAL VARIABLES, MUTABLE STATE, COMPLEX FUNCTIONS, and DUPLICATE CODE (not just Long Method and Missing Error Handling)`,
		`7. **Analyze Patterns**: Look for systemic issues across the entire project, not just surface problems`,
		`8. **Connect Dots**: Link findings to broader architectural and business implications`,
		`9. **Provide Solutions**: Don't just find problems - suggest concrete improvements`,
		"",
		`**CONVERSATION STYLE:**`,
		`- Think aloud and explain your reasoning`,
		`- Ask strategic questions about the code`,
		`- Make intelligent decisions about what to investigate`,
		`- Focus on high-impact areas first`,
		`- Be conversational and natural, like a senior developer reviewing code`,
		"",
		`**IMPORTANT: REPORT CODE SMELLS AS YOU FIND THEM:**`,
		`As you analyze each file, if you identify code smells, report them IMMEDIATELY in this JSON format:`,
		``,
		`**Example 1: Simple inline fix (use \`\`\`suggestion):**`,
		`\`\`\`json`,
		`{`,
		`  "path": "lib/adapters/http.js",`,
		`  "line": 67,`,
		`  "severity": "medium",`,
		`  "type": "code_smell",`,
		`  "codeSmellType": "MAGIC_NUMBERS",`,
		`  "message": "Hardcoded status code 403 without constant",`,
		`  "improvement": "\`\`\`suggestion\\nconst HTTP_FORBIDDEN = 403;\\nif (statusCode === HTTP_FORBIDDEN) {\\n  return 'Forbidden';\\n}\\n\`\`\`",`,
		`  "range": { "startLine": 67, "endLine": 69 }`,
		`}`,
		`\`\`\``,
		``,
		`**Example 2: Complex refactor (NO \`\`\`suggestion):**`,
		`\`\`\`json`,
		`{`,
		`  "path": "src/services/OrderService.ts",`,
		`  "line": 120,`,
		`  "severity": "high",`,
		`  "type": "code_smell",`,
		`  "codeSmellType": "LONG_METHOD",`,
		`  "message": "55-line function with 5 responsibilities: validation, DB, email, logging, response",`,
		`  "improvement": "Extract into smaller functions:\\n\\n1. validateOrder(order)\\n2. saveOrderToDatabase(order)\\n3. sendOrderEmail(order)\\n4. logOrderProcessing(order)\\n5. buildOrderResponse(order)\\n\\nRefactored structure:\\n\`\`\`typescript\\nasync function processOrder(order: Order) {\\n  await validateOrder(order);\\n  const saved = await saveOrderToDatabase(order);\\n  await sendOrderEmail(saved);\\n  logOrderProcessing(saved);\\n  return buildOrderResponse(saved);\\n}\\n\`\`\`",`,
		`  "range": { "startLine": 120, "endLine": 175 }`,
		`}`,
		`\`\`\``,
		``,
		`**AUTOMATIC PRESERVATION SYSTEM:**`,
		`• Your code smell findings are extracted and stored in an accumulator array after EACH response`,
		`• This happens automatically - you just need to report them in the JSON format above`,
		`• Use \`\`\`suggestion blocks ONLY for simple inline fixes at exact lines`,
		`• For complex refactors, provide clear guidance with code examples but without \`\`\`suggestion`,
		`• Conversation history may be truncated to prevent token overflow (sliding window)`,
		`• BUT your code smell findings are ALWAYS preserved in the accumulator`,
		`• At the end, ALL accumulated code smells from ALL loops will be included in the final output`,
		`• This means you can thoroughly analyze without worrying about losing findings`,
		"",
		`**SYSTEMATIC CODE SMELL SCANNING (DO THIS FOR EVERY FILE):**`,
		`When reading ANY code file, systematically scan for:`,
		`MAGIC NUMBERS/STRINGS: Look for hardcoded 403, 404, 200, "admin", "pending", 5000, 0.08, etc.`,
		`GLOBAL VARIABLES: Check for let/var at module level (outside functions/classes)`,
		`MUTABLE STATE: Find objects/arrays being modified (obj.prop =, array.push, etc.)`,
		`COMPLEX FUNCTIONS: Count if/else/for/while nesting (>3 levels = smell)`,
		`DUPLICATE CODE: Use codebase_search for similar validation/logic patterns`,
		`MISSING try/catch: Check EVERY async/await operation`,
		`LONG METHODS: Count lines and distinct responsibilities`,
		``,
		`CRITICAL: One function/snippet can have MULTIPLE code smells simultaneously - check for ALL of them!`,
		``,
		`**ADVANCED TOOL USAGE:**`,
		`- Use list_files to explore the project structure at any point and understand how the project/directory is organized`,
		`- Use codebase_search for semantic understanding, pattern discovery, AND finding DUPLICATE CODE across files`,
		`- Use search_files to find MAGIC NUMBERS (\\d{3,}), HARDCODED STRINGS ("admin"|"pending"), and SECRETS (api_key|password|token)`,
		`- Use analyze_architecture for high-level architectural analysis`,
		`- Use list_code_definition_names to understand the complete component hierarchy across all directories`,
		`- Use identify_risks for risk assessment based on discovered patterns`,
		`- Use strategic_analysis for planning and reasoning about investigation`,
		`- Use pattern_recognition for identifying systemic issues`,
		`- Use read_file for detailed examination - when reading, actively count nesting levels, look for magic numbers, check for mutable state`,
		`- Explain WHY you need each tool before using it`,
		`- Combine multiple tools for comprehensive analysis`,
		"",
		`**COMPLETION:**`,
		`When you have completed your analysis and are ready to provide your final review, end your message with:`,
		`<finish></finish>`,
		"",
		`**FINAL OUTPUT FORMAT WHEN FINISHING THE WHOLE REVIEW:**`,
		`In your final message (before <finish></finish>), include:`,
		"",
		`**1. CODE SMELLS & ANTI-PATTERNS IDENTIFIED (MANDATORY SECTION)**`,
		``,
		`### Code Smells & Anti-Patterns Detected`,
		``,
		`List ALL code smells you found during analysis. For EACH code smell:`,
		`• **Code Smell Type**: [Exact name from the 11 defined smells]`,
		`• **Location**: [File path and exact line numbers]`,
		`• **Evidence**: [Specific metrics - line count, nesting depth, similarity %, occurrences]`,
		`• **Severity**: [Critical/High/Medium/Low]`,
		`• **Actionable Fix**: [Provide inline code fix when possible - show the corrected code]`,
		``,
		`**Example Format for SIMPLE inline fixes (with \`\`\`suggestion):**`,
		``,
		`**MAGIC NUMBERS** - lib/adapters/http.js:67-69`,
		`- Evidence: Hardcoded status code 403 used without constant`,
		`- Severity: Medium`,
		`- Fix (applies to lines 67-69):`,
		`  \`\`\`suggestion`,
		`  const HTTP_FORBIDDEN = 403;`,
		`  if (statusCode === HTTP_FORBIDDEN) {`,
		`    return 'Forbidden';`,
		`  }`,
		`  \`\`\``,
		``,
		`**MISSING ERROR HANDLING** - src/services/api.ts:145-147`,
		`- Evidence: Async fetch operation without try/catch`,
		`- Severity: High`,
		`- Fix (applies to lines 145-147):`,
		`  \`\`\`suggestion`,
		`  try {`,
		`    const response = await fetch(url);`,
		`    return await response.json();`,
		`  } catch (error) {`,
		`    logger.error('Fetch failed:', error);`,
		`    throw error;`,
		`  }`,
		`  \`\`\``,
		``,
		`**Example Format for COMPLEX refactors (WITHOUT \`\`\`suggestion):**`,
		``,
		`**LONG METHOD** - src/services/OrderService.ts:120-175`,
		`- Evidence: 55-line function with 5 responsibilities (validation, DB, email, logging, response)`,
		`- Severity: High`,
		`- Fix: Extract into smaller functions:`,
		`  \`\`\`typescript`,
		`  async function processOrder(order: Order) {`,
		`    await validateOrder(order);`,
		`    const saved = await saveOrderToDatabase(order);`,
		`    await sendOrderEmail(saved);`,
		`    logOrderProcessing(saved);`,
		`    return buildOrderResponse(saved);`,
		`  }`,
		`  \`\`\``,
		``,
		`**DUPLICATE CODE** - src/services/UserService.ts:67-82 & src/services/AuthService.ts:145-160`,
		`- Evidence: 85% similar email validation logic in 2 locations`,
		`- Severity: High`,
		`- Fix: Extract to shared utility function in src/utils/validators.ts, then import in both files`,
		``,
		`**Example of MULTIPLE code smells in ONE function:**`,
		`**src/services/OrderService.ts:120-175** has THREE code smells:`,
		`1. **LONG METHOD** - 55 lines, 5 responsibilities`,
		`2. **MAGIC NUMBERS** - Hardcoded 5000 (timeout), 0.08 (tax rate) on lines 145, 167`,
		`3. **MISSING ERROR HANDLING** - Async DB call on line 158 without try/catch`,
		``,
		`If NO code smells found: "No significant code smells detected in analyzed code."`,
		"",
		`**2. Executive Summary**: Key findings and overall assessment`,
		`3. **Detailed Analysis**: Your strategic insights and reasoning`,
		`4. **Issues Found**: Specific problems with severity levels`,
		`5. **Recommendations**: Concrete suggestions for improvement`,
		`6. **Structured Data**: A JSON object with REAL ISSUES you found during your analysis:`,
		`\`\`\`json`,
		`{`,
		`  "issues": [`,
		`    {`,
		`      "path": "actual file path where you found the issue",`,
		`      "line": actual line number,`,
		`      "severity": "critical|high|medium|low|info",`,
		`      "type": "code_smell|security|error|warning|suggestion",`,
		`      "codeSmellType": "LONG_METHOD|MAGIC_NUMBERS|DUPLICATE_CODE|GOD_CLASS|DEAD_CODE|GLOBAL_VARIABLES|MUTABLE_SHARED_STATE|OVERLY_COMPLEX|MISSING_ERROR_HANDLING|TIGHT_COUPLING|HARDCODED_SECRETS|null",`,
		`      "message": "specific problem with evidence (e.g., '45-line function with 4 responsibilities' or 'Hardcoded 403 without constant')",`,
		`      "improvement": "SIMPLE INLINE FIX: Use \\n\`\`\`suggestion\\nexact refactored code at these lines\\n\`\`\`\\n\\nCOMPLEX REFACTOR: Provide step-by-step guidance with code examples (no \`\`\`suggestion block)\\n\\nAlways try to provide exact refactoring when possible for simple fixes",`,
		`      "range": { "startLine": start, "endLine": end }`,
		`    }`,
		`  ]`,
		`}`,
		`\`\`\``,
		``,
		`**Example JSON for SIMPLE inline fix (with \`\`\`suggestion):**`,
		`\`\`\`json`,
		`{`,
		`  "path": "lib/adapters/http.js",`,
		`  "line": 67,`,
		`  "severity": "medium",`,
		`  "type": "code_smell",`,
		`  "codeSmellType": "MAGIC_NUMBERS",`,
		`  "message": "Hardcoded status code 403 without constant",`,
		`  "improvement": "\`\`\`suggestion\\nconst HTTP_FORBIDDEN = 403;\\nif (statusCode === HTTP_FORBIDDEN) {\\n  return 'Forbidden';\\n}\\n\`\`\`",`,
		`  "range": { "startLine": 67, "endLine": 69 }`,
		`}`,
		`\`\`\``,
		``,
		`**Example JSON for COMPLEX refactor (WITHOUT \`\`\`suggestion):**`,
		`\`\`\`json`,
		`{`,
		`  "path": "src/services/OrderService.ts",`,
		`  "line": 120,`,
		`  "severity": "high",`,
		`  "type": "code_smell",`,
		`  "codeSmellType": "LONG_METHOD",`,
		`  "message": "55-line function with 5 responsibilities: validation, DB, email, logging, response",`,
		`  "improvement": "Extract into smaller functions:\\n1. validateOrder()\\n2. saveOrderToDatabase()\\n3. sendOrderEmail()\\n4. logOrderProcessing()\\n5. buildOrderResponse()",`,
		`  "range": { "startLine": 120, "endLine": 175 }`,
		`}`,
		`\`\`\``,
		``,
		`**NOTE**: All code smells you report throughout the conversation (in any loop) are automatically accumulated.`,
		`Your final structured JSON will contain ALL accumulated issues from ALL loops, not just from your final response.`,
		``,
		`**CRITICAL GUIDELINES FOR \`\`\`suggestion BLOCKS:**`,
		`• The "range" field MUST exactly match the lines that the \`\`\`suggestion code will replace`,
		`• The suggestion code MUST be the complete replacement for those exact lines`,
		`• GitHub will replace lines "startLine" to "endLine" with your suggestion code`,
		`• Test your logic: If lines 67-69 contain the old code, your suggestion must work as a direct replacement`,
		`• For MAGIC NUMBERS: Include the constant definition AND the usage in the suggestion`,
		`• For MISSING ERROR HANDLING: Include the complete try/catch wrapping the code`,
		`• For HARDCODED SECRETS: Include the env variable usage, not just the variable name`,
		`• Always prefer exact refactoring with \`\`\`suggestion when the fix is simple and inline`,
		``,
		`**CRITICAL**: Only include REAL ISSUES you found during your investigation. Don't generate fake or minor issues.`,
		`Focus on significant problems like: CODE SMELLS (primary focus), security vulnerabilities, architectural issues, performance problems,`,
		`maintainability concerns, and code quality issues.`,
		"",
		`**FINAL REMINDER - CODE SMELLS TO CHECK:**`,
		`Before finishing, verify you checked for ALL these code smells (report even if slightly present):`,
		`✓ MAGIC NUMBERS/STRINGS (hardcoded values)`,
		`✓ GLOBAL VARIABLES (module-level mutable vars)`,
		`✓ MUTABLE SHARED STATE (objects modified in multiple places)`,
		`✓ OVERLY-COMPLEX FUNCTIONS (nesting >3, decisions >10)`,
		`✓ DUPLICATE CODE (similar patterns across files)`,
		`✓ MISSING ERROR HANDLING (async without try/catch)`,
		`✓ LONG METHODS (>30 lines or >3 responsibilities)`,
		`✓ TIGHT COUPLING (direct instantiation)`,
		`✓ HARDCODED SECRETS (api_key, password, token)`,
		`✓ GOD CLASS (>15 methods or >10 properties)`,
		`✓ DEAD CODE (unused variables, unreachable code)`,
		``,
		`IMPORTANT: A single function/file can have MULTIPLE code smells at once. Report ALL you find in each location!`,
		"",
		`**Remember**: You are an intelligent analyst having a conversation about code quality. Think strategically, investigate thoroughly, systematically check for ALL 11 code smells (not just Long Method and Missing Error Handling), and provide valuable insights. When you're done, simply end with <finish></finish>.`,
	]
		.filter(Boolean)
		.join("\n\n")

	const askModel = async (msg: string) => {
		const res = await llm.processMessage(contextId, msg, {
			includeToolDescriptions: true,
			includeUsageRules: true,
			includeCapabilities: true,
			includeSystemInfo: true,
			customInstructions: systemPrompt,
			// Remove artificial restrictions - let LLM be truly intelligent
			encourageToolUsage: false, // Let LLM decide when to use tools
		} as any)
		return res
	}

	// Helper function to check if LLM has finished
	const hasFinished = (response: string): boolean => {
		return response.includes("<finish></finish>")
	}

	// Helper function to remove finish tag from response
	const removeFinishTag = (response: string): string => {
		return response.replace(/<finish><\/finish>/g, "").trim()
	}

	// Helper function to check if response is too long (excluding tool calls)
	const isResponseTooLong = (response: string): boolean => {
		// Remove tool calls from response to check actual text length
		const textOnly = response.replace(/<[^>]+>.*?<\/[^>]+>/gs, "").trim()
		return textOnly.length > 600 // 600 characters = ~2-4 sentences
	}

	// Helper function to get progressive continuation prompt
	const getProgressivePrompt = (stage: string, hasTools: boolean = false): string => {
		if (hasTools) {
			return "Continue your analysis based on the tool results. What NEW code smells did you find? Check for: MAGIC NUMBERS, GLOBAL VARIABLES, MUTABLE STATE, COMPLEX FUNCTIONS, DUPLICATE CODE, MISSING ERROR HANDLING. What NEW file/aspect should you investigate next? Don't repeat previous analysis."
		}

		switch (stage) {
			case "initial":
				return "Start with your initial observations. What catches your attention first? Check for code smells (especially magic numbers, global vars, complex functions). Keep it concise (2-4 sentences)."
			case "investigation":
				return "Share one NEW finding (especially code smells like MAGIC NUMBERS, GLOBAL VARIABLES, MUTABLE STATE, or COMPLEX FUNCTIONS), then tell me what NEW aspect you want to investigate next. Don't repeat what you already analyzed. Keep responses focused."
			case "analysis":
				return "What's the most important NEW code smell or issue you've found? Be concise and specific with evidence. Move to different files/aspects you haven't checked yet. Check all 11 code smells systematically."
			case "final":
				return `Provide your final comprehensive review. MANDATORY format:

**CODE SMELLS & ANTI-PATTERNS IDENTIFIED**
- List ALL code smells found (use exact names from system prompt)
- Provide location, evidence, severity, and actionable fixes

**Executive Summary** - Key findings
**Recommendations** - Concrete suggestions  
**Structured JSON** - All issues with code smell types

Make it professional and actionable for PR comments.`
			default:
				return "Continue your analysis. Apply code smell detection methods as you examine code. What should you check next? Keep responses concise (2-4 sentences)."
		}
	}

	// Extract structured issues JSON if present (handles fenced code blocks and brace matching)
	const extractStructured = (text: string): { issues: any[] } => {
		// 1) Prefer fenced JSON block
		const fence = text.match(/```json\s*([\s\S]*?)```/i)
		if (fence && fence[1]) {
			try {
				const parsed = JSON.parse(fence[1])
				if (parsed && Array.isArray(parsed.issues)) return { issues: parsed.issues }
			} catch {}
		}
		// 2) Fallback: find substring starting at the nearest '{' before "\"issues\"" and match braces
		const anchorIdx = text.indexOf('"issues"')
		if (anchorIdx >= 0) {
			let start = anchorIdx
			while (start > 0 && text[start] !== "{") start--
			if (text[start] === "{") {
				let i = start
				let depth = 0
				let inString = false
				while (i < text.length) {
					const ch = text[i]
					if (ch === '"' && text[i - 1] !== "\\") inString = !inString
					if (!inString) {
						if (ch === "{") depth++
						else if (ch === "}") {
							depth--
							if (depth === 0) {
								const jsonSlice = text.slice(start, i + 1)
								try {
									const parsed = JSON.parse(jsonSlice)
									if (parsed && Array.isArray(parsed.issues)) return { issues: parsed.issues }
								} catch {}
								break
							}
						}
					}
					i++
				}
			}
		}
		return { issues: [] }
	}

	// Add thinking checkpoint system
	const addThinkingCheckpoint = (stage: string, message: string) => {
		publish({
			type: "thinking_checkpoint",
			taskId,
			data: {
				stage,
				message,
				timestamp: new Date().toISOString(),
			},
		})
	}

	// Extract and accumulate code smell issues from response
	const extractAndAccumulateIssues = (response: string, loopNumber: number) => {
		const issues = extractStructured(response)
		if (issues.issues && issues.issues.length > 0) {
			const context = llm.getContext(contextId)
			if (context && (context as any).variables) {
				const accumulated = (context as any).variables.accumulatedIssues
				accumulated.push(...issues.issues)
				logger.info(
					`[Loop ${loopNumber}] Extracted ${issues.issues.length} code smell(s). Total accumulated: ${accumulated.length}`,
				)

				// Publish accumulated issues count
				publish({
					type: "code_smells_accumulated",
					taskId,
					data: {
						newIssues: issues.issues.length,
						totalIssues: accumulated.length,
						loop: loopNumber,
					},
				})
			}
		}
	}

	// Implement sliding window to prevent token overflow
	// CRITICAL: Must preserve tool call/result message pairs to avoid API errors
	// Only apply when actually needed (approaching token limit)
	const applySlidingWindow = (loopNumber: number) => {
		const context = llm.getContext(contextId)
		if (!context || !context.messages) return

		// Estimate token count (rough: ~4 chars per token)
		const estimatedTokens = JSON.stringify(context.messages).length / 4

		// Only apply sliding window if approaching token limit (>100K tokens)
		// This prevents unnecessary context loss and LLM repetition
		if (estimatedTokens > 100000) {
			if (context.messages.length > 15) {
				const originalLength = context.messages.length
				// Keep system message + last N messages
				const systemMsg = context.messages[0]
				if (systemMsg) {
					let keepCount = 10
					let recentMsgs = context.messages.slice(-keepCount)

					// CRITICAL: Ensure tool call message pairs are preserved
					// If first message is a 'tool' role, we need its preceding 'assistant' message with tool_calls
					while (recentMsgs[0]?.role === "tool" && keepCount < context.messages.length) {
						keepCount++
						recentMsgs = context.messages.slice(-keepCount)
					}

					// Also ensure we don't have orphaned tool_calls
					// Find last complete conversation exchange
					let validMessages = [systemMsg]
					let i = 0
					while (i < recentMsgs.length) {
						const msg = recentMsgs[i]
						if (!msg) {
							i++
							continue
						}

						validMessages.push(msg)

						// If this message has tool_calls, ensure all tool results are included
						if (msg.role === "assistant" && (msg as any).tool_calls) {
							i++
							// Include all corresponding tool results
							while (i < recentMsgs.length && recentMsgs[i]?.role === "tool") {
								const toolMsg = recentMsgs[i]
								if (toolMsg) {
									validMessages.push(toolMsg)
								}
								i++
							}
						} else {
							i++
						}
					}

					context.messages = validMessages

					const newEstimatedTokens = JSON.stringify(context.messages).length / 4

					logger.warn(`[Loop ${loopNumber}] ⚠️ APPLYING SLIDING WINDOW - Token limit approaching!`)
					logger.info(`[Loop ${loopNumber}] Sliding window details:`, {
						messagesRemoved: originalLength - context.messages.length,
						messagesKept: context.messages.length,
						tokensBefore: Math.round(estimatedTokens),
						tokensAfter: Math.round(newEstimatedTokens),
						reduction: `${Math.round(((estimatedTokens - newEstimatedTokens) / estimatedTokens) * 100)}%`,
						note: "Code smell findings are preserved in accumulator",
					})

					publish({
						type: "sliding_window_applied",
						taskId,
						data: {
							loop: loopNumber,
							messagesRemoved: originalLength - context.messages.length,
							messagesKept: context.messages.length,
							estimatedTokensBefore: Math.round(estimatedTokens),
							estimatedTokensAfter: Math.round(newEstimatedTokens),
						},
					})
				}
			}
		} else {
			// Log that we're NOT applying sliding window (context is still manageable)
			if (loopNumber % 5 === 0) {
				// Log every 5 loops
				logger.info(`[Loop ${loopNumber}] Sliding window not needed - Context healthy`, {
					estimatedTokens: Math.round(estimatedTokens),
					threshold: 100000,
					messageCount: context.messages.length,
				})
			}
		}
	}

	let finalResponse = ""
	let loops = 0
	let conversationStage = "initial"
	let reviewError: Error | null = null

	// Initial thinking checkpoint
	addThinkingCheckpoint(
		"initial",
		"Starting intelligent conversational code review. LLM will think strategically and decide when to finish.",
	)

	// Wrap entire review process to ensure accumulated issues are posted even on error
	try {
		// Start the conversation
		let result = await askModel(initialUserMessage)

		if (result.response) {
			const cleanResponse = removeFinishTag(result.response)
			publish({ type: "assistant_delta", taskId, data: { text: cleanResponse } })
			finalResponse += cleanResponse

			// Extract and accumulate any code smells found in initial response
			extractAndAccumulateIssues(cleanResponse, 0)

			// Check if LLM finished in first response
			if (hasFinished(result.response)) {
				addThinkingCheckpoint("completed", "LLM completed analysis in initial response.")
				publish({ type: "assistant_completed", taskId, data: { text: finalResponse.trim() } })

				// Get all accumulated issues
				const context = llm.getContext(contextId)
				const allIssues = (context as any).variables?.accumulatedIssues || []
				return { response: finalResponse.trim(), loops, structured: { issues: allIssues } }
			}

			// Check response length (excluding tool calls)
			if (isResponseTooLong(result.response) && !hasFinished(result.response)) {
				addThinkingCheckpoint(
					"response_too_long",
					"LLM response was too long. Encouraging more concise responses.",
				)
				const lengthGuidance =
					"Please keep your responses concise (2-4 sentences). Focus on one key point at a time. What's the most important thing you want to investigate next?"
				const lengthResult = await askModel(lengthGuidance)
				if (lengthResult.response) {
					const cleanLengthResponse = removeFinishTag(lengthResult.response)
					publish({ type: "assistant_delta", taskId, data: { text: cleanLengthResponse } })
					finalResponse += cleanLengthResponse

					// Extract any code smells from this response too
					extractAndAccumulateIssues(cleanLengthResponse, loops)

					result = lengthResult
				}
			}

			// Update conversation stage
			if (
				result.response.includes("I need to") ||
				result.response.includes("I should") ||
				result.response.includes("Let me")
			) {
				conversationStage = "investigation"
				addThinkingCheckpoint("strategic_thinking", "LLM is demonstrating strategic thinking and reasoning.")
			} else if (
				result.response.includes("I found") ||
				result.response.includes("This reveals") ||
				result.response.includes("Interesting")
			) {
				conversationStage = "analysis"
				addThinkingCheckpoint("analysis_progress", "LLM is progressing with analysis.")
			} else {
				addThinkingCheckpoint("analysis_started", "LLM has started analysis.")
			}
		}

		// Conversational loop - let LLM drive the conversation
		while (loops < MAX_LOOPS) {
			loops++

			// If LLM used tools, process them and continue the conversation
			if (result.toolCalls && result.toolCalls.length > 0) {
				const toolNames = result.toolCalls.map((call) => call.toolName)
				addThinkingCheckpoint("tool_usage", `LLM is using tools: ${toolNames.join(", ")}`)

				for (const call of result.toolCalls) {
					publish({
						type: "tool_call_started",
						taskId,
						data: { name: call.toolName, params: call.parameters },
					})
					publish({
						type: "tool_call_completed",
						taskId,
						data: { name: call.toolName, result: call.result ?? null, error: call.error ?? null },
					})
				}

				// Continue the conversation naturally with guidance for advanced analysis
				const currentToolNames = result.toolCalls.map((call) => call.toolName)
				const hasAdvancedTools = currentToolNames.some((name) =>
					[
						"codebase_search",
						"search_files",
						"analyze_architecture",
						"identify_risks",
						"strategic_analysis",
						"pattern_recognition",
					].includes(name),
				)

				let continuationPrompt = getProgressivePrompt(conversationStage, true)

				if (!hasAdvancedTools) {
					continuationPrompt +=
						" Consider using more advanced analysis tools like codebase_search, search_files, or analyze_architecture for deeper investigation."
				}

				// Add code smell detection reminder
				continuationPrompt += `\n\n🔍 CODE SMELL CHECK: Systematically check for ALL 11 code smells in the NEW code you just analyzed:
✓ MAGIC NUMBERS/STRINGS? (any hardcoded values like 403, "admin", 5000)
✓ GLOBAL VARIABLES? (module-level mutable variables)
✓ MUTABLE SHARED STATE? (objects modified in multiple places)
✓ COMPLEX FUNCTIONS? (nesting >3 or decisions >10)
✓ DUPLICATE CODE? (use codebase_search to find similar patterns)
✓ MISSING ERROR HANDLING? (async/await without try/catch)
✓ LONG METHODS? (>30 lines or >3 responsibilities)
✓ Other smells? (Tight Coupling, Hardcoded Secrets, God Class, Dead Code)

Remember: One function can have MULTIPLE code smells - report ALL you find!
Report in JSON format. Your findings are automatically accumulated.
DON'T re-analyze files you already reviewed - move to the next file.`

				result = await askModel(continuationPrompt)

				// Apply sliding window after processing tools to prevent token overflow
				applySlidingWindow(loops)
			} else {
				// No tools used - use progressive prompt with tool encouragement
				let continuationPrompt = getProgressivePrompt(conversationStage, false)

				if (conversationStage !== "final") {
					continuationPrompt += ` For a comprehensive code review, consider using advanced tools:
- Use codebase_search to understand patterns across the codebase
- Use search_files to find specific security or quality issues  
- Use analyze_architecture to examine component structure and data flow
- Use identify_risks to assess potential problems
- Use strategic_analysis to plan your investigation approach
- Use pattern_recognition to identify systemic issues`
				}

				result = await askModel(continuationPrompt)

				// Apply sliding window after processing non-tool path as well
				applySlidingWindow(loops)
			}

			if (result.response) {
				const cleanResponse = removeFinishTag(result.response)
				publish({ type: "assistant_delta", taskId, data: { text: cleanResponse } })
				finalResponse += cleanResponse

				// Extract and accumulate any code smells found in this response
				extractAndAccumulateIssues(cleanResponse, loops)

				// Check if LLM has finished
				if (hasFinished(result.response)) {
					addThinkingCheckpoint("completed", "LLM has completed the analysis.")
					break
				}

				// Check response length (excluding tool calls) - but allow final responses to be long
				if (isResponseTooLong(result.response) && !hasFinished(result.response)) {
					addThinkingCheckpoint(
						"response_too_long",
						"LLM response was too long. Encouraging more concise responses.",
					)
					const lengthGuidance =
						"Please keep your responses concise (2-4 sentences). Focus on one key point at a time. What's the most important thing you want to investigate next?"
					const lengthResult = await askModel(lengthGuidance)
					if (lengthResult.response) {
						const cleanLengthResponse = removeFinishTag(lengthResult.response)
						publish({ type: "assistant_delta", taskId, data: { text: cleanLengthResponse } })
						finalResponse += cleanLengthResponse

						// Extract any code smells from this response too
						extractAndAccumulateIssues(cleanLengthResponse, loops)

						result = lengthResult
					}
				}

				// Update conversation stage
				if (
					result.response.includes("I need to") ||
					result.response.includes("I should") ||
					result.response.includes("Let me")
				) {
					conversationStage = "investigation"
					addThinkingCheckpoint("strategic_reasoning", "LLM is demonstrating strategic reasoning.")
				} else if (
					result.response.includes("I found") ||
					result.response.includes("This reveals") ||
					result.response.includes("Interesting")
				) {
					conversationStage = "analysis"
					addThinkingCheckpoint("analysis_progress", "LLM is progressing with analysis.")
				} else if (
					result.response.includes("Based on") ||
					result.response.includes("In conclusion") ||
					result.response.includes("Summary")
				) {
					conversationStage = "final"
					addThinkingCheckpoint("final_analysis", "LLM is providing final analysis.")
				}
			}
		}

		// If we hit max loops, encourage completion
		if (loops >= MAX_LOOPS) {
			addThinkingCheckpoint("max_loops_reached", "Maximum conversation loops reached. Encouraging completion.")
			const finalPrompt = `Provide your final comprehensive review now. Your response MUST include:

🔴 **1. CODE SMELLS & ANTI-PATTERNS IDENTIFIED (MANDATORY)**
Systematically check and list ALL code smells found:
✓ MAGIC NUMBERS/STRINGS ✓ GLOBAL VARIABLES ✓ MUTABLE STATE ✓ COMPLEX FUNCTIONS
✓ DUPLICATE CODE ✓ MISSING ERROR HANDLING ✓ LONG METHODS ✓ TIGHT COUPLING
✓ HARDCODED SECRETS ✓ GOD CLASS ✓ DEAD CODE

IMPORTANT: A single function can have MULTIPLE code smells - report ALL you find!

For each found:
• Exact code smell name from your system prompt
• File path and line numbers
• Evidence (metrics, counts, similarity %)
• Severity level
• Actionable fix using \`\`\`suggestion syntax when possible

**2. Executive Summary** - Key findings
**3. Recommendations** - Concrete suggestions
**4. Structured JSON** - All real issues with code smell types and inline fixes

End with <finish></finish>`

			const finalResult = await askModel(finalPrompt)

			if (finalResult.response) {
				const cleanResponse = removeFinishTag(finalResult.response)
				publish({ type: "assistant_delta", taskId, data: { text: cleanResponse } })
				finalResponse += cleanResponse

				// Extract any final code smells from this response
				extractAndAccumulateIssues(cleanResponse, loops)
			}
		}
	} catch (error) {
		// Capture error but continue to ensure accumulated issues are still posted
		reviewError = error as Error
		logger.error("[Code Review] Review failed midway, but will still post accumulated code smells", {
			taskId,
			prNumber,
			loops,
			error: (error as Error).message,
		})
		addThinkingCheckpoint("review_error", `Review failed at loop ${loops}: ${(error as Error).message}`)
	}

	// ALWAYS execute this section - even if review failed
	// This ensures accumulated code smells are posted to GitHub regardless of errors
	publish({ type: "assistant_completed", taskId, data: { text: finalResponse.trim() } })

	// Get all accumulated code smell issues from the entire conversation
	const finalContext = llm.getContext(contextId)
	const allAccumulatedIssues = (finalContext as any).variables?.accumulatedIssues || []

	logger.info(`[Accumulation] Retrieved accumulated issues from context`, {
		taskId,
		prNumber,
		loops,
		accumulatedCount: allAccumulatedIssues.length,
		sampleIssues: allAccumulatedIssues.slice(0, 3).map((issue: any) => ({
			path: issue.path,
			line: issue.line,
			type: issue.codeSmellType,
			hasMessage: !!issue.message,
			hasImprovement: !!issue.improvement,
		})),
	})

	// Remove duplicates based on path + line + codeSmellType
	const uniqueIssues = allAccumulatedIssues.filter((issue: any, index: number, self: any[]) => {
		return (
			index ===
			self.findIndex(
				(i: any) => i.path === issue.path && i.line === issue.line && i.codeSmellType === issue.codeSmellType,
			)
		)
	})

	logger.info(
		`[Accumulation] Code review completed. Total code smells: ${allAccumulatedIssues.length} (${uniqueIssues.length} unique)`,
		{
			taskId,
			prNumber,
			loops,
			totalIssues: allAccumulatedIssues.length,
			uniqueIssues: uniqueIssues.length,
			issueTypes: uniqueIssues.reduce((acc: any, issue: any) => {
				acc[issue.codeSmellType || "other"] = (acc[issue.codeSmellType || "other"] || 0) + 1
				return acc
			}, {}),
			allIssues: uniqueIssues.map((issue: any) => ({
				path: issue.path,
				line: issue.line,
				codeSmellType: issue.codeSmellType,
				severity: issue.severity,
			})),
		},
	)

	// Publish final accumulated issues count
	publish({
		type: "final_code_smells_summary",
		taskId,
		data: {
			totalIssues: uniqueIssues.length,
			loops: loops,
			issuesByType: uniqueIssues.reduce((acc: any, issue: any) => {
				acc[issue.codeSmellType || "other"] = (acc[issue.codeSmellType || "other"] || 0) + 1
				return acc
			}, {}),
		},
	})

	// POST ACCUMULATED CODE SMELLS AS GITHUB PR INLINE COMMENTS
	// This happens ALWAYS - even if review failed midway
	let suggestionWorkflowResult = null

	logger.info(`[PR Comments] Preparing to post code smells`, {
		taskId,
		prNumber,
		uniqueIssuesCount: uniqueIssues.length,
		hasAccessToken: !!accessToken,
		hasRepoId: !!repositoryId,
		hasUserId: !!userId,
	})

	if (accessToken && repositoryId && userId) {
		try {
			// Extract repository info for suggestion processing
			const repoInfo = prCtx?.repository
			const repoOwner = repoInfo?.owner?.login || owner
			const repoName = repoInfo?.name || repo

			logger.info(`[PR Comments] Repository info`, {
				repoOwner,
				repoName,
				uniqueIssuesCount: uniqueIssues.length,
			})

			if (repoOwner && repoName && uniqueIssues.length > 0) {
				logger.info(
					`[PR Comments] Starting direct PR comment posting for ${uniqueIssues.length} code smells in ${repoOwner}/${repoName}`,
				)

				const errors: string[] = []
				let postedCount = 0

				// Group issues by file
				const issuesByFile = uniqueIssues.reduce((acc: any, issue: any) => {
					if (issue.path) {
						if (!acc[issue.path]) {
							acc[issue.path] = []
						}
						acc[issue.path].push(issue)
					} else {
						logger.warn(`[PR Comments] Issue missing path, skipping`, { issue })
					}
					return acc
				}, {})

				logger.info(`[PR Comments] Grouped issues into ${Object.keys(issuesByFile).length} files`, {
					files: Object.keys(issuesByFile),
					issuesByFile: Object.entries(issuesByFile).map(([path, issues]: [string, any]) => ({
						path,
						count: issues.length,
					})),
				})

				// Post comments for each file
				for (const [filePath, fileIssues] of Object.entries(issuesByFile) as [string, any[]][]) {
					try {
						logger.info(`[PR Comments] Processing ${fileIssues.length} issues for file: ${filePath}`)

						const comments = fileIssues
							.filter((issue) => {
								const hasRequired = issue.line && issue.message
								if (!hasRequired) {
									logger.warn(`[PR Comments] Issue missing required fields`, {
										issue,
										hasLine: !!issue.line,
										hasMessage: !!issue.message,
									})
								}
								return hasRequired
							})
							.map((issue) => {
								// Format comment body with code smell details
								const codeSmellName = issue.codeSmellType || "Code Quality Issue"
								const severity = issue.severity || "medium"
								const evidence = issue.message || ""
								const fix = issue.improvement || "No specific fix provided"

								const commentBody = `**🔴 ${codeSmellName}** (Severity: ${severity})

${evidence}

**Suggested Fix:**
${fix}`

								return {
									body: commentBody,
									path: filePath,
									line: issue.line,
									side: "RIGHT" as const,
									...(issue.range?.startLine && issue.range.startLine !== issue.line
										? {
												startLine: issue.range.startLine,
											}
										: {}),
								}
							})

						logger.info(`[PR Comments] Prepared ${comments.length} comments for ${filePath}`)

						if (comments.length > 0) {
							logger.info(`[PR Comments] Posting ${comments.length} comments to GitHub for ${filePath}`, {
								comments: comments.map((c) => ({ line: c.line, bodyLength: c.body.length })),
							})

							const results = await pullRequestService.createMultipleReviewComments(
								accessToken,
								repoOwner,
								repoName,
								prNumber,
								comments,
							)

							postedCount += results.length
							logger.info(`[PR Comments] ✅ Posted ${results.length} code smell comments for ${filePath}`)
						} else {
							logger.warn(`[PR Comments] No valid comments to post for ${filePath}`)
						}
					} catch (error) {
						const errorMsg = `Failed to post comments for ${filePath}: ${(error as Error).message}`
						errors.push(errorMsg)
						logger.error(`[PR Comments] ❌ ${errorMsg}`, { error })
					}
				}

				suggestionWorkflowResult = {
					success: errors.length === 0,
					postedCount,
					totalIssues: uniqueIssues.length,
					errors,
				}

				logger.info(
					`[PR Comments] ✅ Code smell comment posting completed: ${postedCount}/${uniqueIssues.length} comments posted`,
					{
						success: errors.length === 0,
						taskId,
						prNumber,
						errors,
					},
				)

				// Publish suggestion workflow results
				publish({
					type: "suggestion_workflow_completed",
					taskId,
					data: {
						suggestionWorkflow: suggestionWorkflowResult,
					},
				})
			} else {
				// Log why comments weren't posted
				if (uniqueIssues.length === 0) {
					logger.info(`[PR Comments] No code smells found to post as comments for PR #${prNumber}`)
				}
				if (!repoOwner || !repoName) {
					logger.warn(`[PR Comments] Missing repository info`, { repoOwner, repoName })
				}
			}
		} catch (error) {
			logger.error(`[PR Comments] ❌ Code smell comment posting failed:`, {
				error: (error as Error).message,
				stack: (error as Error).stack,
				taskId,
				prNumber,
			})
			// Don't fail the entire review if comment posting fails
			suggestionWorkflowResult = {
				success: false,
				postedCount: 0,
				totalIssues: uniqueIssues.length,
				errors: [(error as Error).message],
			}
		}
	} else {
		// Log why comment posting was skipped
		logger.warn(`[PR Comments] Skipping comment posting - missing required parameters`, {
			hasAccessToken: !!accessToken,
			hasRepositoryId: !!repositoryId,
			hasUserId: !!userId,
			uniqueIssuesCount: uniqueIssues.length,
		})
	}

	// Return all accumulated issues (deduplicated) from the entire conversation
	// This ensures no code smells are lost even with sliding window truncation or errors
	const result = {
		response: finalResponse.trim(),
		loops,
		structured: { issues: uniqueIssues },
		suggestionWorkflow: suggestionWorkflowResult,
		error: reviewError ? reviewError.message : undefined,
	}

	// If there was an error during review, re-throw it after posting comments
	if (reviewError) {
		logger.warn("[Code Review] Returning results despite error. Accumulated code smells have been posted.", {
			taskId,
			loops,
			issuesFound: uniqueIssues.length,
			error: reviewError.message,
		})
	}

	return result
}
