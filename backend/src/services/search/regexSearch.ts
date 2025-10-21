import { logger } from "../../utils/logger"

export interface RegexHit {
	filePath: string
	line: number
	text: string
}

export async function regexSearchFiles(
	workspacePath: string,
	dirPath: string,
	regex: string,
	filePattern?: string,
): Promise<RegexHit[]> {
	// For GitHub workspaces, this should not be called directly
	// Instead, use the GitHub-specific search tools
	logger.warn("Regex search called on GitHub workspace - this should use GitHub search tools instead")
	return []
}
