import { Router } from "express"
import { logger } from "../utils/logger"
import { requireJWT, requireGitHubToken } from "../middleware/auth"
import { pullRequestService } from "../services/pullRequestService"
import { webhookService } from "../services/webhookService"
import { Repository } from "../models"

const router = Router()

// Get all pull requests across all repositories for the authenticated user
router.get("/pull-requests", requireJWT, async (req: any, res) => {
	try {
		const { state, limit = 100, offset = 0 } = req.query
		const userId = req.user.id

		// Get repository ids owned by this user
		const repositories = await Repository.findAll({
			where: { userId },
			attributes: ["id", "ownerLogin", "name", "fullName"],
			raw: true,
		})
		const repositoryIds = repositories.map((r: any) => r.id)

		if (repositoryIds.length === 0) {
			return res.json({
				success: true,
				data: {
					pullRequests: [],
					total: 0,
					limit: parseInt(limit as string),
					offset: parseInt(offset as string),
					hasMore: false,
				},
			})
		}

		// Fetch PRs via service (which already enforces user access by repository)
		const allPRs = await pullRequestService.getPullRequestsForRepositories(
			repositoryIds,
			state as string | undefined,
		)

		logger.info(`Fetched ${allPRs.length} PRs for repositories:`, repositoryIds)

		// Enrich with repository info
		const repoById = new Map(repositories.map((r: any) => [r.id, r]))
		const enriched = allPRs.map((pr: any) => {
			const repo = repoById.get(pr.repositoryId) || {}
			return {
				...pr,
				repositoryOwner: repo.ownerLogin,
				repositoryName: repo.name,
				repositoryFullName: repo.fullName,
			}
		})

		// Check for duplicates before pagination
		const duplicateIds = enriched.map((pr: any) => pr.id)
		const uniqueIds = [...new Set(duplicateIds)]
		if (duplicateIds.length !== uniqueIds.length) {
			logger.warn(`Found ${duplicateIds.length - uniqueIds.length} duplicate PRs in database query`)
			logger.warn(
				"Duplicate IDs:",
				duplicateIds.filter((id: any, index: number) => duplicateIds.indexOf(id) !== index),
			)
		}

		// Deduplicate by ID before sorting
		const uniqueEnriched = enriched.reduce((acc: any[], pr: any) => {
			if (!acc.find((existing) => existing.id === pr.id)) {
				acc.push(pr)
			}
			return acc
		}, [])

		logger.info(`After deduplication: ${enriched.length} -> ${uniqueEnriched.length} PRs`)

		// Sort newest first and paginate
		const sorted = uniqueEnriched.sort((a: any, b: any) => {
			const aTime = new Date(a.githubCreatedAt || a.createdAt).getTime()
			const bTime = new Date(b.githubCreatedAt || b.createdAt).getTime()
			return bTime - aTime
		})

		const startIndex = parseInt(offset as string)
		const endIndex = startIndex + parseInt(limit as string)
		const paginatedPRs = sorted.slice(startIndex, endIndex)

		return res.json({
			success: true,
			data: {
				pullRequests: paginatedPRs,
				total: uniqueEnriched.length,
				limit: parseInt(limit as string),
				offset: parseInt(offset as string),
				hasMore: endIndex < uniqueEnriched.length,
			},
		})
	} catch (error: any) {
		logger.error("Error getting user pull requests:", error)
		return res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// Get all pull requests for a repository
router.get("/repositories/:repositoryId/pull-requests", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const { state, limit = 50, offset = 0, refresh } = req.query
		const userId = req.user.id

		let pullRequests = await pullRequestService.getPullRequests(parseInt(repositoryId), userId, state as string)

		// Optional on-demand refresh from GitHub
		if ((refresh === "true" || refresh === true) && pullRequests.length === 0) {
			try {
				// Validate repository exists and get owner/name
				const repository: any = await Repository.findOne({
					where: { id: parseInt(repositoryId), userId },
					attributes: ["id", "name", "ownerLogin", "fullName"],
					raw: true,
				})
				if (!repository) {
					return res.status(404).json({ success: false, error: "Repository not found" })
				}

				const accessToken = req.user.accessToken
				if (!accessToken) {
					return res.status(400).json({ success: false, error: "GitHub access token required for refresh" })
				}

				// Determine owner/name with fallback to fullName
				const owner =
					repository.ownerLogin ||
					(repository.fullName?.includes("/") ? repository.fullName.split("/")[0] : undefined)
				const name =
					repository.name ||
					(repository.fullName?.includes("/") ? repository.fullName.split("/")[1] : undefined)

				if (!owner || !name) {
					logger.error("Repository owner/name could not be determined for refresh", {
						repoId: repositoryId,
						fullName: (repository as any).fullName,
					})
				} else {
					// Sync PRs from GitHub and refetch
					await pullRequestService.processAllPullRequests(accessToken, parseInt(repositoryId), owner, name)
				}

				pullRequests = await pullRequestService.getPullRequests(parseInt(repositoryId), userId, state as string)
			} catch (syncError: any) {
				logger.error("Error refreshing pull requests from GitHub:", syncError)
			}
		}

		// Apply pagination
		const startIndex = parseInt(offset as string)
		const endIndex = startIndex + parseInt(limit as string)
		const paginatedPRs = pullRequests.slice(startIndex, endIndex)

		res.json({
			success: true,
			data: {
				pullRequests: paginatedPRs,
				total: pullRequests.length,
				limit: parseInt(limit as string),
				offset: parseInt(offset as string),
				hasMore: endIndex < pullRequests.length,
			},
		})
	} catch (error: any) {
		logger.error("Error getting pull requests:", error)
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// Get a specific pull request with full details
router.get("/pull-requests/:pullRequestId", requireJWT, async (req: any, res) => {
	try {
		const { pullRequestId } = req.params
		const userId = req.user.id

		const pullRequest = await pullRequestService.getPullRequestDetails(parseInt(pullRequestId), userId)

		// Normalize association names to match frontend types
		const normalized = {
			...pullRequest,
			comments: (pullRequest as any).prComments || [],
		} as any
		delete normalized.prComments

		res.json({
			success: true,
			data: normalized,
		})
	} catch (error: any) {
		logger.error("Error getting pull request details:", error)
		if (error.message === "Pull request not found or access denied") {
			res.status(404).json({
				success: false,
				error: error.message,
			})
		} else {
			res.status(500).json({
				success: false,
				error: error.message,
			})
		}
	}
})

// Sync pull requests for a repository from GitHub
router.post("/repositories/:repositoryId/pull-requests/sync", requireJWT, requireGitHubToken, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const userId = req.user.id
		const accessToken = req.user.accessToken

		// Validate repository exists and user has access
		const repository: any = await Repository.findOne({
			where: { id: parseInt(repositoryId), userId },
			attributes: ["id", "name", "ownerLogin", "fullName"],
			raw: true,
		})

		if (!repository) {
			return res.status(404).json({
				success: false,
				error: "Repository not found",
			})
		}

		// Determine owner/name with fallback to fullName
		const owner =
			repository.ownerLogin ||
			(repository.fullName?.includes("/") ? repository.fullName.split("/")[0] : undefined)
		const name =
			repository.name || (repository.fullName?.includes("/") ? repository.fullName.split("/")[1] : undefined)

		if (!owner || !name) {
			return res.status(400).json({
				success: false,
				error: "Repository owner/name could not be determined",
			})
		}

		// Start sync process asynchronously
		pullRequestService.processAllPullRequests(accessToken, parseInt(repositoryId), owner, name).catch((error) => {
			logger.error(`Error syncing PRs for repository ${repositoryId}:`, error)
		})

		return res.json({
			success: true,
			message: "Pull request sync started",
			repository:
				repository && typeof repository.get === "function"
					? {
							id: repository.get("id"),
							name: repository.get("name"),
							owner: repository.get("ownerLogin"),
							fullName: repository.get("fullName"),
						}
					: {
							id: repository?.id,
							name: repository?.name,
							owner: (repository as any)?.ownerLogin,
							fullName: (repository as any)?.fullName,
						},
		})
	} catch (error: any) {
		logger.error("Error syncing pull requests:", error)
		return res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// Sync a specific pull request from GitHub
router.post(
	"/repositories/:repositoryId/pull-requests/:pullNumber/sync",
	requireJWT,
	requireGitHubToken,
	async (req: any, res) => {
		try {
			const { repositoryId, pullNumber } = req.params
			const userId = req.user.id
			const accessToken = req.user.accessToken

			// Validate repository exists and user has access
			const repository: any = await Repository.findOne({
				where: { id: parseInt(repositoryId), userId },
				attributes: ["id", "name", "ownerLogin", "fullName"],
				raw: true,
			})

			if (!repository) {
				return res.status(404).json({
					success: false,
					error: "Repository not found",
				})
			}

			const prNumber = parseInt(pullNumber)
			if (isNaN(prNumber)) {
				return res.status(400).json({
					success: false,
					error: "Invalid pull request number",
				})
			}

			// Determine owner/name with fallback to fullName
			{
				const owner =
					repository.ownerLogin ||
					(repository.fullName?.includes("/") ? repository.fullName.split("/")[0] : undefined)
				const name =
					repository.name ||
					(repository.fullName?.includes("/") ? repository.fullName.split("/")[1] : undefined)
				pullRequestService
					.processPullRequest(accessToken, parseInt(repositoryId), owner, name, prNumber)
					.catch((error) => {
						logger.error(`Error syncing PR #${prNumber} for repository ${repositoryId}:`, error)
					})
			}

			return res.json({
				success: true,
				message: `Pull request #${prNumber} sync started`,
				repository:
					repository && typeof repository.get === "function"
						? {
								id: repository.get("id"),
								name: repository.get("name"),
								owner: repository.get("ownerLogin"),
								fullName: repository.get("fullName"),
							}
						: {
								id: repository?.id,
								name: repository?.name,
								owner: (repository as any)?.ownerLogin,
								fullName: (repository as any)?.fullName,
							},
				pullRequest: {
					number: prNumber,
				},
			})
		} catch (error: any) {
			logger.error("Error syncing pull request:", error)
			return res.status(500).json({
				success: false,
				error: error.message,
			})
		}
	},
)

// Get pull request statistics for a repository
router.get("/repositories/:repositoryId/pull-requests/stats", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const userId = req.user.id

		const stats = await pullRequestService.getPullRequestStats(parseInt(repositoryId), userId)

		res.json({
			success: true,
			data: stats,
		})
	} catch (error: any) {
		logger.error("Error getting pull request stats:", error)
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// Search pull requests
router.get("/repositories/:repositoryId/pull-requests/search", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const { q, state, author, label, limit = 20, offset = 0 } = req.query
		const userId = req.user.id

		// Validate repository exists and user has access
		const repository = await Repository.findOne({
			where: { id: parseInt(repositoryId), userId },
		})

		if (!repository) {
			return res.status(404).json({
				success: false,
				error: "Repository not found",
			})
		}

		// Get all PRs first, then filter (for simplicity)
		const allPRs = await pullRequestService.getPullRequests(parseInt(repositoryId), userId, state as string)

		let filteredPRs = allPRs

		// Apply search filters
		if (q) {
			const searchTerm = (q as string).toLowerCase()
			filteredPRs = filteredPRs.filter(
				(pr) =>
					pr.title.toLowerCase().includes(searchTerm) ||
					(pr.body && pr.body.toLowerCase().includes(searchTerm)),
			)
		}

		if (author) {
			filteredPRs = filteredPRs.filter((pr) => pr.authorLogin === author)
		}

		if (label) {
			filteredPRs = filteredPRs.filter((pr) => pr.labels && pr.labels.some((l: any) => l.name === label))
		}

		// Apply pagination
		const startIndex = parseInt(offset as string)
		const endIndex = startIndex + parseInt(limit as string)
		const paginatedPRs = filteredPRs.slice(startIndex, endIndex)

		return res.json({
			success: true,
			data: {
				pullRequests: paginatedPRs,
				total: filteredPRs.length,
				limit: parseInt(limit as string),
				offset: parseInt(offset as string),
				query: {
					q,
					state,
					author,
					label,
				},
			},
		})
	} catch (error: any) {
		logger.error("Error searching pull requests:", error)
		return res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// GitHub webhook endpoint
router.post("/webhooks/github", async (req: any, res) => {
	try {
		const signature = req.headers["x-hub-signature-256"] as string
		const eventType = req.headers["x-github-event"] as string
		const deliveryId = req.headers["x-github-delivery"] as string
		const userAgent = req.headers["user-agent"] as string

		logger.info(`Received GitHub webhook: ${eventType} (${deliveryId})`)

		// Parse the raw body for webhook signature verification
		const rawBody = req.body as Buffer
		if (!rawBody || rawBody.length === 0) {
			return res.status(400).json({ error: "Empty webhook payload" })
		}
		const payload = JSON.parse(rawBody.toString())

		// Verify webhook signature if secret is configured
		const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
		if (webhookSecret && signature) {
			if (!webhookService.verifySignature(rawBody.toString(), signature, webhookSecret)) {
				logger.error("Invalid webhook signature")
				return res.status(401).json({ error: "Invalid signature" })
			}
		}
		// Find repository by GitHub URL
		const repoFullName = payload.repository?.full_name
		if (!repoFullName) {
			return res.status(400).json({ error: "Repository information not found in webhook payload" })
		}

		// Find repository in database
		const repository = await Repository.findOne({
			where: { fullName: repoFullName },
		})

		if (!repository) {
			logger.info(`Repository not found for webhook: ${repoFullName}`)
			return res.status(404).json({ error: "Repository not found" })
		}

		// Store webhook event
		const webhookEvent = await webhookService.storeWebhookEvent(
			repository.id,
			eventType,
			payload,
			deliveryId,
			signature,
			userAgent,
		)

		// Process webhook asynchronously
		webhookService.processWebhookEvent(webhookEvent.id).catch((error) => {
			logger.error(`Error processing webhook event ${webhookEvent.id}:`, error)
		})

		return res.status(200).json({
			success: true,
			message: "Webhook received and queued for processing",
			eventId: webhookEvent.id,
		})
	} catch (error: any) {
		logger.error("Error handling GitHub webhook:", error)
		return res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// Test webhook endpoint
router.get("/webhooks/test", async (req: any, res) => {
	try {
		res.json({
			success: true,
			message: "Webhook endpoint is working",
			timestamp: new Date().toISOString(),
			headers: {
				"x-github-event": req.headers["x-github-event"],
				"x-github-delivery": req.headers["x-github-delivery"],
				"user-agent": req.headers["user-agent"],
			},
		})
	} catch (error: any) {
		logger.error("Error in test webhook:", error)
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// Get webhook events for a repository
router.get("/repositories/:repositoryId/webhooks/events", requireJWT, async (req: any, res) => {
	try {
		const { repositoryId } = req.params
		const { limit = 50, offset = 0 } = req.query
		const userId = req.user.id

		// Verify user has access to repository
		const repository = await Repository.findOne({
			where: { id: parseInt(repositoryId), userId },
		})

		if (!repository) {
			return res.status(404).json({
				success: false,
				error: "Repository not found",
			})
		}

		const events = await webhookService.getWebhookEvents(
			parseInt(repositoryId),
			parseInt(limit as string),
			parseInt(offset as string),
		)

		return res.json({
			success: true,
			data: events,
		})
	} catch (error: any) {
		logger.error("Error getting webhook events:", error)
		return res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

// Reprocess a webhook event
router.post("/webhooks/events/:eventId/reprocess", requireJWT, async (req: any, res) => {
	try {
		const { eventId } = req.params

		await webhookService.reprocessWebhookEvent(parseInt(eventId))

		res.json({
			success: true,
			message: "Webhook event reprocessed successfully",
		})
	} catch (error: any) {
		logger.error("Error reprocessing webhook event:", error)
		res.status(500).json({
			success: false,
			error: error.message,
		})
	}
})

export default router
