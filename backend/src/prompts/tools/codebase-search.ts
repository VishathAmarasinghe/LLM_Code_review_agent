export function getCodebaseSearchDescription(): string {
	return `## codebase_search
Description: **CRITICAL TOOL FOR CODE REVIEW** - Semantic search to understand code architecture, relationships, and context. This tool finds files and code based on meaning rather than keywords, making it essential for comprehensive code review.

** CRITICAL LIMITATIONS - READ CAREFULLY:**
- **REPOSITORY SCOPE ONLY**: This tool searches ONLY the base repository code that has been indexed
- **NO PR CHANGES**: The vector database contains ONLY the existing repository code, NOT the changes in the current PR
- **NO UNCOMMITTED CODE**: Cannot find code that exists only in the PR diff or uncommitted changes
- **INDEXED CODE ONLY**: Only searches code that has been previously indexed in the vector database

** WHAT THIS TOOL CAN DO:**
- **Architecture Understanding**: Find existing components, services, and modules in the repository
- **Dependency Analysis**: Discover how existing code relates to other parts of the system
- **Pattern Recognition**: Find similar existing implementations and design patterns
- **Security Analysis**: Locate existing authentication, authorization, and security-related code
- **Performance Investigation**: Find existing performance-critical sections and optimization opportunities
- **Testing Strategy**: Discover existing test patterns and coverage approaches
- **Context Building**: Understand the existing codebase structure and relationships

** WHAT THIS TOOL CANNOT DO:**
- **Find PR Changes**: Cannot search for code that only exists in the current PR
- **Find Uncommitted Code**: Cannot find code that hasn't been committed to the repository
- **Find New Files**: Cannot find files that were added in the PR but not yet indexed
- **Find Modified Code**: Cannot find the new versions of files that were modified in the PR

**Search Strategy:**
- Use natural language queries that describe what you're looking for in the EXISTING codebase. 
- make natural language queries that are in english and with good query which contains more context and meaning(for example: "authentication middleware and user session management" is a good query, "authentication" is not a good query).
- Focus on functionality, purpose, and relationships rather than exact code patterns
- Reuse user's exact wording when it describes the functionality you need to understand
- Translate non-English queries to English before searching
- Remember: You're searching the BASE repository, not the PR changes

**Parameters:**
- query: (required) Natural language description of what you're looking for in the existing codebase
- path: (optional) Directory to search in (relative to workspace root). Use for focused searches.
- limit: (optional) Maximum number of results to return (default: 50)

**Usage:**
<codebase_search>
<query>authentication middleware and user session management</query>
<path>src/auth</path>
</codebase_search>

**Code Review Examples:**
1. Understanding existing system architecture:
<codebase_search>
<query>API endpoints and request handling</query>
</codebase_search>

2. Finding existing security implementations:
<codebase_search>
<query>password hashing and encryption</query>
</codebase_search>

3. Discovering existing test patterns:
<codebase_search>
<query>unit tests and mocking strategies</query>
</codebase_search>

4. Performance analysis of existing code:
<codebase_search>
<query>database queries and caching mechanisms</query>
</codebase_search>

**IMPORTANT**: 
- This tool searches the EXISTING repository code only, not PR changes
- Use this tool to understand the current codebase context and architecture
- For PR-specific changes, use read_file, search_files, or other tools that can access the actual PR content
- Always use this tool first when exploring new areas of the existing codebase`
}
