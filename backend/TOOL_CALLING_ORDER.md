# Tool Calling Order in Code Review Agent

## Overview

The code review agent uses a **LLM-orchestrated workflow** where the AI decides which tools to call and in what order based on the context and requirements. However, there are specific guidelines and patterns that guide this decision-making process.

## Workflow Architecture

```
User Request → WorkflowEngine → LLM Orchestrator → Tool Execution → Response
```

## Tool Calling Hierarchy

### 1. **Primary Workflow Structure**

The system follows a single-step workflow pattern:

- **Step 1**: `LLM Orchestrated Review` - The LLM takes full control and decides tool sequence
- **No predefined sequence** - The LLM dynamically chooses tools based on context

### 2. **Tool Priority Guidelines** (From System Prompts)

The LLM is instructed to follow this priority order:

#### **Phase 1: Context Discovery**

1. **`codebase_search`** - **MUST BE FIRST** for any new code exploration

    - Uses semantic search to understand code meaning
    - Required before any other search/file exploration tools
    - Applies throughout the entire conversation, not just at the beginning

2. **`search_files`** - Secondary exploration (only after codebase_search)
    - Used for specific pattern matching with regex
    - Find code patterns, TODO comments, function definitions

#### **Phase 2: File Analysis**

3. **`list_code_definition_names`** - Discover symbols before reading files

    - Find functions, classes, and other symbols
    - Helps understand file structure before detailed reading

4. **`read_file`** - Detailed code examination

    - Use specific line ranges (e.g., `line_range: "1-50"`)
    - Avoid reading entire large files unless necessary

5. **`list_files`** - Directory structure exploration
    - Understand project organization
    - Explore directory structures

## Tool Execution Flow

### **Decision Engine Controls**

The system includes intelligent decision-making:

- **Concurrency Control**: Max 3 active tools simultaneously
- **Rate Limiting**: Automatic delays when too many tools are active
- **Retry Logic**: Failed tools are retried with exponential backoff
- **Timeout Management**: Tools have configurable timeouts
- **Error Handling**: Graceful failure handling with fallback strategies

### **LLM Orchestration Process**

```
1. Initialize conversation context
2. Build system prompt with tool guidelines
3. Generate tool schemas for available tools
4. LLM decides tool sequence based on:
   - Current context
   - Previous tool results
   - System guidelines
   - Task requirements
5. Execute tools in LLM-chosen order
6. Process results and continue until completion
```

## Available Tools

### **Core Tools**

- **`codebase_search`** - Semantic code search (HIGHEST PRIORITY)
- **`search_files`** - Regex-based file search
- **`read_file`** - File content reading with line ranges
- **`list_files`** - Directory listing
- **`list_code_definition_names`** - Symbol discovery

### **Tool Parameters**

- **`path`** - File/directory path (required for most tools)
- **`line_range`** - Line range in format "start-end" (e.g., "1-50")
- **`query`** - Search query for codebase_search
- **`regex`** - Regex pattern for search_files
- **`recursive`** - Recursive directory listing
- **`limit`** - Maximum results to return

## Example Tool Calling Sequence

### **Typical Code Review Flow**:

```
1. codebase_search: "authentication logic"
   ↓
2. codebase_search: "user validation"
   ↓
3. list_code_definition_names: "src/auth/"
   ↓
4. read_file: "src/auth/login.ts" with line_range: "1-50"
   ↓
5. read_file: "src/auth/validation.ts" with line_range: "25-75"
   ↓
6. search_files: "TODO.*security"
   ↓
7. codebase_search: "error handling patterns"
```

## Key Principles

### **1. Semantic First**

- Always start with `codebase_search` for new code exploration
- Use meaning-based search before pattern-based search

### **2. Context Awareness**

- Build understanding progressively
- Use tool results to inform next tool choices
- Maintain conversation context across tool calls

### **3. Code Smell Detection Priority** 🚨

- **During analysis phase**: Prioritize identifying code smells and anti-patterns from the comprehensive definitions
- Focus on long methods, magic numbers, duplicate code, poor naming, tight coupling, etc.
- Use the detailed code smell guide to identify specific quality issues
- Document findings with exact locations and remediation suggestions

### **4. Efficiency**

- Use line ranges for large files
- Prioritize most relevant code sections
- Avoid redundant tool calls

### **5. Systematic Approach**

- Follow the discovery → analysis (with code smell focus) → validation pattern
- Cover all changed files systematically
- Cross-reference related components

## Configuration

### **Workflow Settings**

- **Max Loops**: 20 (prevents infinite loops)
- **Max Active Tools**: 3 (concurrency control)
- **Tool Timeout**: 300 seconds
- **Retry Logic**: Exponential backoff

### **Decision Criteria**

- **Success Threshold**: 100% (all steps must succeed)
- **Stop on First Error**: True (fail fast)
- **Max Execution Time**: 10 minutes
- **Require All Steps**: True

## Error Handling

### **Tool Execution Failures**

- Automatic retry with backoff
- Graceful degradation
- Error context preservation
- Detailed error reporting

### **Validation Failures**

- Parameter validation before execution
- Clear error messages for invalid parameters
- Type checking and format validation

## Best Practices

1. **Always use `codebase_search` first** for new code exploration
2. **Use specific line ranges** when reading files
3. **Analyze tool results thoroughly** before proceeding
4. **Build context progressively** through multiple tool calls
5. **Follow the semantic → pattern → detail pattern**
6. **Maintain conversation context** across tool interactions

This architecture provides flexibility while ensuring systematic and thorough code review processes.
