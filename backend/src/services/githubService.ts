import axios, { AxiosInstance } from "axios"
import { logger } from "../utils/logger"
import { Repository, User } from "../models"

export interface GitHubRepository {
	id: number
	name: string
	full_name: string
	owner: {
		login: string
		id: number
		avatar_url: string
		type: string
	}
	description: string | null
	language: string | null
	languages_url: string
	clone_url: string
	ssh_url: string
	html_url: string
	default_branch: string
	private: boolean
	fork: boolean
	forks_count: number
	stargazers_count: number
	watchers_count: number
	size: number
	created_at: string
	updated_at: string
	pushed_at: string
}

export interface GitHubUser {
	id: number
	login: string
	name: string
	email: string
	avatar_url: string
	html_url: string
	public_repos: number
	followers: number
	following: number
	created_at: string
	updated_at: string
}

class GitHubService {
	private api: AxiosInstance
	private readonly baseURL = "https://api.github.com"

	constructor() {
		this.api = axios.create({
			baseURL: this.baseURL,
			timeout: 10000,
			headers: {
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "Code-Review-Agent/1.0",
			},
		})

		// Add request interceptor for rate limiting
		this.api.interceptors.response.use(
			(response) => response,
			(error) => {
				if (error.response?.status === 403 && error.response?.headers["x-ratelimit-remaining"] === "0") {
					logger.warn("GitHub API rate limit exceeded")
					throw new Error("GitHub API rate limit exceeded. Please try again later.")
				}
				return Promise.reject(error)
			},
		)
	}

	// Get user's GitHub profile
	async getUserProfile(accessToken: string): Promise<GitHubUser> {
		try {
			const response = await this.api.get("/user", {
				headers: {
					Authorization: `token ${accessToken}`,
				},
			})

			return response.data
		} catch (error) {
			logger.error("Error fetching GitHub user profile:", error)
			throw error
		}
	}

	// Get user's repositories
	async getUserRepositories(
		accessToken: string,
		page: number = 1,
		perPage: number = 100,
	): Promise<GitHubRepository[]> {
		try {
			const response = await this.api.get("/user/repos", {
				headers: {
					Authorization: `token ${accessToken}`,
				},
				params: {
					page,
					per_page: perPage,
					sort: "updated",
					direction: "desc",
					type: "all", // Include private repos
				},
			})

			return response.data
		} catch (error) {
			logger.error("Error fetching GitHub repositories:", error)
			throw error
		}
	}

	// Get repository details
	async getRepository(accessToken: string, owner: string, repo: string): Promise<GitHubRepository> {
		try {
			const response = await this.api.get(`/repos/${owner}/${repo}`, {
				headers: {
					Authorization: `token ${accessToken}`,
				},
			})

			return response.data
		} catch (error) {
			logger.error(`Error fetching repository ${owner}/${repo}:`, error)
			throw error
		}
	}

	// Get repository languages
	async getRepositoryLanguages(accessToken: string, owner: string, repo: string): Promise<Record<string, number>> {
		try {
			const response = await this.api.get(`/repos/${owner}/${repo}/languages`, {
				headers: {
					Authorization: `token ${accessToken}`,
				},
			})

			return response.data
		} catch (error) {
			logger.error(`Error fetching languages for ${owner}/${repo}:`, error)
			throw error
		}
	}

	// Get repository contents
	async getRepositoryContents(accessToken: string, owner: string, repo: string, path: string = ""): Promise<any[]> {
		try {
			const response = await this.api.get(`/repos/${owner}/${repo}/contents/${path}`, {
				headers: {
					Authorization: `token ${accessToken}`,
				},
			})

			return response.data
		} catch (error) {
			logger.error(`Error fetching contents for ${owner}/${repo}/${path}:`, error)
			throw error
		}
	}

	// Get single repository content (file or dir metadata)
	async getRepositoryContent(
		accessToken: string,
		owner: string,
		repo: string,
		path: string,
		ref?: string,
	): Promise<any> {
		try {
			const response = await this.api.get(`/repos/${owner}/${repo}/contents/${path}`, {
				headers: {
					Authorization: `token ${accessToken}`,
				},
				params: ref ? { ref } : undefined,
			})
			return response.data
		} catch (error) {
			logger.error(`Error fetching repository content ${owner}/${repo}/${path}:`, error)
			throw error
		}
	}

