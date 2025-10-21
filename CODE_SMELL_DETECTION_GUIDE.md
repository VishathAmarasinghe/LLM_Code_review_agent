# Code Smell Detection Implementation Guide

## Overview

This document describes the enhanced code smell and anti-pattern detection system implemented in the code review agent. The system uses **detailed, step-by-step prompts** to guide the LLM in systematically identifying code quality issues.

## What Was Implemented

### 1. Enhanced Code Smell Definitions File

**Location**: `backend/src/config/code-smells-and-anti-patterns.txt`

This file now contains comprehensive, step-by-step detection instructions for 11 code smells and anti-patterns:

#### Code Smells:

1. **Long Method / Function**

    - Line counting instructions
    - Responsibility identification
    - Nesting depth analysis
    - Specific thresholds (30 lines, 3 responsibilities, 3 nesting levels)

2. **Magic Numbers / Strings**

    - Numeric literal scanning
    - String literal identification
    - Duplication checking
    - Context-aware detection rules

3. **Duplicate Code**

    - Pattern identification
    - Codebase search instructions
    - Similarity calculation (80%+ = exact, 50-80% = similar)
    - Cross-file comparison

4. **God Class / God Object**

    - Member counting (15+ methods, 10+ properties)
    - Responsibility analysis
    - SRP violation detection

5. **Dead Code**
    - Unused variable detection
    - Unreachable code identification
    - Post-return code checking

#### Anti-Patterns:

6. **Global Variables / Namespace Pollution**

    - Module-level variable detection
    - Usage scope analysis
    - Mutation point tracking

7. **Mutable Shared State**

    - Mutation pattern recognition
    - Cross-function state tracking
    - Immutability pattern checking

8. **Overly-Complex / Spaghetti Functions**

    - Nesting level counting
    - Decision point enumeration
    - Cyclomatic complexity calculation (threshold: 10)

9. **Missing Error Handling in Async Code**

    - Async operation scanning
    - Try/catch verification
    - Promise chain validation
    - Error handler quality assessment

10. **Tight Coupling**

    - Direct instantiation detection
    - Deep import path analysis
    - Dependency injection suggestions

11. **Hardcoded Configuration / Secrets**
    - Security keyword scanning
    - API key/password detection
    - Configuration value identification
    - Environment variable suggestions

### 2. Each Code Smell Includes:

✅ **What it is** - Clear definition
✅ **Why it matters** - Impact explanation
✅ **Step-by-step detection process** - Concrete instructions
✅ **Specific thresholds** - Quantifiable metrics
✅ **Detection checklist** - Verification steps
✅ **Reporting format** - Standardized output template
✅ **Code examples** - Good vs bad patterns

### 3. Integration with PromptBuilder

**File**: `backend/src/prompts/promptBuilder.ts`

- Added import for `CodeSmellDetector` service
- Modified `buildCodeSmellDetectionSection()` to load from configuration file
- Removed all hardcoded definitions
- System now dynamically loads enhanced detection instructions

### 4. CodeSmellDetector Service

**File**: `backend/src/services/codeSmellDetector.ts`

- Fixed path resolution for both development and production
- Loads configuration from text file
- Provides configuration to prompt builder
- Supports configuration reloading

## How It Works

### Detection Workflow

```
1. User initiates PR review
   ↓
2. PromptBuilder.buildSystemPrompt() is called
   ↓
3. buildCodeSmellDetectionSection() loads config via CodeSmellDetector
   ↓
4. Enhanced detection instructions added to system prompt
   ↓
5. LLM receives detailed, step-by-step instructions
   ↓
6. LLM follows systematic detection process for each smell
   ↓
7. LLM reports findings using standardized format
```

### Example: Long Method Detection

The LLM now receives these specific instructions:

```
Step 1: Count the Lines
- Find opening brace after function declaration
- Find matching closing brace
- Count lines between (exclude empty/comments)
- If count > 30: FLAG as potential Long Method

Step 2: Count Responsibilities
- Identify: Database ops, Validation, Business logic, API calls, etc.
- If 3+ responsibilities: CONFIRM as Long Method

Step 3: Check Nesting Depth
- Count indentation levels
- If max nesting > 3: Additional evidence

Step 4: Report with Evidence
- Location: Exact line numbers
- Evidence: Line count, responsibilities, nesting
- Impact: Specific maintainability issues
- Suggestion: Concrete refactoring steps with code
```

## Benefits

### 1. **Precision**

- Specific thresholds (30 lines, 3 responsibilities, etc.)
- Quantifiable metrics
- Clear detection criteria

### 2. **Consistency**

- Standardized reporting format
- Systematic detection process
- Reproducible results

### 3. **Thoroughness**

- Checklists ensure complete analysis
- Multi-step verification
- Cross-file duplicate detection

### 4. **Actionability**

- Code examples for fixes
- Specific refactoring suggestions
- Severity ratings

### 5. **Maintainability**

