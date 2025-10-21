import { createHash } from "crypto"
import * as path from "path"
import { v4 as uuidv4 } from "uuid"
import { ICodeParser, CodeBlock } from "../interfaces"
import {
	SUPPORTED_EXTENSIONS,
	MAX_BLOCK_CHARS,
	MIN_BLOCK_CHARS,
	MIN_CHUNK_REMAINDER_CHARS,
	MAX_CHARS_TOLERANCE_FACTOR,
} from "../constants"
import { logger } from "../../../utils/logger"

/**
 * Implementation of the code parser interface
 */
export class CodeParser implements ICodeParser {
	/**
	 * Parses a code file into code blocks
	 * @param filePath Path to the file to parse
	 * @param options Optional parsing options
	 * @returns Promise resolving to array of code blocks
	 */
	async parseFile(
		filePath: string,
		options?: {
			minBlockLines?: number
			maxBlockLines?: number
			content?: string
			fileHash?: string
		},
	): Promise<CodeBlock[]> {
		// Get file extension
		const ext = path.extname(filePath).toLowerCase()

		// Skip if not a supported language
		if (!this.isSupportedLanguage(ext)) {
			return []
		}

		// Get file content
		let content: string
		let fileHash: string

		if (options?.content) {
			content = options.content
			fileHash = options.fileHash || this.createFileHash(content)
		} else {
			try {
				const fs = require("fs/promises")
				content = await fs.readFile(filePath, "utf8")
				fileHash = this.createFileHash(content)
			} catch (error) {
				logger.error(`Error reading file ${filePath}:`, error)
				return []
			}
		}

		// Parse the file
		return this.parseContent(filePath, content, fileHash)
	}

	/**
	 * Checks if a language is supported
	 * @param extension File extension
	 * @returns Boolean indicating if the language is supported
	 */
	private isSupportedLanguage(extension: string): boolean {
		return SUPPORTED_EXTENSIONS.includes(extension)
	}

	/**
	 * Creates a hash for a file
	 * @param content File content
	 * @returns Hash string
	 */
	private createFileHash(content: string): string {
		return createHash("sha256").update(content).digest("hex")
	}

	/**
	 * Parses file content into code blocks
	 * @param filePath Path to the file
	 * @param content File content
	 * @param fileHash File hash
	 * @returns Array of code blocks
	 */
	private async parseContent(filePath: string, content: string, fileHash: string): Promise<CodeBlock[]> {
		const ext = path.extname(filePath).slice(1).toLowerCase()
		const seenSegmentHashes = new Set<string>()

		// Handle markdown files specially
		if (ext === "md" || ext === "markdown") {
			return this.parseMarkdownContent(filePath, content, fileHash, seenSegmentHashes)
		}

		// Handle other file types with line-based chunking
		const lines = content.split("\n")
		return this.chunkTextByLines(lines, filePath, fileHash, ext, seenSegmentHashes)
	}

	/**
	 * Chunks text by lines for non-markdown files
	 */
	private chunkTextByLines(
		lines: string[],
		filePath: string,
		fileHash: string,
		chunkType: string,
		seenSegmentHashes: Set<string>,
	): CodeBlock[] {
		const blocks: CodeBlock[] = []
		let currentChunk: string[] = []
		let currentStartLine = 1
		let currentEndLine = 1

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]
			if (!line) continue // Skip undefined lines
			const lineNumber = i + 1

			// Check if adding this line would exceed the maximum chunk size
			const wouldExceedMax =
				currentChunk.length > 0 && (currentChunk.join("\n") + "\n" + line).length > MAX_BLOCK_CHARS

