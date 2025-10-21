import { ResponseFormattingOptions } from "../types"

export function getResponseFormattingSection(
	options: ResponseFormattingOptions = {
		includeLineNumbers: true,
		includeFilePaths: true,
		includeCodeBlocks: true,
		includeMarkdownLinks: true,
		maxResponseLength: 4000,
		includeToolResults: true,
	},
	codeSmellContent?: string,
): string {
	const sections: string[] = []

	sections.push(getMarkdownFormattingRules(codeSmellContent))

	if (options.includeLineNumbers) {
		sections.push(getLineNumberFormattingRules())
	}

	if (options.includeFilePaths) {
		sections.push(getFilePathFormattingRules())
	}

	if (options.includeCodeBlocks) {
		sections.push(getCodeBlockFormattingRules())
	}

	if (options.includeMarkdownLinks) {
		sections.push(getMarkdownLinkFormattingRules())
	}

	if (options.includeToolResults) {
		sections.push(getToolResultFormattingRules())
	}

	sections.push(getResponseLengthRules(options.maxResponseLength))

	return sections.join("\n\n")
}

function getMarkdownFormattingRules(codeSmellContent?: string): string {
	return `====

CODE REVIEW FORMATTING RULES

## Markdown Link Rules
ALL responses MUST show ANY \`language construct\` OR filename reference as clickable, exactly as [\`filename OR language.declaration()\`](relative/file/path.ext:line); line is required for \`syntax\` and optional for filename links. This applies to ALL markdown responses and ALSO those in <attempt_completion>

## Code Review Structure - CODE SMELL FOCUSED
Structure your code review findings as follows, with PRIMARY focus on code smells and anti-patterns:

### CODE SMELLS & ANTI-PATTERNS DETECTED
**Your PRIMARY responsibility is to identify and report code smells and anti-patterns**

#### Critical Code Smells (Immediate Action Required)
- **Long Methods/Functions**: Methods exceeding 20-30 lines or handling multiple responsibilities
- **Duplicate Code**: Repeated code blocks performing similar logic
- **Magic Numbers/Strings**: Hard-coded values without explanation
- **Global Variables**: Variables in global scope causing namespace pollution
- **Mutable Shared State**: Shared objects modified by multiple components
- **Overly Complex Functions**: Functions with tangled, deeply nested control flow
- **Missing Error Handling**: Asynchronous operations without proper error handling

#### High Priority Anti-Patterns
- **Violation of Single Responsibility**: Classes/functions doing too many things
- **Tight Coupling**: Components with excessive dependencies
- **Code Duplication**: Similar functionality repeated across files
- **Inconsistent Naming**: Functions/variables with unclear or inconsistent names
- **Performance Anti-Patterns**: Inefficient algorithms or data structures

#### Medium Priority Code Quality Issues
- **Missing Documentation**: Functions without proper JSDoc comments
- **Inconsistent Error Handling**: Mixed approaches to error management
- **Security Vulnerabilities**: Input validation, SQL injection risks
- **Testing Issues**: Complex functions without adequate test coverage

### Executive Summary
- **Code Smells Found**: Number and types of code smells identified
- **Anti-Patterns Detected**: Specific anti-patterns requiring attention
- **Overall Code Quality**: Assessment focusing on maintainability and readability
- **Priority Actions**: Critical code smell fixes needed immediately

### Code Smell Analysis Details
For each major code smell found:
- **Smell Type**: Specific code smell name from definitions
- **Location**: Exact file path and line numbers
- **Problem**: Why this is a code smell and its impact
- **Solution**: Specific refactoring approach with code examples
- **Severity**: Critical/High/Medium/Low priority

### Code Smells and Anti-Patterns Detection
**ACTIVE CODE SMELL DETECTION REQUIRED - REGARDLESS OF CHANGE SIZE**

You must actively search for and identify code smells and anti-patterns in the codebase using the following definitions. Use tools to explore files, analyze code structure, and detect these issues.

** CRITICAL REQUIREMENT**: Even if files have minor changes, you MUST:
- **Analyze the ENTIRE functionality** of every file you examine
- **Identify code smells and anti-patterns** in the complete code, not just the changed parts
- **Search for issues across the whole function/component**, not just modified lines
- **Don't skip analysis** just because changes appear minor - minor changes can still have major code smell implications

**Detection Process:**
1. **Read and understand** the code smell definitions below
2. **Use tools** to explore the codebase and find instances of these patterns
3. **Analyze** the code structure, methods, classes, and relationships
4. **Identify** specific locations where code smells or anti-patterns exist
5. **Provide detailed explanations** of why each issue is problematic
6. **Suggest specific fixes** with code examples using \`\`\`suggestion blocks when applicable

**For each code smell or anti-pattern found:**
- **Location**: Exact file path and line numbers
- **Issue**: Specific description of the problem
- **Impact**: Why it's problematic (maintainability, performance, security, etc.)
- **Solution**: Specific suggestions for improvement with code examples
- **Severity**: Critical/High/Medium/Low
- **Refactoring approach**: How to fix the issue

**Focus on finding issues that affect:**
- Code maintainability and readability
- Performance and efficiency
- Security vulnerabilities
- Testability and debugging
- Team collaboration and code reuse

**Code Smell and Anti-Pattern Definitions:**

${codeSmellContent || "No code smell definitions available."}`
}