- Definitions in separate text file
- Easy to update/extend
- No code changes needed for new smells

## Testing

### Test Script

**Location**: `backend/test-code-smell-detection.ts`

Run the test:

```bash
cd code_review_agent/backend
npx ts-node test-code-smell-detection.ts
```

The test verifies:

- Configuration file loads successfully
- All expected sections are present
- PromptBuilder integration works
- System prompt includes detection instructions

## Configuration File Structure

```
# Header & Methodology
- Detection philosophy
- How to use the guide

## Code Smells (1-5)
For each smell:
  ### Name
  - Definition
  - Impact
  - Step-by-step detection (4+ steps)
  - Detection checklist
  - Reporting format

## Anti-Patterns (6-11)
For each anti-pattern:
  ### Name
  - Definition
  - Impact
  - Step-by-step detection (4+ steps)
  - Detection checklist
  - Reporting format

## Final Workflow
- Phase 1: Initial Scan
- Phase 2: Deep Analysis
- Phase 3: Reporting
- Phase 4: Verification

## Templates & Checklists
- Reporting template
- Quality checklist
- Best practices
```

## Example Detection in Action

### Before (Generic):

```
"Look for functions exceeding 20-30 lines"
```

### After (Specific):

```
ACTION: For each function/method in the file:
1. Find the opening brace { after the function declaration
2. Find the matching closing brace }
3. Count the lines between them (exclude empty lines and comment-only lines)
4. If line count > 30: FLAG as potential Long Method

EXAMPLE:
function processOrder(order) {  // Line 10
  // code here
  return result;                // Line 55
}
// Lines = 55 - 10 = 45 lines → FLAG THIS

Then:
- Count responsibilities (threshold: 3)
- Check nesting depth (threshold: 3 levels)
- Report with exact line numbers and evidence
```

## Reporting Format

Every code smell found uses this template:

````markdown
---

📍 **Location**: Line X-Y in `path/to/file.ts`
🔴 **Code Smell/Anti-Pattern**: [NAME]
📊 **Evidence**:

- [Specific metric or observation]
- [Supporting data]
- [Additional evidence]

📝 **Impact**: [Explain the specific problem]

💡 **Suggestion**:
[Specific action to take]

```suggestion
[Provide corrected code here]
```
````

## **Severity**: [Critical/High/Medium/Low]

````

## Future Enhancements

### Potential Additions:
1. **More Code Smells**:
   - Feature Envy
   - Data Clumps
   - Shotgun Surgery
   - Divergent Change

2. **Language-Specific Rules**:
   - TypeScript-specific patterns
   - React anti-patterns
   - Node.js best practices

3. **Metrics Integration**:
   - Automated metric calculation
   - Threshold customization
   - Project-specific rules

4. **Machine Learning**:
   - Pattern learning from reviews
   - Custom smell detection
   - Priority scoring

## Troubleshooting

### Configuration Not Loading
```bash
# Check file exists
ls -la code_review_agent/backend/src/config/code-smells-and-anti-patterns.txt

# Check file permissions
chmod 644 code_review_agent/backend/src/config/code-smells-and-anti-patterns.txt

# Run test
cd code_review_agent/backend
npx ts-node test-code-smell-detection.ts
````

### Path Issues

- Development: Uses `../config/code-smells-and-anti-patterns.txt`
- Production: Uses `../../src/config/code-smells-and-anti-patterns.txt`
- Path resolution is automatic based on `__dirname.includes('dist')`

### Empty Configuration

- Falls back to default configuration if file not found
- Check logs for "Failed to load code smells configuration"
- Verify file path in `codeSmellDetector.ts`

## Summary

The enhanced code smell detection system provides the LLM with:

- ✅ Clear, step-by-step instructions
- ✅ Specific thresholds and metrics
- ✅ Systematic detection processes
- ✅ Standardized reporting formats
- ✅ Verification checklists
- ✅ Actionable fix suggestions

This transforms code smell detection from vague guidance ("look for long methods") to precise, executable instructions that ensure thorough, consistent, and high-quality code reviews.

## Files Modified

1. ✅ `backend/src/config/code-smells-and-anti-patterns.txt` - **CREATED/REPLACED** with enhanced definitions
2. ✅ `backend/src/prompts/promptBuilder.ts` - **MODIFIED** to load from file
3. ✅ `backend/src/services/codeSmellDetector.ts` - **FIXED** path resolution
4. ✅ `backend/test-code-smell-detection.ts` - **CREATED** test script
5. ✅ `CODE_SMELL_DETECTION_GUIDE.md` - **CREATED** this documentation

## Next Steps

1. **Test the system** - Run the test script
2. **Try a real PR review** - Verify detection works in practice
3. **Monitor results** - Check if LLM follows the instructions
4. **Iterate** - Refine detection steps based on results
5. **Extend** - Add more code smells as needed

---

**Implementation Date**: 2025-10-08
**Status**: ✅ Complete and Ready for Testing
