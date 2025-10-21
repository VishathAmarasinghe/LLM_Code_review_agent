import { ToolArgs } from "../types"

export function getListFilesDescription(args: ToolArgs): string {
	return `## list_files
Description: **PROJECT STRUCTURE TOOL FOR CODE REVIEW** - Explore directory structure and file organization to understand project architecture and locate relevant files for comprehensive code review analysis.

**CRITICAL LIMITATIONS - READ CAREFULLY:**
- **GITHUB REPOSITORY ONLY**: This tool works ONLY with GitHub repositories through the GitHub API
- **AUTHENTICATION REQUIRED**: Requires valid GitHub access token and repository permissions
- **API RATE LIMITS**: Subject to GitHub API rate limiting (5000 requests/hour for authenticated users)
- **REPOSITORY ACCESS**: Can only list files in repositories the user has access to
- **BRANCH CONTEXT**: Lists files from the current branch or PR branch being reviewed
- **NO LOCAL FILES**: Cannot access local files or uncommitted changes directly

**WHAT THIS TOOL CAN DO:**
- **Project Architecture**: Understand overall project structure and organization
- **File Discovery**: Locate related files, tests, and documentation
- **Module Analysis**: Identify component boundaries and dependencies
- **Test Structure**: Find test files and understand testing organization
- **Documentation Review**: Locate documentation and configuration files
- **Change Impact**: Understand which files might be affected by changes
- **File Metadata**: Get file names, paths, types, sizes, and GitHub URLs
- **Directory Navigation**: Navigate through complex directory structures

**WHAT THIS TOOL RETURNS:**
- **File Information**: Name, path, type (file/directory), size, GitHub URL
- **Directory Structure**: Hierarchical view of files and folders
- **File Count**: Total number of files found
- **Path Context**: Full paths relative to repository root

**Code Review Use Cases:**

1. **Initial Project Understanding**:
<list_files>
<path>.</path>
<recursive>false</recursive>
</list_files>

2. **Source Code Architecture**:
<list_files>
<path>src</path>
<recursive>true</recursive>
</list_files>

3. **Test Organization Analysis**:
<list_files>
<path>tests</path>
<recursive>true</recursive>
</list_files>

4. **Configuration and Build Files**:
<list_files>
<path>.</path>
<recursive>false</recursive>
</list_files>

5. **Component Structure**:
<list_files>
<path>src/components</path>
<recursive>true</recursive>
</list_files>

6. **API and Service Layers**:
<list_files>
<path>src/api</path>
<recursive>true</recursive>
</list_files>

**Parameters:**
- path: (required) Directory to explore (relative to repository root)
- recursive: (optional) true for recursive listing, false/omit for top-level only

**Code Review Strategy:**
- **Start with Root**: Understand overall project structure first
- **Explore Source**: Map source code organization and modules
- **Find Tests**: Locate test files and understand testing strategy
- **Check Config**: Review configuration and build files
- **Documentation**: Find documentation and README files
- **Component Mapping**: Understand component hierarchy and relationships

**Integration with Other Tools:**
- **Before codebase_search**: Use to understand project structure before semantic search
- **Before read_file**: Identify which files to examine in detail
- **Before search_files**: Understand where to search for specific patterns
- **With list_code_definition_names**: Combine file structure with code symbols

**Best Practices:**
- **Use Early in Review**: Understand structure before diving into specific files
- **Recursive for Source**: Use recursive listing for source code directories
- **Top-Level for Overview**: Use non-recursive for high-level understanding
- **Combine with Other Tools**: Use with codebase_search and read_file for comprehensive analysis
- **Handle Large Directories**: Be aware that recursive listing of large directories may be slow

**Error Scenarios:**
- **Access Denied**: Repository not accessible or insufficient permissions
- **Path Not Found**: Directory doesn't exist in the repository
- **API Rate Limit**: Too many requests, need to wait before retrying
- **Network Issues**: GitHub API unavailable or connection problems

**IMPORTANT**: This tool is essential for understanding project structure before conducting detailed code review. Use it to map the codebase and identify all relevant files for analysis. Always start with high-level structure before diving into specific files.`
}
