import { ToolArgs } from "../types"

export function getPatternRecognitionDescription(args: ToolArgs): string {
	return `## pattern_recognition
Description: **PATTERN ANALYSIS TOOL FOR CODE REVIEW** - Validate and guide systematic pattern identification and analysis across the codebase. This tool ensures you approach pattern analysis with proper systematic thinking and clear reasoning about code quality implications.

**CRITICAL PURPOSE - READ CAREFULLY:**
- **PATTERN ANALYSIS VALIDATION**: This tool validates that you're thinking systematically about code patterns
- **NOT A DATA TOOL**: This tool doesn't analyze code directly - it validates your pattern analysis reasoning
- **SYSTEMIC THINKING**: Ensures you consider codebase-wide implications of patterns
- **QUALITY ASSESSMENT**: Forces consideration of code quality through pattern analysis

**WHAT THIS TOOL DOES:**
- **Validates Pattern Thinking**: Checks that you have identified specific patterns and clear reasoning
- **Provides Quality Framework**: Offers indicators and anti-patterns for code quality assessment
- **Ensures Quality**: Validates that your pattern analysis approach is systematic and well-reasoned
- **Guides Analysis**: Provides recommendations for effective pattern analysis

**WHAT THIS TOOL RETURNS:**
- **Validation Results**: Whether your pattern analysis meets quality standards
- **Quality Indicators**: Framework for evaluating code quality patterns
- **Anti-patterns to Watch**: Common problematic patterns to identify
- **Recommendations**: How to analyze patterns effectively

**When to Use This Tool:**
- **After Pattern Discovery**: When you've identified patterns across the codebase
- **Quality Assessment**: When you need to evaluate code quality through patterns
- **Systemic Analysis**: When you want to understand codebase-wide implications
- **Quality Control**: When you want to ensure your pattern analysis is thorough and well-reasoned

**Parameters (ALL 3 REQUIRED - YOU MUST PROVIDE THESE):**
- patterns_found: (required) Patterns you've identified across the codebase (must be >40 characters)
  - Examples: "Long methods over 50 lines across multiple components", "Duplicate state management logic in TodoList and UserProfile components", "Inconsistent error handling patterns in API calls"
- analysis_focus: (required) What you're looking for in these patterns (must be >20 characters)
  - Examples: "code_smells_and_anti_patterns", "performance_bottlenecks", "maintainability_issues", "security_vulnerabilities", "architectural_consistency"
- reasoning: (required) Why these patterns matter for code quality (must be >50 characters)
  - Examples: "These patterns indicate systemic maintainability issues because...", "This suggests performance problems because...", "This violates architectural principles because..."

**CRITICAL: You MUST provide all 3 parameters when using this tool. The tool will validate that you have provided sufficient pattern analysis reasoning.**

**Code Review Strategy Examples:**

1. **Code Smell Pattern Analysis**:
<pattern_recognition>
<patterns_found>Long methods over 50 lines across TodoList, UserProfile, and Dashboard components. Duplicate state management logic in multiple components. Magic numbers scattered throughout the codebase in validation functions and API calls.</patterns_found>
<analysis_focus>code_smells_and_anti_patterns</analysis_focus>
<reasoning>These patterns indicate systemic maintainability issues: long methods are difficult to understand and modify, duplicate logic creates maintenance overhead and inconsistency risks, and magic numbers make code hard to understand and modify without introducing bugs. These patterns suggest the codebase needs refactoring to improve maintainability.</reasoning>
</pattern_recognition>

2. **Performance Pattern Analysis**:
<pattern_recognition>
<patterns_found>N+1 query patterns in user data fetching, missing database indexes on frequently queried columns, synchronous database calls in loops, and large component re-renders due to prop changes.</patterns_found>
<analysis_focus>performance_bottlenecks</analysis_focus>
<reasoning>These patterns will cause significant performance degradation as the application scales: N+1 queries create exponential database load, missing indexes slow down queries, synchronous calls block the event loop, and unnecessary re-renders impact user experience. These patterns need to be addressed to ensure good performance.</reasoning>
</pattern_recognition>

3. **Architectural Consistency Analysis**:
<pattern_recognition>
<patterns_found>Inconsistent error handling approaches across API calls, mixed state management patterns (useState in some components, Context in others), and inconsistent component structure and naming conventions throughout the codebase.</patterns_found>
<analysis_focus>architectural_consistency</analysis_focus>
<reasoning>These patterns indicate architectural inconsistency that makes the codebase difficult to maintain and understand: inconsistent error handling makes debugging difficult, mixed state management patterns create confusion and potential bugs, and inconsistent naming conventions make code navigation challenging. These patterns suggest a need for architectural guidelines and refactoring.</reasoning>
</pattern_recognition>

4. **Security Pattern Analysis**:
<pattern_recognition>
<patterns_found>Hardcoded API keys in configuration files, missing input validation on user forms, inconsistent authentication checks across protected routes, and sensitive data logged in console statements.</patterns_found>
<analysis_focus>security_vulnerabilities</analysis_focus>
<reasoning>These patterns create multiple security vulnerabilities: hardcoded secrets can be exposed in version control, missing validation allows injection attacks, inconsistent auth checks create access control gaps, and logged sensitive data can be exposed in production. These patterns represent significant security risks that need immediate attention.</reasoning>
</pattern_recognition>

5. **Maintainability Pattern Analysis**:
<pattern_recognition>
<patterns_found>Prop drilling through multiple component levels, tight coupling between components, scattered business logic across multiple files, and inconsistent code organization and file structure.</patterns_found>
<analysis_focus>maintainability_issues</analysis_focus>
<reasoning>These patterns significantly impact code maintainability: prop drilling creates tight coupling and makes changes difficult, tight coupling makes components hard to test and modify independently, scattered logic makes it hard to understand business rules, and inconsistent organization makes code navigation difficult. These patterns need refactoring to improve maintainability.</reasoning>
</pattern_recognition>

**Integration with Other Tools:**
- **After codebase_search**: Use to analyze patterns discovered through semantic search
- **After search_files**: Use to analyze patterns found through regex searches
- **After read_file**: Use to analyze patterns in specific code implementations
- **With identify_risks**: Use to assess risks in identified patterns
- **With analyze_architecture**: Use to provide architectural context for pattern analysis
- **Before strategic_analysis**: Use to plan next steps based on pattern analysis

**Best Practices:**
- **Be Specific**: Provide detailed patterns and clear reasoning
- **Think Systematically**: Consider codebase-wide implications of patterns
- **Focus on Quality**: Explain why patterns matter for code quality
- **Plan Analysis**: Use this tool to plan how to address identified patterns
- **Validate Thinking**: Use this tool to ensure your pattern analysis approach is sound

**What the Tool Validates:**
- **Pattern Identification**: Your patterns found must be detailed (>40 characters)
- **Analysis Focus**: Your analysis focus must be clear (>20 characters)
- **Quality Reasoning**: Your reasoning must be substantial (>50 characters)
- **Quality Standards**: Ensures you're thinking at a systematic pattern level

**Quality Indicators Framework:**
- Code consistency across components
- Proper separation of concerns
- Error handling patterns
- State management approaches
- Component reusability
- Performance optimization patterns

**Anti-patterns to Watch:**
- God objects (components doing too much)
- Prop drilling (excessive prop passing)
- Tight coupling between components
- Inconsistent error handling
- State management inconsistencies
- Performance bottlenecks

**Analysis Recommendations:**
- Look for consistency in the patterns you've identified
- Check if similar patterns exist across the codebase
- Evaluate the maintainability implications
- Consider the impact on testing and debugging

**IMPORTANT**: This tool is essential for ensuring systematic pattern analysis in code review. Use it to validate your pattern thinking and ensure you're approaching pattern analysis with proper systematic reasoning. It doesn't analyze code directly - it validates and guides your pattern analysis process.`
}