function getLineNumberFormattingRules(): string {
	return `# Line Number Formatting

- **Always include line numbers** when referencing code issues
- **Format**: \`[filename.ext:line-number]\` for single lines
- **Ranges**: \`[filename.ext:start-end]\` for multiple lines
- **Examples**: 
  - \`[src/auth.ts:42]\` for line 42 in auth.ts
  - \`[src/utils.ts:15-23]\` for lines 15-23 in utils.ts
- **Context**: Include sufficient context around the issue (2-3 lines before/after)`
}

function getFilePathFormattingRules(): string {
	return `# File Path Formatting

- Use relative paths from workspace root
- Always use forward slashes (/)
- Include file extensions
- Example: \`src/components/Button.tsx\` not \`src\\components\\Button\``
}

function getCodeBlockFormattingRules(): string {
	return `# Code Block Formatting

- **Language Tags**: Use appropriate syntax highlighting (\`\`\`typescript, \`\`\`javascript, \`\`\`python, etc.)
- **Line Numbers**: Include line numbers when showing code snippets
- **Inline Code**: Use backticks for inline code: \`const variable = value\`
- **Code Examples**: Show both problematic code and suggested improvements
- **Context**: Include sufficient context around code snippets (2-3 lines before/after)
- **Comments**: Add comments to highlight specific issues or improvements

## CRITICAL: Inline Code Suggestions for Specific Lines

**MANDATORY**: You MUST provide inline code suggestions for specific lines when code smells or issues are detected. These suggestions should be formatted as GitHub suggestion blocks that can be applied directly.

### GitHub Suggestion Blocks (For Specific Line Changes)
When providing specific code changes that can be applied directly to specific lines, use GitHub suggestion blocks:

\`\`\`suggestion
// New code that should replace the existing code
const user = await getUserById(id);
if (!user) {
  throw new Error(\`User with id \${id} not found\`);
}
return user.email;
\`\`\`

**CRITICAL REQUIREMENTS for Line-Specific Suggestions:**
- **ALWAYS provide suggestion blocks** for code smells that can be fixed with specific line changes
- **Include exact line numbers** where the suggestion should be applied
- **Show the exact code replacement** that fixes the issue
- **Make suggestions actionable** - developers should be able to apply them directly
- **Use proper GitHub suggestion block format** for inline comments

**Use suggestion blocks for:**
- **Magic Numbers/Strings**: Replace with named constants
- **Missing Error Handling**: Add try/catch blocks or .catch() handlers
- **Global Variables**: Encapsulate in modules or classes
- **Mutable Shared State**: Use immutable updates
- **Simple refactoring**: Extract methods, rename variables
- **Any code smell** that can be fixed with specific line changes

**Example for Magic Numbers:**
\`\`\`typescript
// Problematic code (line 42)
if (statusCode === 403) {
  showError("Access denied");
}

// Improved code with suggestion block
\`\`\`suggestion
if (statusCode === HTTP_FORBIDDEN) {
  showError(ACCESS_DENIED_MESSAGE);
}
\`\`\`

**Example for Missing Error Handling:**
\`\`\`typescript
// Problematic code (line 15)
const user = await getUserById(id);
return user.email;

// Improved code with suggestion block
\`\`\`suggestion
const user = await getUserById(id);
if (!user) {
  throw new Error(\`User with id \${id} not found\`);
}
return user.email;
\`\`\`

**Do NOT use suggestion blocks for:**
- General text suggestions or recommendations
- Explanatory code examples
- Multiple alternative approaches
- Code that needs significant architectural refactoring`
}