	// Sync user repositories to database
	async syncUserRepositories(userId: number, accessToken: string): Promise<Repository[]> {
		try {
			logger.info(`Syncing repositories for user ${userId}`)

			const githubRepos = await this.getUserRepositories(accessToken)
			const syncedRepos: Repository[] = []

			for (const githubRepo of githubRepos) {
				try {
					// Get repository languages
					const languages = await this.getRepositoryLanguages(
						accessToken,
						githubRepo.owner.login,
						githubRepo.name,
					)

					// Check if repository already exists
					let repo = await Repository.findOne({ where: { githubId: githubRepo.id } })

					if (repo) {
						// Update existing repository
						repo.name = githubRepo.name
						repo.fullName = githubRepo.full_name
						repo.ownerLogin = githubRepo.owner.login
						repo.ownerId = githubRepo.owner.id
						repo.ownerAvatarUrl = githubRepo.owner.avatar_url
						repo.ownerType = githubRepo.owner.type
						if (githubRepo.description !== null) {
							repo.description = githubRepo.description
						}
						if (githubRepo.language !== null) {
							repo.language = githubRepo.language
						}
						repo.languages = languages
						repo.url = githubRepo.html_url
						repo.cloneUrl = githubRepo.clone_url
						repo.sshUrl = githubRepo.ssh_url
						repo.htmlUrl = githubRepo.html_url
						repo.defaultBranch = githubRepo.default_branch
						repo.isPrivate = githubRepo.private
						repo.isFork = githubRepo.fork
						repo.forksCount = githubRepo.forks_count
						repo.starsCount = githubRepo.stargazers_count
						repo.watchersCount = githubRepo.watchers_count
						repo.size = githubRepo.size
						repo.repoCreatedAt = new Date(githubRepo.created_at)
						repo.repoUpdatedAt = new Date(githubRepo.updated_at)
						repo.repoPushedAt = new Date(githubRepo.pushed_at)
						repo.lastSyncedAt = new Date()

						await repo.save()
					} else {
						// Create new repository
						repo = await Repository.create({
							githubId: githubRepo.id,
							name: githubRepo.name,
							fullName: githubRepo.full_name,
							ownerLogin: githubRepo.owner.login,
							ownerId: githubRepo.owner.id,
							ownerAvatarUrl: githubRepo.owner.avatar_url,
							ownerType: githubRepo.owner.type,
							...(githubRepo.description !== null && { description: githubRepo.description }),
							...(githubRepo.language !== null && { language: githubRepo.language }),
							languages: languages,
							url: githubRepo.html_url,
							cloneUrl: githubRepo.clone_url,
							sshUrl: githubRepo.ssh_url,
							htmlUrl: githubRepo.html_url,
							defaultBranch: githubRepo.default_branch,
							isPrivate: githubRepo.private,
							isFork: githubRepo.fork,
							forksCount: githubRepo.forks_count,
							starsCount: githubRepo.stargazers_count,
							watchersCount: githubRepo.watchers_count,
							size: githubRepo.size,
							repoCreatedAt: new Date(githubRepo.created_at),
							repoUpdatedAt: new Date(githubRepo.updated_at),
							repoPushedAt: new Date(githubRepo.pushed_at),
							userId: userId,
							lastSyncedAt: new Date(),
						})
					}

					syncedRepos.push(repo)
				} catch (error) {
					logger.error(`Error syncing repository ${githubRepo.full_name}:`, error)
					// Continue with other repositories
				}
			}

			logger.info(`Successfully synced ${syncedRepos.length} repositories for user ${userId}`)
			return syncedRepos
		} catch (error) {
			logger.error("Error syncing user repositories:", error)
			throw error
		}
	}

	// Check if GitHub token is valid
	async validateToken(accessToken: string): Promise<boolean> {
		try {
			await this.api.get("/user", {
				headers: {
					Authorization: `token ${accessToken}`,
				},
			})
			return true
		} catch (error) {
			return false
		}
	}

	// Get file content from GitHub repository
	async getFileContent(owner: string, repo: string, path: string, accessToken?: string): Promise<string> {
		try {
			const response = await this.api.get(`/repos/${owner}/${repo}/contents/${path}`, {
				headers: accessToken
					? {
							Authorization: `token ${accessToken}`,
						}
					: {},
			})

			if (response.data.type !== "file") {
				throw new Error(`Path ${path} is not a file`)
			}

			// Decode base64 content
			const content = Buffer.from(response.data.content, "base64").toString("utf8")
			return content
		} catch (error) {
			logger.error(`Error getting file content for ${owner}/${repo}/${path}:`, error)
			throw error
		}
	}