			// Check if we have a meaningful chunk and adding this line would exceed the limit
			if (wouldExceedMax && currentChunk.length > 0) {
				// Finalize current chunk
				const chunk = this.finalizeChunk(
					currentChunk,
					filePath,
					fileHash,
					currentStartLine,
					currentEndLine,
					chunkType,
					seenSegmentHashes,
				)
				if (chunk) {
					blocks.push(chunk)
				}

				// Start new chunk
				currentChunk = [line]
				currentStartLine = lineNumber
				currentEndLine = lineNumber
			} else {
				// Add line to current chunk
				currentChunk.push(line)
				currentEndLine = lineNumber
			}
		}

		// Handle remaining chunk
		if (currentChunk.length > 0) {
			const chunk = this.finalizeChunk(
				currentChunk,
				filePath,
				fileHash,
				currentStartLine,
				currentEndLine,
				chunkType,
				seenSegmentHashes,
			)
			if (chunk) {
				blocks.push(chunk)
			}
		}

		return blocks
	}

	/**
	 * Finalizes a chunk and creates a code block
	 */
	private finalizeChunk(
		chunk: string[],
		filePath: string,
		fileHash: string,
		startLine: number,
		endLine: number,
		chunkType: string,
		seenSegmentHashes: Set<string>,
	): CodeBlock | null {
		const content = chunk.join("\n")

		// Skip if content is too short
		if (content.length < MIN_BLOCK_CHARS) {
			return null
		}

		// Create segment hash
		const segmentHash = this.createSegmentHash(filePath, startLine, endLine)

		// Skip if we've already seen this segment
		if (seenSegmentHashes.has(segmentHash)) {
			return null
		}
		seenSegmentHashes.add(segmentHash)

		// Determine block type and identifier
		const { blockType, identifier } = this.analyzeCodeBlock(content, chunkType)

		return {
			file_path: filePath,
			identifier: identifier || null,
			type: blockType,
			start_line: startLine,
			end_line: endLine,
			content,
			fileHash,
			segmentHash,
		}
	}

	/**
	 * Parses markdown content into code blocks
	 */
	private parseMarkdownContent(
		filePath: string,
		content: string,
		fileHash: string,
		seenSegmentHashes: Set<string>,
	): CodeBlock[] {
		const blocks: CodeBlock[] = []
		const lines = content.split("\n")
		let currentSection: string[] = []
		let currentStartLine = 1
		let currentEndLine = 1
		let inCodeBlock = false

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]
			if (!line) continue // Skip undefined lines
			const lineNumber = i + 1

			// Check for code block markers
			if (line.startsWith("```")) {
				if (inCodeBlock) {
					// End of code block
					if (currentSection.length > 0) {
						const chunk = this.finalizeChunk(
							currentSection,
							filePath,
							fileHash,
							currentStartLine,
							currentEndLine,
							"markdown",
							seenSegmentHashes,
						)
						if (chunk) {
							blocks.push(chunk)
						}
					}
					currentSection = []
					inCodeBlock = false
				} else {
					// Start of code block
					inCodeBlock = true
					currentStartLine = lineNumber
				}
				continue
			}

			if (inCodeBlock) {
				currentSection.push(line)
				currentEndLine = lineNumber
			} else {
				// Regular markdown content - treat as documentation
				if (line.trim().length > 0) {
					currentSection.push(line)
					if (currentSection.length === 1) {
						currentStartLine = lineNumber
					}
					currentEndLine = lineNumber
				}
			}
		}

		// Handle remaining content
		if (currentSection.length > 0) {
			const chunk = this.finalizeChunk(
				currentSection,
				filePath,
				fileHash,
				currentStartLine,
				currentEndLine,
				"markdown",
				seenSegmentHashes,
			)
			if (chunk) {
				blocks.push(chunk)
			}
		}

		return blocks
	}

	/**
	 * Analyzes a code block to determine its type and identifier
	 */
	private analyzeCodeBlock(content: string, language: string): { blockType: CodeBlock["type"]; identifier?: string } {
		const trimmedContent = content.trim()

		// Function detection
		if (this.isFunction(trimmedContent, language)) {
			const identifier = this.extractFunctionName(trimmedContent, language)
			return identifier ? { blockType: "function", identifier } : { blockType: "function" }
		}

		// Class detection
		if (this.isClass(trimmedContent, language)) {
			const identifier = this.extractClassName(trimmedContent, language)
			return identifier ? { blockType: "class", identifier } : { blockType: "class" }
		}

		// Method detection
		if (this.isMethod(trimmedContent, language)) {
			const identifier = this.extractMethodName(trimmedContent, language)
			return identifier ? { blockType: "method", identifier } : { blockType: "method" }
		}

		// Interface detection
		if (this.isInterface(trimmedContent, language)) {
			const identifier = this.extractInterfaceName(trimmedContent, language)
			return identifier ? { blockType: "interface", identifier } : { blockType: "interface" }
		}

		// Type detection
		if (this.isType(trimmedContent, language)) {
			const identifier = this.extractTypeName(trimmedContent, language)
			return identifier ? { blockType: "type", identifier } : { blockType: "type" }
		}

		// Import detection
		if (this.isImport(trimmedContent, language)) {
			return { blockType: "import" }
		}

		// Comment detection
		if (this.isComment(trimmedContent, language)) {
			return { blockType: "comment" }
		}

		// Variable detection
		if (this.isVariable(trimmedContent, language)) {
			const identifier = this.extractVariableName(trimmedContent, language)
			return identifier ? { blockType: "variable", identifier } : { blockType: "variable" }
		}

		// For 'other' type blocks, generate a meaningful identifier
		const identifier = this.generateGenericIdentifier(trimmedContent, language)
		return { blockType: "other", identifier }
	}

	// Language-specific detection methods
	private isFunction(content: string, language: string): boolean {
		const patterns = {
			javascript: /^(export\s+)?(async\s+)?function\s+\w+/,
			typescript: /^(export\s+)?(async\s+)?function\s+\w+/,
			python: /^def\s+\w+/,
			java: /^(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/,
			cpp: /^(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/,
			csharp: /^(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/,
		}

		return patterns[language as keyof typeof patterns]?.test(content) || false
	}

	private isClass(content: string, language: string): boolean {
		const patterns = {
			javascript: /^class\s+\w+/,
			typescript: /^class\s+\w+/,
			python: /^class\s+\w+/,
			java: /^(public\s+)?class\s+\w+/,
			cpp: /^class\s+\w+/,
			csharp: /^(public\s+)?class\s+\w+/,
		}

		return patterns[language as keyof typeof patterns]?.test(content) || false
	}

	private isMethod(content: string, language: string): boolean {
		const patterns = {
			javascript: /^\s*\w+\s*\(/,
			typescript: /^\s*\w+\s*\(/,
			python: /^\s+def\s+\w+/,
			java: /^\s+(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/,
			cpp: /^\s+(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/,
			csharp: /^\s+(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/,
		}

		return patterns[language as keyof typeof patterns]?.test(content) || false
	}

	private isInterface(content: string, language: string): boolean {
		const patterns = {
			typescript: /^interface\s+\w+/,
			java: /^interface\s+\w+/,
			csharp: /^interface\s+\w+/,
		}

		return patterns[language as keyof typeof patterns]?.test(content) || false
	}

	private isType(content: string, language: string): boolean {
		const patterns = {
			typescript: /^type\s+\w+/,
		}

		return patterns[language as keyof typeof patterns]?.test(content) || false
	}

	private isImport(content: string, language: string): boolean {
		const patterns = {
			javascript: /^import\s+/,
			typescript: /^import\s+/,
			python: /^import\s+/,
			java: /^import\s+/,
			cpp: /^#include\s+/,
			csharp: /^using\s+/,
		}

		return patterns[language as keyof typeof patterns]?.test(content) || false
	}

	private isComment(content: string, language: string): boolean {
		const patterns = {
			javascript: /^\/\//,
			typescript: /^\/\//,
			python: /^#/,
			java: /^\/\//,
			cpp: /^\/\//,
			csharp: /^\/\//,
		}

		return patterns[language as keyof typeof patterns]?.test(content) || false
	}

	private isVariable(content: string, language: string): boolean {
		const patterns = {
			javascript: /^(const|let|var)\s+\w+/,
			typescript: /^(const|let|var)\s+\w+/,
			python: /^\w+\s*=/,
			java: /^\w+\s+\w+\s*=/,
			cpp: /^\w+\s+\w+\s*=/,
			csharp: /^\w+\s+\w+\s*=/,
		}

		return patterns[language as keyof typeof patterns]?.test(content) || false
	}

	// Extract identifier methods
	private extractFunctionName(content: string, language: string): string | undefined {
		const patterns = {
			javascript: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
			typescript: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
			python: /def\s+(\w+)/,
			java: /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
			cpp: /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
			csharp: /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
		}

		const match = content.match(patterns[language as keyof typeof patterns])
		return match?.[1]
	}

	private extractClassName(content: string, language: string): string | undefined {
		const patterns = {
			javascript: /class\s+(\w+)/,
			typescript: /class\s+(\w+)/,
			python: /class\s+(\w+)/,
			java: /(?:public\s+)?class\s+(\w+)/,
			cpp: /class\s+(\w+)/,
			csharp: /(?:public\s+)?class\s+(\w+)/,
		}

		const match = content.match(patterns[language as keyof typeof patterns])
		return match?.[1]
	}

	private extractMethodName(content: string, language: string): string | undefined {
		const patterns = {
			javascript: /(\w+)\s*\(/,
			typescript: /(\w+)\s*\(/,
			python: /def\s+(\w+)/,
			java: /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
			cpp: /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
			csharp: /(?:public|private|protected)?\s*(?:static\s+)?\w+\s+(\w+)\s*\(/,
		}

		const match = content.match(patterns[language as keyof typeof patterns])
		return match?.[1]
	}

	private extractInterfaceName(content: string, language: string): string | undefined {
		const patterns = {
			typescript: /interface\s+(\w+)/,
			java: /interface\s+(\w+)/,
			csharp: /interface\s+(\w+)/,
		}

		const match = content.match(patterns[language as keyof typeof patterns])
		return match?.[1]
	}

	private extractTypeName(content: string, language: string): string | undefined {
		const patterns = {
			typescript: /type\s+(\w+)/,
		}

		const match = content.match(patterns[language as keyof typeof patterns])
		return match?.[1]
	}

	private extractVariableName(content: string, language: string): string | undefined {
		const patterns = {
			javascript: /(?:const|let|var)\s+(\w+)/,
			typescript: /(?:const|let|var)\s+(\w+)/,
			python: /(\w+)\s*=/,
			java: /(\w+)\s*=/,
			cpp: /(\w+)\s*=/,
			csharp: /(\w+)\s*=/,
		}

		const match = content.match(patterns[language as keyof typeof patterns])
		return match?.[1]
	}

	/**
	 * Creates a segment hash for deduplication
	 */
	private createSegmentHash(filePath: string, startLine: number, endLine: number): string {
		return createHash("sha256").update(`${filePath}-${startLine}-${endLine}`).digest("hex")
	}

	/**
	 * Generates a meaningful identifier for generic code blocks
	 */
	private generateGenericIdentifier(content: string, language: string): string {
		const trimmed = content.trim()

		// Try to extract the first meaningful line
		const lines = trimmed.split("\n").filter((line) => line.trim().length > 0)
		if (lines.length === 0) return "empty-block"

		const firstLine = lines[0]?.trim()
		if (!firstLine) return "empty-block"

		// For comments, use the comment text
		if (firstLine.startsWith("//") || firstLine.startsWith("/*") || firstLine.startsWith("#")) {
			return firstLine.replace(/^\/\/\s*|\/\*\s*|\*\s*|#\s*/g, "").substring(0, 50)
		}

		// For code, try to extract meaningful parts
		if (firstLine.includes("=")) {
			const beforeEquals = firstLine.split("=")[0]?.trim()
			if (beforeEquals && beforeEquals.length > 0) {
				return beforeEquals.substring(0, 50)
			}
		}

		// For blocks with braces, try to extract the opening part
		if (firstLine.includes("{")) {
			const beforeBrace = firstLine.split("{")[0]?.trim()
			if (beforeBrace && beforeBrace.length > 0) {
				return beforeBrace.substring(0, 50)
			}
		}

		// Fallback: use first meaningful words
		const words = firstLine
			.split(/\s+/)
			.filter(
				(word) =>
					word.length > 0 &&
					!["const", "let", "var", "if", "for", "while", "return", "import", "export"].includes(word),
			)

		if (words.length > 0) {
			return words.slice(0, 3).join("-").substring(0, 50)
		}

		// Final fallback
		return `block-${firstLine.substring(0, 30).replace(/\s+/g, "-")}`
	}
}