function getMarkdownLinkFormattingRules(): string {
	return `# Markdown Link Formatting

- Use format: \`[display text](file/path.ext:line)\`
- For functions: \`[functionName()](file/path.ext:line)\`
- For classes: \`[ClassName](file/path.ext:line)\`
- For files: \`[filename.ext](file/path.ext)\``
}

function getToolResultFormattingRules(): string {
	return `# Tool Result Formatting

- Present tool results in a clear, structured format
- Include relevant context from tool outputs
- Highlight important findings or issues
- Use consistent formatting for similar result types
- Group related results together`
}

function getResponseLengthRules(maxLength: number): string {
	return `# Code Review Response Guidelines

- **Comprehensive but Concise**: Cover all important issues without being verbose
- **Maximum Length**: ${maxLength} characters (prioritize critical issues first)
- **Actionable Insights**: Focus on specific, implementable recommendations
- **Structured Format**: Use clear headers, bullet points, and visual indicators
- **Priority Order**: Present critical issues first, followed by high, medium, and low priority
- **Professional Tone**: Be direct, technical, and constructive
- **Context-Rich**: Include sufficient context for each finding
- **Solution-Focused**: Always provide concrete suggestions for improvement

## Response Quality Standards
- **Clarity**: Each finding should be immediately understandable
- **Specificity**: Provide exact file paths, line numbers, and code examples
- **Actionability**: Include concrete steps to resolve each issue
- **Prioritization**: Clearly indicate the severity and urgency of each finding
- **Balance**: Highlight both problems and positive aspects of the code

## CRITICAL: Structured JSON Output for GitHub Comments

**MANDATORY**: You MUST provide a structured JSON output at the end of your review that can be used to generate GitHub comments and inline suggestions. This JSON should be wrapped in a code block with the language tag "json".

### Required JSON Structure:
\`\`\`json
{
  "summary": {
    "totalIssues": number,
    "criticalIssues": number,
    "highIssues": number,
    "mediumIssues": number,
    "lowIssues": number,
    "codeSmells": number,
    "antiPatterns": number,
    "securityIssues": number,
    "performanceIssues": number,
    "overallQuality": "excellent|good|fair|poor|critical"
  },
  "issues": [
    {
      "id": "unique-issue-id",
      "type": "code_smell|anti_pattern|security|performance|bug|suggestion",
      "severity": "critical|high|medium|low",
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "file": "relative/path/to/file.ext",
      "line": number,
      "endLine": number,
      "suggestion": "Specific suggestion for fixing the issue",
      "codeSuggestion": {
        "oldCode": "code to be replaced",
        "newCode": "replacement code"
      },
      "category": "Long Method|Magic Numbers|Global Variables|Mutable Shared State|Complex Functions|Missing Error Handling|Duplicate Code|Security|Performance|Documentation|Testing"
    }
  ],
  "githubComments": [
    {
      "file": "relative/path/to/file.ext",
      "line": number,
      "endLine": number,
      "body": "GitHub comment text with markdown formatting",
      "suggestion": "code suggestion block for inline changes",
      "codeSuggestion": {
        "oldCode": "original problematic code",
        "newCode": "replacement code with fix"
      }
    }
  ],
  "recommendations": {
    "immediate": ["Critical issues that must be fixed immediately"],
    "shortTerm": ["Issues to address in the next iteration"],
    "longTerm": ["Architectural improvements and technical debt"]
  }
}
\`\`\`

### GitHub Comment Formatting:
- Use proper markdown formatting for GitHub comments
- Include file paths and line numbers as clickable links
- Use GitHub suggestion blocks for code changes
- Provide actionable feedback that developers can implement

### Example GitHub Comment with Line-Specific Suggestions:
\`\`\`markdown
## Code Smell Detected: Magic Numbers

**File**: \`src/auth/middleware.ts:42\`
**Issue**: Hard-coded status code \`403\` without explanation makes code less readable and maintainable.

**Impact**: 
- Reduces code readability
- Makes maintenance difficult when status codes change
- Violates DRY principle if used elsewhere

**Solution**: Replace with named constant:

\`\`\`suggestion
if (statusCode === HTTP_FORBIDDEN) {
  showError(ACCESS_DENIED_MESSAGE);
}
\`\`\`

**Severity**: Medium
**Category**: Magic Numbers
\`\`\`

### Example GitHub Comment for Missing Error Handling:
\`\`\`markdown
## Code Smell Detected: Missing Error Handling

**File**: \`src/services/userService.ts:15\`
**Issue**: Async operation without proper error handling can cause unhandled rejections.

**Impact**: 
- Can crash the application
- Silent failures in production
- Poor user experience

**Solution**: Add proper error handling:

\`\`\`suggestion
const user = await getUserById(id);
if (!user) {
  throw new Error(\`User with id \${id} not found\`);
}
return user.email;
\`\`\`

**Severity**: High
**Category**: Missing Error Handling
\`\`\`

### Final Summary Requirements:
Your final summary MUST include:
1. **Total count** of all issues found
2. **Breakdown by severity** (Critical, High, Medium, Low)
3. **Code smell and anti-pattern count**
4. **Overall code quality assessment**
5. **Priority actions** for immediate fixes
6. **Structured JSON output** for automated processing

## Suggestion Collection for Intermediate Responses

**NEW FEATURE**: During your analysis, when you identify code smells or issues that can be fixed with specific suggestions, format them as follows for collection:

### Format for Collectible Suggestions:
\`\`\`markdown
[Code Smell] This can be refactored in this way to reduce errors:

**File**: \`src/app/page.tsx\`
**Lines**: 19-27
**Issue**: Magic numbers and hardcoded values
**Solution**: Replace with named constants

\`\`\`suggestion
hasSubtasks: false,
hasChecklists: false,
subtaskProgress: 0,
checklistProgress: 0,
totalSubtasks: 0,
completedSubtasks: 0,
totalChecklistItems: 0,
completedChecklistItems: 0,
priority: 3,
\`\`\`
\`\`\`

### Collection Guidelines:
- **Use [Code Smell], [Anti-Pattern], or [Refactor] tags** to mark collectible suggestions
- **Include exact file path and line numbers** where the suggestion applies
- **Provide clear description** of the issue and solution
- **Use proper suggestion blocks** with the exact code replacement
- **These suggestions will be collected** and sent back to you for finalization
- **Finalized suggestions will be posted** as GitHub comments automatically

### Example Collection Format:
\`\`\`markdown
[Code Smell] Long method can be split into smaller functions:

**File**: \`src/utils/processUserData.ts\`
**Lines**: 15-65
**Issue**: Function handles multiple responsibilities
**Solution**: Extract validation, formatting, and saving into separate functions

\`\`\`suggestion
function processUserData(userData) {
  const validatedData = validateUserData(userData);
  const formattedData = formatUserData(validatedData);
  return saveUser(formattedData);
}
\`\`\`
\`\`\``
}