	// Get all files from a GitHub repository recursively
	async getAllRepositoryFiles(
		owner: string,
		repo: string,
		accessToken?: string,
	): Promise<Array<{ path: string; name: string; size: number; type: string }>> {
		try {
			const files: Array<{ path: string; name: string; size: number; type: string }> = []

			const scanDirectory = async (path: string = ""): Promise<void> => {
				try {
					const response = await this.api.get(`/repos/${owner}/${repo}/contents/${path}`, {
						headers: accessToken
							? {
									Authorization: `token ${accessToken}`,
								}
							: {},
					})

					for (const item of response.data) {
						if (item.type === "file") {
							files.push({
								path: item.path,
								name: item.name,
								size: item.size || 0,
								type: item.type,
							})
						} else if (item.type === "dir") {
							// Recursively scan subdirectory
							await scanDirectory(item.path)
						}
					}
				} catch (error) {
					logger.warn(`Error scanning directory ${path}:`, error)
					// Continue with other directories
				}
			}

			await scanDirectory()
			return files
		} catch (error) {
			logger.error(`Error getting all files for ${owner}/${repo}:`, error)
			throw error
		}
	}

	// Get pull request details
	async getPullRequest(accessToken: string, owner: string, repo: string, prNumber: number): Promise<any> {
		try {
			const response = await this.api.get(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
				headers: {
					Authorization: `token ${accessToken}`,
				},
			})
			return response.data
		} catch (error) {
			logger.error(`Error fetching pull request ${owner}/${repo}#${prNumber}:`, error)
			throw error
		}
	}

	// Get pull request changed files
	async getPullRequestFiles(accessToken: string, owner: string, repo: string, prNumber: number): Promise<any[]> {
		try {
			const response = await this.api.get(`/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
				headers: {
					Authorization: `token ${accessToken}`,
				},
			})
			return response.data
		} catch (error) {
			logger.error(`Error fetching pull request files for ${owner}/${repo}#${prNumber}:`, error)
			throw error
		}
	}

	// Create a PR review with optional summary and bundled per-line comments (HEAD line-based)
	async createPullRequestReview(
		accessToken: string,
		owner: string,
		repo: string,
		prNumber: number,
		params: {
			body?: string
			event?: "COMMENT" | "REQUEST_CHANGES" | "APPROVE"
			comments?: Array<{ path: string; line: number; side?: "RIGHT" | "LEFT"; body: string }>
		},
	): Promise<any> {
		try {
			const response = await this.api.post(
				`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
				{
					body: params.body ?? "",
					event: params.event ?? "COMMENT",
					comments: (params.comments ?? []).map((c) => ({
						path: c.path,
						line: c.line,
						side: c.side ?? "RIGHT",
						body: c.body,
					})),
				},
				{
					headers: {
						Authorization: `token ${accessToken}`,
						"X-GitHub-Api-Version": "2022-11-28",
					},
				},
			)
			return response.data
		} catch (error) {
			logger.error(`Error creating PR review for ${owner}/${repo}#${prNumber}:`, error)
			throw error
		}
	}

	// Create a single review comment (legacy API requires commit_id when not using review batching)
	async createPullRequestLineComment(
		accessToken: string,
		owner: string,
		repo: string,
		prNumber: number,
		comment: {
			path: string
			line?: number
			body: string
			side?: "RIGHT" | "LEFT"
			start_line?: number | undefined
			start_side?: "RIGHT" | "LEFT" | undefined
			subject_type?: "line" | "file"
		},
	): Promise<any> {
		try {
			const pr = await this.getPullRequest(accessToken, owner, repo, prNumber)
			const commit_id = pr?.head?.sha
			const response = await this.api.post(
				`/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
				{
					body: comment.body,
					commit_id,
					path: comment.path,
					// When not providing a specific line, use subject_type: 'file' to create a file-level comment
					...(comment.subject_type === "file" ? { subject_type: "file" as const } : {}),
					// Support multi-line comments if start_line provided
					...(Number.isFinite(comment.start_line)
						? { start_line: comment.start_line, start_side: comment.start_side ?? "RIGHT" }
						: {}),
					...(Number.isFinite(comment.line as number)
						? { line: comment.line, side: comment.side ?? "RIGHT" }
						: {}),
				},
				{
					headers: {
						Authorization: `token ${accessToken}`,
						"X-GitHub-Api-Version": "2022-11-28",
					},
				},
			)
			return response.data
		} catch (error) {
			logger.error(`Error creating PR line comment for ${owner}/${repo}#${prNumber}:`, error)
			throw error
		}
	}
}

export const githubService = new GitHubService()
