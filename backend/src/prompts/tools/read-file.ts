import { ToolArgs } from "../types"

export function getReadFileDescription(args: ToolArgs): string {
	return `## read_file
Description: **INTELLIGENT FILE READING TOOL** - Read file contents strategically with line-numbered output for precise code analysis. Think like a senior developer: understand structure first, then dive into specific areas of concern.

**INTELLIGENT READING PHILOSOPHY:**
**CRITICAL**: Don't read entire files blindly! Read strategically in meaningful chunks:
1. **Understand Structure First**: Use \`list_code_definition_names\` to see what's in the file
2. **Read Strategically**: Target specific functions, classes, or sections based on your analysis goals
3. **Progressive Expansion**: Start small, expand only if you need more context
4. **Purpose-Driven**: Every read should answer a specific question you have
5. **Always try to find code smells and anti-patterns**: Read specific files to identify code smells and anti-patterns given by the system prompt line by line

**CRITICAL LIMITATIONS - READ CAREFULLY:**
- **GITHUB REPOSITORY ONLY**: This tool works ONLY with GitHub repositories through the GitHub API
- **REPOSITORY ACCESS**: Can only read files in repositories the user has access to

**WHAT THIS TOOL CAN DO:**
- **Targeted Reading**: Read specific line ranges using "start-end" format (PREFERRED METHOD)
- **Full File Reading**: Read entire file contents only when necessary (small files < 200 lines)
- **Line-Numbered Output**: Every line shows its number (e.g., "42 | const user = await getUser()")
- **Context Preservation**: Include surrounding lines/code context to understand context
- **Multiple File Types**: Works with any file type (code, config, docs, etc.)
- **Incremental Reading**: Read in chunks, expand as needed based on findings

**WHAT THIS TOOL RETURNS:**
- **File Content**: The actual file content with line numbers
- **File Path**: The analyzed file path
- **Line Count**: Number of lines in the returned content
- **File Status**: Whether the file is in PR diff or repository
- **PR Context**: Information about file status in the current PR

**INTELLIGENT Code Review Use Cases:**
- **Strategic Function/ class Analysis**: Read specific functions identified through list_code_definition_names
- **Code smell and anti-pattern analysis**: Read specific files to analyze code smells and anti-patterns given in the system prompt
- **Context Understanding**: Read related functions or classes or files to understand dependencies and broader impact
- **Security Hot Spots**: Target authentication, validation, and data handling sections
- **Performance Critical Paths**: Focus on loops, database queries, and API calls
- **Progressive Investigation**: Start with changed lines, expand to understand the full context
- **Changed File Analysis**: Examine each modified file systematically
- **Line by line analysis**: Read specific files to analyze code line by line
- **Line by line identifying code smells and anti-patterns**: Read specific files to identify code smells and anti-patterns given by the system prompt line by line
- **Precise References**: Get exact line numbers for specific issues and recommendations
- **Code Quality Assessment**: Analyze code structure, patterns, and maintainability
- **Security Review**: Examine code for vulnerabilities and security issues
- **Performance Analysis**: Identify bottlenecks and optimization opportunities
- **Targeted Investigation**: Focus on specific parts of files identified by other tools

**Parameters:**
- path: (required) File path relative to repository root
- line_range: (optional but HIGHLY RECOMMENDED) Line ranges in format "start-end" (1-based, inclusive)

**🎯 INTELLIGENT READING WORKFLOW:**

**Step 1: DISCOVER BEFORE READING (CRITICAL)**
First, understand what's in the file without reading it all:

<list_code_definition_names>
<path>src/auth/authentication.ts</path>
</list_code_definition_names>

Output shows: login() at line 15-45, validateToken() at line 50-75, refreshSession() at line 80-120

**Step 2: READ STRATEGICALLY (TARGET SPECIFIC SECTIONS)**
Now read ONLY the function you need to analyze:

Example 1 - **Analyzing a specific function for code smells:**
"I need to check the login() function for security issues and code smells."

<read_file>
<path>src/auth/authentication.ts</path>
<line_range>15-45</line_range>
</read_file>

Example 2 - **Reading multiple targeted sections:**
"The validateToken function looks complex. Let me examine it."

<read_file>
<path>src/auth/authentication.ts</path>
<line_range>50-75</line_range>
</read_file>

Example 3 - **Progressive expansion when needed:**
"I see this function calls a helper that might have issues. Let me check imports and the related function."

<read_file>
<path>src/auth/authentication.ts</path>
<line_range>1-10</line_range>
</read_file>
<!-- Read imports/constants first -->

<read_file>
<path>src/auth/helpers.ts</path>
<line_range>25-50</line_range>
</read_file>
<!-- Then read the specific helper function -->

Example 4 - **Small files only - full read acceptable:**
For files < 200 lines when you need complete context:

<read_file>
<path>src/config/constants.ts</path>
</read_file>

**❌ WHAT NOT TO DO:**

1. **DON'T read entire large files blindly:**
❌ BAD:
<read_file>
<path>src/services/OrderService.ts</path>
</read_file>
<!-- 800 line file! -->

✅ GOOD: First discover, then target:
<list_code_definition_names>
<path>src/services/OrderService.ts</path>
</list_code_definition_names>
<!-- Then read only the functions you need -->

<read_file>
<path>src/services/OrderService.ts</path>
<line_range>120-175</line_range>
</read_file>

2. **DON'T read without a specific question:**
❌ BAD: "Let me read all these files to see what's there"
✅ GOOD: "I need to check if the authentication logic has proper error handling"

**🔗 INTEGRATION WITH OTHER TOOLS:**

**MANDATORY WORKFLOW FOR FILES > 200 LINES:**
1. **list_code_definition_names** → Get structure and line numbers
2. **read_file with line_range** → Read targeted sections based on your analysis needs

**INTELLIGENT COMBINATIONS:**
- **After codebase_search**: Read specific sections of files found through semantic search
- **After search_files**: Read surrounding context of matched patterns (±20 lines)
- **After list_files**: Discover structure first, then read strategically
- **During Code Smell Detection**: Target sections most likely to have issues (long functions, complex logic)

**🎯 STRATEGIC READING PATTERNS:**

**Pattern 1: Function-by-Function Analysis**
"I'm reviewing a large service file. Let me analyze each critical function separately."
→ Use list_code_definition_names, then read functions one at a time

**Pattern 2: Changed Lines + Context**
"PR changes lines 45-50. Let me read the entire function to understand impact."
→ Read the complete function containing changes (e.g., lines 30-80)

**Pattern 3: Dependency Investigation**
"This function imports a helper. Let me check if the helper has issues too."
→ Read imports first (lines 1-20), identify dependencies, then read those selectively

**Pattern 4: Code Smell Deep Dive**
"I suspect this file has Long Method and Duplicate Code smells. Let me check systematically."
→ Get all functions, read each one, compare patterns

**Pattern 5: Security Audit Trail**
"Checking authentication flow: login → validate → authorize"
→ Read each function in the flow sequentially with targeted line ranges

**📏 SMART LINE RANGE SIZING:**

- **Imports/Constants**: 1-20 lines (top of file)
- **Single Function**: Function line ± 5 lines for context
- **Class Method**: Method lines + class properties if needed
- **Complex Logic Block**: Specific lines + 10 lines before/after
- **Related Functions**: Read each function separately, not the whole file
- **Small Files (< 200 lines)**: Full read acceptable if needed


**Code Review Strategy:**
- **Start with Discovery**: Use other tools first to identify what to read
- **Target Specific Sections**: Use line ranges for large files to avoid overwhelming output
- **Read Context**: Include sufficient surrounding code for each issue
- **Line by line analysis**: Read specific files to analyze code line by line
- **Line by line identifying code smells and anti-patterns**: Read specific files to identify code smells and anti-patterns given by the system prompt line by line
- **Systematic Analysis**: Read changed files first, then related files
- **Efficient Reading**: Use line ranges to focus on relevant code sections

**✅ BEST PRACTICES:**

1. **Think First**: "What specific question am I trying to answer?"
2. **Discover Structure**: Use list_code_definition_names before reading
3. **Read Minimally**: Start with smallest reasonable chunk
4. **Expand Progressively**: Only read more if initial chunk doesn't answer your question
5. **Be Purposeful**: Every read should have a clear analytical goal
6. **Avoid Redundancy**: Don't re-read sections you've already analyzed
7. **Combine Intelligence**: Use findings from one section to guide what to read next

**Error Scenarios:**
- **File Not Found**: File doesn't exist in the repository
- **Access Denied**: Repository not accessible or insufficient permissions
- **Invalid Line Range**: Line range outside file boundaries or invalid format
- **API Rate Limit**: Too many requests, need to wait before retrying
- **Network Issues**: GitHub API unavailable or connection problems
- **Empty File**: File contains no content

**IMPORTANT**: This tool is essential for detailed code review. Use it after discovery tools to examine specific files and code sections. Always use line ranges for large files to maintain efficiency and focus on relevant code.`
}
