import { logger } from "../utils/logger"
import { SyncStatus, User, Repository } from "../models"
import { githubService } from "./githubService"

export class SyncService {
	private static instance: SyncService
	private runningJobs = new Map<number, boolean>()

	public static getInstance(): SyncService {
		if (!SyncService.instance) {
			SyncService.instance = new SyncService()
		}
		return SyncService.instance
	}

	/**
	 * Start a repository sync job for a user
	 */
	async startRepositorySync(userId: number): Promise<SyncStatus> {
		try {
			// Check if there's already a running sync for this user
			if (this.runningJobs.get(userId)) {
				const existingSync = await SyncStatus.findOne({
					where: { userId, type: "repositories", status: "in_progress" },
					order: [["startedAt", "DESC"]],
				})

				if (existingSync) {
					logger.info(`Repository sync already in progress for user ${userId}`)
					return existingSync
				}
			}

			// Get user information
			const user = await User.findByPk(userId)
			if (!user || !user.accessToken) {
				throw new Error("User not found or missing access token")
			}

			// Create sync status record
			const syncStatus = await SyncStatus.create({
				userId,
				type: "repositories",
				status: "pending",
				progress: 0,
				message: "Starting repository sync...",
				startedAt: new Date(),
			})

			// Mark job as running
			this.runningJobs.set(userId, true)

			// Start background sync (don't await)
			this.performRepositorySync(userId, syncStatus.id, user.accessToken).finally(() => {
				this.runningJobs.delete(userId)
			})

			logger.info(`Started repository sync for user ${userId}, syncId: ${syncStatus.id}`)
			return syncStatus
		} catch (error) {
			logger.error(`Error starting repository sync for user ${userId}:`, error)
			throw error
		}
	}

	/**
	 * Perform the actual repository sync in the background
	 */
	private async performRepositorySync(userId: number, syncId: number, accessToken: string): Promise<void> {
		try {
			// Update status to in_progress
			await this.updateSyncStatus(syncId, {
				status: "in_progress",
				message: "Fetching repositories from GitHub...",
			})

			logger.info(`Syncing repositories for user ${userId}`)

			// Get all repositories from GitHub
			const githubRepos = await githubService.getUserRepositories(accessToken)

			if (githubRepos.length === 0) {
				await this.updateSyncStatus(syncId, {
					status: "completed",
					progress: 100,
					totalItems: 0,
					processedItems: 0,
					message: "No repositories found",
					completedAt: new Date(),
				})
				return
			}

			// Update total items
			await this.updateSyncStatus(syncId, {
				totalItems: githubRepos.length,
				processedItems: 0,
				message: `Processing ${githubRepos.length} repositories...`,
			})

			const syncedRepos: Repository[] = []
			let processedCount = 0

			// Process repositories one by one with progress updates
			for (const githubRepo of githubRepos) {
				try {
					// Get repository languages
					const languages = await githubService.getRepositoryLanguages(
						accessToken,
						githubRepo.owner.login,
						githubRepo.name,
					)

					// Check if repository already exists
					let repo = await Repository.findOne({ where: { githubId: githubRepo.id } })

					if (repo) {
						// Update existing repository
						await this.updateRepositoryData(repo, githubRepo, languages)
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
							description: githubRepo.description,
							language: githubRepo.language,
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
					processedCount++

					// Update progress every 5 repositories or for the last one
					if (processedCount % 5 === 0 || processedCount === githubRepos.length) {
						const progress = Math.round((processedCount / githubRepos.length) * 100)
						await this.updateSyncStatus(syncId, {
							progress,
							processedItems: processedCount,
							message: `Processed ${processedCount}/${githubRepos.length} repositories`,
						})

						// Add a small delay to ensure frontend can catch the updates
						if (processedCount % 20 === 0) {
							await new Promise((resolve) => setTimeout(resolve, 100))
						}
					}
				} catch (repoError) {
					logger.error(`Error syncing repository ${githubRepo.full_name}:`, repoError)
					processedCount++

					// Continue with other repositories even if one fails
					if (processedCount % 5 === 0 || processedCount === githubRepos.length) {
						const progress = Math.round((processedCount / githubRepos.length) * 100)
						await this.updateSyncStatus(syncId, {
							progress,
							processedItems: processedCount,
							message: `Processed ${processedCount}/${githubRepos.length} repositories (some failed)`,
						})
					}
				}
			}

			// Mark sync as completed
			await this.updateSyncStatus(syncId, {
				status: "completed",
				progress: 100,
				processedItems: processedCount,
				message: `Successfully synced ${syncedRepos.length} repositories`,
				completedAt: new Date(),
			})

			logger.info(`Successfully synced ${syncedRepos.length} repositories for user ${userId}`)
		} catch (error) {
			logger.error(`Error in repository sync for user ${userId}:`, error)

			// Mark sync as failed
			await this.updateSyncStatus(syncId, {
				status: "failed",
				error: error instanceof Error ? error.message : "Unknown error",
				completedAt: new Date(),
			})
		}
	}

	/**
	 * Update repository data from GitHub repository object
	 */
	private async updateRepositoryData(
		repo: Repository,
		githubRepo: any,
		languages: Record<string, number>,
	): Promise<void> {
		repo.name = githubRepo.name
		repo.fullName = githubRepo.full_name
		repo.ownerLogin = githubRepo.owner.login
		repo.ownerId = githubRepo.owner.id
		repo.ownerAvatarUrl = githubRepo.owner.avatar_url
		repo.ownerType = githubRepo.owner.type
		repo.description = githubRepo.description
		repo.language = githubRepo.language
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
		// Map GitHub timestamps to repo* fields
		repo.repoCreatedAt = new Date(githubRepo.created_at)
		repo.repoUpdatedAt = new Date(githubRepo.updated_at)
		repo.repoPushedAt = new Date(githubRepo.pushed_at)
		repo.lastSyncedAt = new Date()
	}

	/**
	 * Update sync status
	 */
	private async updateSyncStatus(syncId: number, updates: Partial<SyncStatusAttributes>): Promise<void> {
		try {
			await SyncStatus.update(updates, { where: { id: syncId } })
		} catch (error) {
			logger.error(`Error updating sync status ${syncId}:`, error)
		}
	}

	/**
	 * Get sync status for a user
	 */
	async getSyncStatus(
		userId: number,
		type: "repositories" | "issues" | "pull_requests" = "repositories",
	): Promise<SyncStatus | null> {
		return await SyncStatus.findOne({
			where: { userId, type },
			order: [["startedAt", "DESC"]],
		})
	}

	/**
	 * Get all sync statuses for a user
	 */
	async getAllSyncStatuses(userId: number): Promise<SyncStatus[]> {
		return await SyncStatus.findAll({
			where: { userId },
			order: [["startedAt", "DESC"]],
		})
	}

	/**
	 * Cancel a running sync
	 */
	async cancelSync(
		userId: number,
		type: "repositories" | "issues" | "pull_requests" = "repositories",
	): Promise<boolean> {
		try {
			const sync = await SyncStatus.findOne({
				where: { userId, type, status: "in_progress" },
				order: [["startedAt", "DESC"]],
			})

			if (sync) {
				await sync.update({
					status: "failed",
					error: "Sync cancelled by user",
					completedAt: new Date(),
				})

				this.runningJobs.delete(userId)
				return true
			}

			return false
		} catch (error) {
			logger.error(`Error cancelling sync for user ${userId}:`, error)
			return false
		}
	}
}

export const syncService = SyncService.getInstance()
export default syncService
