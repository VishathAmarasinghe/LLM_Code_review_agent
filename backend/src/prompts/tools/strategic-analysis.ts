import { ToolArgs } from "../types"

export function getStrategicAnalysisDescription(args: ToolArgs): string {
	return `## strategic_analysis
Description: **STRATEGIC PLANNING TOOL FOR CODE REVIEW** - Validate and guide strategic thinking about code review progression and investigation planning. This tool ensures you approach code review with proper strategic planning and clear reasoning for investigation steps.

**CRITICAL PURPOSE - READ CAREFULLY:**
- **STRATEGIC PLANNING VALIDATION**: This tool validates that you're thinking strategically about investigation progression
- **NOT A DATA TOOL**: This tool doesn't analyze code directly - it validates your strategic planning
- **STAGE AWARENESS**: Ensures you understand where you are in the analysis process
- **INVESTIGATION PLANNING**: Forces consideration of next steps and reasoning for investigation approach

**WHAT THIS TOOL DOES:**
- **Validates Strategic Planning**: Checks that you have a clear plan and reasoning for investigation steps
- **Provides Stage Guidance**: Offers priorities and guidance for each analysis stage
- **Ensures Quality**: Validates that your investigation approach is strategic and well-reasoned
- **Guides Next Steps**: Provides framework for planning investigation progression

**WHAT THIS TOOL RETURNS:**
- **Validation Results**: Whether your strategic planning meets quality standards
- **Stage Priorities**: Guidance for each analysis stage (context, investigation, pattern_recognition, finalization)
- **Strategic Questions**: Framework for strategic thinking about code review
- **Next Steps Validation**: Questions to validate your investigation approach

**When to Use This Tool:**
- **Before Deep Investigation**: When you need to plan your investigation approach
- **Stage Transitions**: When moving between different analysis stages
- **Strategic Planning**: When you need to validate your reasoning for next steps
- **Quality Control**: When you want to ensure your investigation is strategic and well-planned

**Parameters (ALL 5 REQUIRED - YOU MUST PROVIDE THESE):**
- analysis_stage: (required) Current stage of analysis (must be >5 characters)
  - "context": Understanding the PR purpose and key components
  - "investigation": Deep dive into critical areas and potential issues
  - "pattern_recognition": Looking for systemic patterns and architectural concerns
  - "finalization": Synthesizing findings and providing actionable recommendations
- current_understanding: (required) What you understand so far (must be >50 characters)
- potential_issues: (required) Potential issues you've identified (must be >30 characters)
- next_investigation: (required) What you should investigate next and why (must be >40 characters)
- reasoning: (required) Your strategic reasoning for the next steps (must be >60 characters)

**CRITICAL: You MUST provide all 5 parameters when using this tool. The tool will validate that you have provided sufficient strategic planning.**

**Code Review Strategy Examples:**

1. **Context Stage Planning**:
<strategic_analysis>
<analysis_stage>context</analysis_stage>
<current_understanding>This is a React TodoList application with authentication. The PR adds subtask management functionality. I can see there are TodoList, TodoItem, and AddTodo components, plus authentication middleware.</current_understanding>
<potential_issues>Adding subtasks could create complex state management issues, potential performance problems with nested rendering, and authentication integration challenges.</potential_issues>
<next_investigation>I need to examine the current state management approach, check how TodoItem components are structured, and understand the authentication flow to assess the impact of subtask changes.</next_investigation>
<reasoning>Understanding the current architecture is crucial before analyzing the subtask changes. I need to identify how state is managed, how components interact, and where authentication fits in to properly assess the risks and implications of the new functionality.</reasoning>
</strategic_analysis>

2. **Investigation Stage Planning**:
<strategic_analysis>
<analysis_stage>investigation</analysis_stage>
<current_understanding>I've identified that the app uses useState for local state management and has prop drilling issues. The TodoList component manages all todo state and passes it down to TodoItem components. Authentication is handled through a separate AuthContext.</current_understanding>
<potential_issues>State management complexity with nested subtasks, potential performance issues with deep prop drilling, and possible authentication state conflicts when adding subtask functionality.</potential_issues>
<next_investigation>I need to examine the specific subtask implementation, check for state management patterns, look for performance bottlenecks in rendering, and verify authentication integration with the new subtask features.</next_investigation>
<reasoning>Now that I understand the architecture, I need to dive deep into the specific implementation details to identify concrete issues. The state management and performance concerns are the highest priority since they could significantly impact user experience and maintainability.</reasoning>
</strategic_analysis>

3. **Pattern Recognition Stage Planning**:
<strategic_analysis>
<analysis_stage>pattern_recognition</analysis_stage>
<current_understanding>I've found several patterns: long methods in TodoList component, duplicate state management logic, inconsistent error handling, and prop drilling through multiple component levels. The subtask implementation follows similar patterns but adds complexity.</current_understanding>
<potential_issues>Systemic issues with code organization, maintainability problems due to duplicate code, and architectural inconsistencies that could lead to bugs and difficult maintenance.</potential_issues>
<next_investigation>I need to analyze the consistency of these patterns across the codebase, identify all instances of similar issues, and assess the systemic impact of these patterns on code quality and maintainability.</next_investigation>
<reasoning>I've identified individual issues, but now I need to understand if these are isolated problems or systemic patterns. Understanding the broader impact will help me provide more valuable recommendations and prioritize the most critical issues.</reasoning>
</strategic_analysis>

4. **Finalization Stage Planning**:
<strategic_analysis>
<analysis_stage>finalization</analysis_stage>
<current_understanding>I've completed a comprehensive analysis and identified systemic patterns: inconsistent state management, duplicate code across components, performance issues with prop drilling, and architectural inconsistencies. The subtask feature amplifies these existing issues.</current_understanding>
<potential_issues>The identified patterns create significant maintainability and performance risks. The subtask feature, while functional, exposes and amplifies existing architectural problems that should be addressed.</potential_issues>
<next_investigation>I need to synthesize my findings into actionable recommendations, prioritize issues by impact and effort, and provide specific guidance for addressing the most critical problems while ensuring the subtask feature works correctly.</next_investigation>
<reasoning>I have comprehensive understanding of the issues and their systemic impact. Now I need to provide actionable, prioritized recommendations that help the team address the most critical problems while maintaining functionality. The focus should be on high-impact, achievable improvements.</reasoning>
</strategic_analysis>

**Integration with Other Tools:**
- **Before codebase_search**: Use to plan investigation approach
- **After analyze_architecture**: Use to plan next investigation steps
- **Before identify_risks**: Use to plan risk assessment approach
- **Before pattern_recognition**: Use to plan pattern analysis
- **After read_file**: Use to plan deeper investigation based on findings

**Best Practices:**
- **Be Specific**: Provide detailed understanding and clear next steps
- **Think Strategically**: Consider the broader impact and priorities
- **Plan Investigation**: Focus on high-impact areas first
- **Validate Reasoning**: Ensure your reasoning is sound and evidence-based
- **Stage Awareness**: Understand where you are in the analysis process

**What the Tool Validates:**
- **Stage Awareness**: Your analysis stage must be clear (>5 characters)
- **Understanding Depth**: Your current understanding must be detailed (>50 characters)
- **Issue Identification**: Your potential issues must be specific (>30 characters)
- **Next Steps Clarity**: Your next investigation must be clear (>40 characters)
- **Strategic Reasoning**: Your reasoning must be substantial (>60 characters)

**Analysis Stage Framework:**
- **Context**: Focus on understanding the PR purpose and key components
- **Investigation**: Deep dive into critical areas and potential issues
- **Pattern Recognition**: Look for systemic patterns and architectural concerns
- **Finalization**: Synthesize findings and provide actionable recommendations

**Strategic Questions Framework:**
- What are the most critical areas that could break?
- What patterns suggest potential issues?
- How do these findings impact the overall system?
- What should be prioritized for immediate attention?

**IMPORTANT**: This tool is essential for ensuring strategic code review progression. Use it to validate your planning and ensure you're approaching code analysis with proper strategic thinking. It doesn't analyze code directly - it validates and guides your strategic planning process.`
}
