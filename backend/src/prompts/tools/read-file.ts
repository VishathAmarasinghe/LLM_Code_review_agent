import { ToolArgs } from "../types"

export function getReadFileDescription(args: ToolArgs): string {
	return `## read_file
Description: **PRIMARY TOOL FOR CODE REVIEW** - Read file contents with line-numbered output for precise code analysis. Essential for examining changed files, understanding context, and providing specific feedback with exact line references.

**CRITICAL LIMITATIONS - READ CAREFULLY:**
- **GITHUB REPOSITORY ONLY**: This tool works ONLY with GitHub repositories through the GitHub API
- **REPOSITORY ACCESS**: Can only read files in repositories the user has access to

**WHAT THIS TOOL CAN DO:**
- **Full File Reading**: Read entire file contents with line numbers
- **Targeted Reading**: Read specific line ranges using "start-end" format
- **Line-Numbered Output**: Every line shows its number (e.g., "42 | const user = await getUser()")
- **Context Preservation**: Maintain surrounding code context for better understanding
- **Multiple File Types**: Works with any file type (code, config, docs, etc.)
- **Large File Handling**: Efficiently handle large files by reading only needed portions

**WHAT THIS TOOL RETURNS:**
- **File Content**: The actual file content with line numbers
- **File Path**: The analyzed file path
- **Line Count**: Number of lines in the returned content
- **File Status**: Whether the file is in PR diff or repository
- **PR Context**: Information about file status in the current PR

**Code Review Use Cases:**
- **Changed File Analysis**: Examine each modified file systematically
- **Context Understanding**: Read related files to understand the broader impact
- **Code smell and anti-pattern analysis**: Read specific files to analyze code smells and anti-patterns given in the system prompt
- **Line by line analysis**: Read specific files to analyze code line by line
- **Line by line identifying code smells and anti-patterns**: Read specific files to identify code smells and anti-patterns given by the system prompt line by line
- **Precise References**: Get exact line numbers for specific issues and recommendations
- **Code Quality Assessment**: Analyze code structure, patterns, and maintainability
- **Security Review**: Examine code for vulnerabilities and security issues
- **Performance Analysis**: Identify bottlenecks and optimization opportunities
- **Targeted Investigation**: Focus on specific parts of files identified by other tools

**Parameters:**
- path: (required) File path relative to repository root
- line_range: (optional) Line ranges in format "start-end" (1-based, inclusive, e.g., "1-50", "25-45")

**Code Review Workflow - Use After Discovery Tools:**

1. **Full File Reading** (for small to medium files):
<read_file>
<path>src/auth/authentication.ts</path>
</read_file>

2. **Targeted Reading** (use line numbers from list_code_definition_names):
<read_file>
<path>src/auth/authentication.ts</path>
<line_range>15-40</line_range>
</read_file>

3. **Specific Function Analysis** (target specific functions):
<read_file>
<path>src/utils/validation.ts</path>
<line_range>25-45</line_range>
</read_file>

4. **Class Structure Review** (target specific classes):
<read_file>
<path>src/models/User.ts</path>
<line_range>10-80</line_range>
</read_file>

**Integration with Other Tools:**
- **After list_code_definition_names**: Use line numbers to read specific functions/classes
- **After codebase_search**: Read files found through semantic search
- **After search_files**: Read files that contain specific patterns or issues
- **After list_files**: Read specific files identified through directory exploration

**Code Review Strategy:**
- **Start with Discovery**: Use other tools first to identify what to read
- **Target Specific Sections**: Use line ranges for large files to avoid overwhelming output
- **Read Context**: Include sufficient surrounding code for each issue
- **Line by line analysis**: Read specific files to analyze code line by line
- **Line by line identifying code smells and anti-patterns**: Read specific files to identify code smells and anti-patterns given by the system prompt line by line
- **Systematic Analysis**: Read changed files first, then related files
- **Efficient Reading**: Use line ranges to focus on relevant code sections

**Best Practices:**
- **Use After Discovery**: Use list_code_definition_names or other tools first to identify what to read
- **Target Specific Code**: Use line numbers to read only the functions/classes you need
- **Handle Large Files**: Use line ranges for large files to avoid overwhelming output
- **Read Context**: Include surrounding lines to understand code context
- **Combine with Analysis**: Use read results for detailed code review and recommendations

**Error Scenarios:**
- **File Not Found**: File doesn't exist in the repository
- **Access Denied**: Repository not accessible or insufficient permissions
- **Invalid Line Range**: Line range outside file boundaries or invalid format
- **API Rate Limit**: Too many requests, need to wait before retrying
- **Network Issues**: GitHub API unavailable or connection problems
- **Empty File**: File contains no content

**IMPORTANT**: This tool is essential for detailed code review. Use it after discovery tools to examine specific files and code sections. Always use line ranges for large files to maintain efficiency and focus on relevant code.`
}
