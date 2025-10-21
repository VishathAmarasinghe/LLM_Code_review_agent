import { ToolArgs } from "../types"

export function getIdentifyRisksDescription(args: ToolArgs): string {
	return `## identify_risks
Description: **STRATEGIC RISK ASSESSMENT TOOL FOR CODE REVIEW** - Validate and guide systematic risk identification and assessment. This tool ensures you approach risk analysis with proper systematic thinking and clear reasoning about potential issues.

**CRITICAL PURPOSE - READ CAREFULLY:**
- **RISK ASSESSMENT VALIDATION**: This tool validates that you're thinking systematically about risks
- **NOT A DATA TOOL**: This tool doesn't analyze code directly - it validates your risk reasoning
- **SYSTEMATIC ANALYSIS**: Ensures you have identified specific patterns and clear reasoning
- **IMPACT ASSESSMENT**: Forces consideration of security, performance, maintainability, and user experience impacts

**WHAT THIS TOOL DOES:**
- **Validates Risk Thinking**: Checks that you have identified specific risky patterns and clear reasoning
- **Provides Risk Framework**: Offers severity levels and impact categories for assessment
- **Ensures Quality**: Validates that your risk analysis approach is systematic and well-reasoned
- **Guides Investigation**: Provides recommended actions for addressing identified risks

**WHAT THIS TOOL RETURNS:**
- **Validation Results**: Whether your risk thinking meets quality standards
- **Risk Assessment Framework**: Severity levels (critical, high, medium, low) and impact categories
- **Recommended Actions**: Next steps for investigating and addressing identified risks
- **Quality Metrics**: Assessment of your risk reasoning depth

**When to Use This Tool:**
- **After Pattern Discovery**: When you've found potentially risky patterns in the code
- **Risk Assessment**: When you need to systematically evaluate the severity of identified issues
- **Impact Analysis**: When you want to understand the broader impact of code issues
- **Quality Control**: When you want to ensure your risk analysis is thorough and well-reasoned

**Parameters (ALL 3 REQUIRED - YOU MUST PROVIDE THESE):**
- component_type: (required) Type of component or pattern you're analyzing (must be >10 characters)
  - Examples: "authentication_components", "database_queries", "user_input_handlers", "api_endpoints", "state_management", "code_smells_and_anti_patterns"
- patterns_found: (required) Specific patterns you've identified that could be risky (must be >30 characters)
  - Examples: "Hardcoded API keys in configuration files", "Missing input validation in login forms", "N+1 query patterns in database access"
- reasoning: (required) Your reasoning for why these patterns are concerning (must be >50 characters)
  - Examples: "These patterns create security vulnerabilities because...", "This could lead to performance issues because...", "This violates maintainability principles because..."

**CRITICAL: You MUST provide all 3 parameters when using this tool. The tool will validate that you have provided sufficient risk reasoning.**

**Code Review Strategy Examples:**

1. **Security Risk Assessment**:
<identify_risks>
<component_type>authentication_components</component_type>
<patterns_found>Hardcoded API keys in configuration files, missing input sanitization in login forms, and lack of rate limiting on authentication endpoints</patterns_found>
<reasoning>These patterns create multiple attack vectors: hardcoded secrets can be exposed in version control, unsanitized input allows injection attacks, and missing rate limiting enables brute force attacks against user accounts.</reasoning>
</identify_risks>

2. **Performance Risk Assessment**:
<identify_risks>
<component_type>database_queries</component_type>
<patterns_found>N+1 query patterns in user data fetching, missing database indexes on frequently queried columns, and synchronous database calls in loops</patterns_found>
<reasoning>These patterns will cause significant performance degradation as the user base grows: N+1 queries create exponential database load, missing indexes slow down queries, and synchronous calls block the event loop causing poor user experience.</reasoning>
</identify_risks>

3. **Code Smell Risk Assessment**:
<identify_risks>
<component_type>code_smells_and_anti_patterns</component_type>
<patterns_found>Long methods over 50 lines, duplicate code blocks across multiple components, and magic numbers scattered throughout the codebase</patterns_found>
<reasoning>These patterns significantly impact maintainability: long methods are hard to understand and modify, duplicate code creates maintenance overhead and inconsistency risks, and magic numbers make the code difficult to understand and modify without introducing bugs.</reasoning>
</identify_risks>

4. **State Management Risk Assessment**:
<identify_risks>
<component_type>state_management</component_type>
<patterns_found>Multiple useState hooks managing related data, prop drilling through multiple component levels, and inconsistent state updates across components</patterns_found>
<reasoning>These patterns create data consistency issues and make the application hard to maintain: scattered state makes it difficult to track data flow, prop drilling creates tight coupling, and inconsistent updates can lead to UI bugs and data corruption.</reasoning>
</identify_risks>

5. **API Design Risk Assessment**:
<identify_risks>
<component_type>api_endpoints</component_type>
<patterns_found>Missing error handling in API calls, inconsistent response formats across endpoints, and lack of input validation on API parameters</patterns_found>
<reasoning>These patterns create reliability and security issues: missing error handling leads to poor user experience and debugging difficulties, inconsistent responses make client integration complex, and missing validation allows malicious input that could compromise the system.</reasoning>
</identify_risks>

**Integration with Other Tools:**
- **After codebase_search**: Use to assess risks in discovered patterns
- **After search_files**: Use to evaluate risks in found code patterns
- **After read_file**: Use to assess risks in specific code implementations
- **With analyze_architecture**: Use to provide architectural context for risk assessment
- **Before strategic_analysis**: Use to identify risks that need strategic planning

**Best Practices:**
- **Be Specific**: Provide detailed patterns and clear reasoning
- **Think Systematically**: Consider different types of risks (security, performance, maintainability)
- **Focus on Impact**: Explain why the patterns are concerning and what could go wrong
- **Plan Investigation**: Use this tool to plan how to investigate and address risks
- **Validate Thinking**: Use this tool to ensure your risk analysis approach is sound

**What the Tool Validates:**
- **Component Understanding**: Your component type must be specific (>10 characters)
- **Pattern Analysis**: Your patterns found must be detailed (>30 characters)
- **Risk Reasoning**: Your reasoning must be substantial (>50 characters)
- **Quality Standards**: Ensures you're thinking at a systematic risk level

**Risk Assessment Framework:**
- **Severity Levels**: critical, high, medium, low
- **Impact Categories**: Security vulnerabilities, Performance degradation, Maintainability issues, User experience problems, Data integrity concerns
- **Recommended Actions**: Investigate specific patterns, Check for similar patterns, Verify impact on dependent code, Consider architectural improvements

**IMPORTANT**: This tool is essential for ensuring systematic risk assessment in code review. Use it to validate your risk thinking and ensure you're approaching risk analysis with proper systematic reasoning. It doesn't analyze code directly - it validates and guides your risk assessment process.`
}
