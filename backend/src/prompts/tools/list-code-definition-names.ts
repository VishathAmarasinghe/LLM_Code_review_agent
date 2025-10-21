import { ToolArgs } from "../types"

export function getListCodeDefinitionNamesDescription(args: ToolArgs): string {
	return `## list_code_definition_names
Description: **CODE SYMBOL DISCOVERY TOOL FOR CODE REVIEW** - Extract and list all code symbols (functions, classes, interfaces, variables) from a specific file with their exact line numbers. Essential for targeted code review and efficient file analysis.

**CRITICAL LIMITATIONS - READ CAREFULLY:**
- **SINGLE FILE ONLY**: This tool works on ONE file at a time, not directories
- **GITHUB REPOSITORY ONLY**: Works only with GitHub repositories through the GitHub API
- **STATIC ANALYSIS ONLY**: Only finds symbols that are statically defined in the code

**WHAT THIS TOOL CAN DO:**
- **Symbol Discovery**: Find all classes, functions, methods, interfaces, types, variables, constants
- **Line Number Mapping**: Get exact line numbers where each symbol is defined
- **Symbol Classification**: Identify the type of each symbol (function, class, interface, etc.)
- **File Overview**: Get a complete "table of contents" for any file
- **Targeted Reading**: Enable precise file reading by targeting specific functions/classes

**WHAT THIS TOOL RETURNS:**
- **Symbol Names**: The actual names of functions, classes, variables, etc.
- **Symbol Types**: What kind of symbol it is (function, class, interface, type, unknown)
- **Line Numbers**: Exact start and end line numbers for each symbol
- **File Path**: The analyzed file path
- **Total Count**: Number of symbols found in the file

**Code Review Workflow - Use Before read_file:**

1. **Get File Overview** (discover what's in the file):
<list_code_definition_names>
<path>src/auth/authentication.ts</path>
</list_code_definition_names>

2. **Target Specific Function** (use line numbers from step 1):
<read_file>
<path>src/auth/authentication.ts</path>
<line_range>15-40</line_range>
</read_file>

3. **Target Specific Class** (use line numbers from step 1):
<read_file>
<path>src/auth/authentication.ts</path>
<line_range>45-125</line_range>
</read_file>

**Code Review Use Cases:**

1. **Efficient File Analysis**:
<list_code_definition_names>
<path>src/components/UserProfile.tsx</path>
</list_code_definition_names>

2. **Function-Specific Review**:
<list_code_definition_names>
<path>src/utils/validation.ts</path>
</list_code_definition_names>

3. **Class Structure Analysis**:
<list_code_definition_names>
<path>src/models/User.ts</path>
</list_code_definition_names>

4. **API Interface Review**:
<list_code_definition_names>
<path>src/api/userService.ts</path>
</list_code_definition_names>

**Parameters:**
- path: (required) Single file to analyze (relative to repository root)

**Symbol Types Detected:**
- **Functions**: function declarations, arrow functions, method definitions
- **Classes**: class declarations and definitions
- **Interfaces**: TypeScript interface definitions
- **Types**: TypeScript type definitions and enums
- **Variables**: const, let, var declarations
- **React Components**: React functional and class components
- **Constants**: Named constants and exports

**Code Review Strategy:**
- **Start with Symbol Discovery**: Use this tool first to understand what's in a file
- **Target Specific Code**: Use line numbers to read only the functions/classes you need
- **Efficient Analysis**: Avoid reading entire large files - target specific symbols
- **Pattern Recognition**: Look for code smells in specific functions/classes
- **API Review**: Focus on public interfaces and exported symbols

**Integration with Other Tools:**
- **Before read_file**: Use to identify which parts of a file to read
- **After list_files**: Use to understand what's in specific files
- **With codebase_search**: Get detailed symbol information for files found in search
- **Before search_files**: Know what symbols to search for in pattern matching

**Best Practices:**
- **Use First**: Always use this tool before reading large files
- **Target Specific Symbols**: Use line numbers to read only what you need
- **Focus on Public APIs**: Pay special attention to exported functions and classes
- **Check Symbol Count**: Files with too many symbols might indicate code smell
- **Combine with read_file**: Use line numbers for targeted, efficient reading

**Error Scenarios:**
- **File Not Found**: File doesn't exist in the repository
- **Access Denied**: Repository not accessible or insufficient permissions
- **Invalid File Type**: File type not supported for symbol extraction
- **Empty File**: File contains no code symbols
- **Parse Errors**: File has syntax errors that prevent symbol extraction

**IMPORTANT**: This tool is essential for efficient code review. Use it to get a file overview and then use the line numbers to read only the specific functions, classes, or code sections you need to analyze. This saves time and allows for more targeted, thorough reviews.`
}
