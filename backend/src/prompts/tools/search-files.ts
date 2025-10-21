import { ToolArgs } from "../types"

export function getSearchFilesDescription(args: ToolArgs): string {
	return `## search_files
Description: **PATTERN ANALYSIS TOOL FOR CODE REVIEW** - Perform regex-based searches across files to find specific patterns, anti-patterns, and code issues. Essential for comprehensive code review analysis and quality assessment.

**Code Review Use Cases:**
- **Security Scanning**: Find potential vulnerabilities (SQL injection, XSS, hardcoded secrets)
- **Anti-Pattern Detection**: Identify code smells and architectural issues
- **Consistency Analysis**: Find similar patterns and inconsistencies across codebase
- **Performance Issues**: Locate inefficient patterns and potential bottlenecks
- **Testing Coverage**: Find test files and analyze test patterns
- **Documentation Analysis**: Locate and analyze documentation files

**Search Capabilities:**
- **Context-Rich Results**: Each match includes surrounding code context
- **Recursive Search**: Searches all subdirectories automatically
- **File Filtering**: Target specific file types (TypeScript, JavaScript, etc.)
- **Pattern Matching**: Use powerful regex patterns for precise searches

**Parameters:**
- path: (required) Directory to search (relative to workspace root ${args.cwd})
- regex: (required) Regular expression pattern (Rust regex syntax)
- file_pattern: (optional) File type filter (e.g., '*.ts', '*.js', '*.py')

**Code Review Search Patterns:**

1. **Security Vulnerabilities**:
<search_files>
<path>src</path>
<regex>(password|secret|key|token).*=.*['\"][^'\"]+['\"]</regex>
<file_pattern>*.ts</file_pattern>
</search_files>

2. **SQL Injection Risks**:
<search_files>
<path>src</path>
<regex>query.*\+.*['\"]</regex>
<file_pattern>*.ts</file_pattern>
</search_files>

3. **Error Handling Patterns**:
<search_files>
<path>src</path>
<regex>try\s*\{[^}]*\}\s*catch</regex>
<file_pattern>*.ts</file_pattern>
</search_files>

4. **Test Files**:
<search_files>
<path>.</path>
<regex>describe|it\(|test\(</regex>
<file_pattern>*.test.*</file_pattern>
</search_files>

5. **TODO Comments**:
<search_files>
<path>src</path>
<regex>TODO|FIXME|HACK|XXX</regex>
<file_pattern>*.ts</file_pattern>
</search_files>

6. **Performance Anti-Patterns**:
<search_files>
<path>src</path>
<regex>for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)</regex>
<file_pattern>*.ts</file_pattern>
</search_files>

**Best Practices:**
- **Use After codebase_search**: First understand the architecture, then search for specific patterns
- **Craft Precise Patterns**: Use specific regex patterns to avoid false positives
- **Filter by File Type**: Use file_pattern to focus on relevant file types
- **Analyze Context**: Review the surrounding code context for each match
- **Combine Patterns**: Use multiple searches to build a comprehensive picture

**IMPORTANT**: This tool is most effective when used after codebase_search to understand the overall architecture. Use it to find specific patterns and issues within the broader context.`
}
