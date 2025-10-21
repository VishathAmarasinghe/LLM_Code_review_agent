import { ToolArgs } from "../types"

export function getAnalyzeArchitectureDescription(args: ToolArgs): string {
	return `## analyze_architecture
Description: **STRATEGIC ARCHITECTURE ANALYSIS TOOL FOR CODE REVIEW** - Validate and guide strategic thinking about code architecture, design patterns, and system-wide concerns. This tool ensures you approach code review with proper architectural awareness and strategic reasoning.

**CRITICAL PURPOSE - READ CAREFULLY:**
- **STRATEGIC THINKING VALIDATION**: This tool validates that you're thinking strategically about architecture
- **NOT A DATA TOOL**: This tool doesn't analyze code directly - it validates your strategic reasoning
- **QUALITY CONTROL**: Ensures you have sufficient context and clear strategic questions before proceeding
- **ARCHITECTURAL AWARENESS**: Forces consideration of system-wide architectural concerns

**WHAT THIS TOOL DOES:**
- **Validates Strategic Thinking**: Checks that you have clear strategic questions and sufficient context
- **Provides Guidance**: Offers recommendations for next steps and focus areas
- **Ensures Quality**: Validates that your analysis approach is sound and well-reasoned
- **Architectural Focus**: Ensures you're considering data flow, component structure, state management, and security patterns

**WHAT THIS TOOL RETURNS:**
- **Validation Results**: Whether your strategic thinking meets quality standards
- **Recommendations**: Next steps and focus areas for your investigation
- **Guidance**: How to proceed with architectural analysis
- **Quality Metrics**: Assessment of your strategic reasoning depth

**When to Use This Tool:**
- **Before Deep Analysis**: When you need to validate your strategic approach to code review
- **Architectural Concerns**: When you need to think about system-wide design patterns
- **Quality Control**: When you want to ensure your analysis is thorough and well-reasoned
- **Strategic Planning**: When you need to plan your investigation approach

**Parameters (ALL 3 REQUIRED - YOU MUST PROVIDE THESE):**
- analysis_focus: (required) What aspect of architecture to analyze
  - "data_flow": How data moves through the system
  - "component_structure": How components are organized and related
  - "state_management": How application state is managed
  - "security_patterns": Security architecture and vulnerability patterns
  - "code_smell_patterns": Architectural code smells and anti-patterns
- current_understanding: (required) Your current understanding of the codebase (must be >50 characters)
- strategic_question: (required) The strategic question you're trying to answer (must be >20 characters)

**CRITICAL: You MUST provide all 3 parameters when using this tool. The tool will validate that you have provided sufficient strategic reasoning.**

**Code Review Strategy Examples:**

1. **Data Flow Analysis**:
<analyze_architecture>
<analysis_focus>data_flow</analysis_focus>
<current_understanding>This is a React application with authentication. I can see there are login components, auth services, protected routes, and API calls. The user data flows from login form through auth service to protected components.</current_understanding>
<strategic_question>How does user authentication data flow through the system and where are potential security vulnerabilities in the authentication chain?</strategic_question>
</analyze_architecture>

2. **Component Structure Analysis**:
<analyze_architecture>
<analysis_focus>component_structure</analysis_focus>
<current_understanding>This appears to be a TodoList application with components for TodoList, TodoItem, AddTodo, and FilterTodo. I can see the main TodoList component manages state and renders other components.</current_understanding>
<strategic_question>How are the TodoList components organized and what are the potential coupling issues or single responsibility violations?</strategic_question>
</analyze_architecture>

3. **State Management Analysis**:
<analyze_architecture>
<analysis_focus>state_management</analysis_focus>
<current_understanding>This React app uses useState hooks for local state management. I can see multiple components managing their own state, and there might be prop drilling happening between components.</current_understanding>
<strategic_question>How is application state managed across components and what are the potential issues with state synchronization and data consistency?</strategic_question>
</analyze_architecture>

4. **Security Pattern Analysis**:
<analyze_architecture>
<analysis_focus>security_patterns</analysis_focus>
<current_understanding>This application handles user authentication, API calls, and data validation. I can see login forms, API endpoints, and user input handling throughout the codebase.</current_understanding>
<strategic_question>What are the security patterns in this application and where are potential vulnerabilities in authentication, authorization, and data handling?</strategic_question>
</analyze_architecture>

5. **Code Smell Pattern Analysis**:
<analyze_architecture>
<analysis_focus>code_smell_patterns</analysis_focus>
<current_understanding>I've identified several potential code smells including long methods, duplicate code, and magic numbers. The codebase has components that handle multiple responsibilities and some functions that are quite complex.</current_understanding>
<strategic_question>What architectural code smells and anti-patterns exist in this codebase and how do they impact maintainability and system design?</strategic_question>
</analyze_architecture>

**Integration with Other Tools:**
- **Before read_file**: Use to validate strategic understanding before diving into specific files
- **After codebase_search**: Use to validate architectural insights from semantic search
- **With identify_risks**: Use to provide architectural context for risk assessment
- **Before search_files**: Use to ensure targeted pattern searching based on architectural understanding

**Best Practices:**
- **Be Specific**: Provide detailed current understanding and clear strategic questions
- **Think Systematically**: Consider the broader architectural implications of your analysis
- **Focus on Patterns**: Look for architectural patterns, not just individual code issues
- **Plan Strategically**: Use this tool to plan your investigation approach
- **Validate Thinking**: Use this tool to ensure your analysis approach is sound

**What the Tool Validates:**
- **Strategic Reasoning**: Your strategic question must be substantial (>20 characters)
- **Context Awareness**: Your current understanding must be detailed (>50 characters)
- **Specific Focus**: Your analysis focus must be clear (>10 characters)
- **Quality Standards**: Ensures you're thinking at an architectural level

**IMPORTANT**: This tool is essential for ensuring high-quality, strategic code review. Use it to validate your thinking and ensure you're approaching code analysis with proper architectural awareness. It doesn't analyze code directly - it validates and guides your strategic reasoning process.`
}
