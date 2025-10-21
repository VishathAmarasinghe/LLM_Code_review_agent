import crypto from "crypto"
import { logger } from "../utils/logger"
import { Repository, WebhookEvent } from "../models"
import { pullRequestService } from "./pullRequestService"

export interface WebhookPayload {
	action: string
	pull_request?: any
	repository?: {
		id: number
		full_name: string
		owner: {
			login: string
		}
		name: string
	}
	[key: string]: any
}

class WebhookService {
	/**
	 * Verify webhook signature
	 */
	verifySignature(payload: string, signature: string, secret: string): boolean {
		if (!secret || !signature) {
			return false
		}

		const expectedSignature = `sha256=${crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex")}`

		return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
	}

	/**
	 * Store webhook event
	 */
	async storeWebhookEvent(
		repositoryId: number,
		eventType: string,
		payload: any,
		deliveryId?: string,
		signature?: string,
		userAgent?: string,
	): Promise<WebhookEvent> {
		try {
			const webhookEvent = await WebhookEvent.create({
				repositoryId,
				eventType,
				action: payload.action,
				githubEventId: deliveryId || undefined,
				payload,
				deliveryId: deliveryId || undefined,
				signature: signature || undefined,
				userAgent: userAgent || undefined,
				githubDeliveredAt: new Date(),
				processed: false,
			})

			return webhookEvent
		} catch (error: any) {
			logger.error("Error storing webhook event:", error)
			throw error
		}
	}

	/**
	 * Process webhook event
	 */
	async processWebhookEvent(webhookEventId: number): Promise<void> {
		const webhookEvent = await WebhookEvent.findByPk(webhookEventId)

		if (!webhookEvent) {
			throw new Error("Webhook event not found")
		}

		if (webhookEvent.processed) {
			logger.info(`Webhook event ${webhookEventId} already processed`)
			return
		}

		try {
			const payload = webhookEvent.payload as WebhookPayload

			// Process based on event type
			if (webhookEvent.eventType === "pull_request") {
				await this.processPullRequestWebhook(webhookEvent.repositoryId, payload)
			} else {
				logger.info(`Unhandled webhook event type: ${webhookEvent.eventType}`)
			}

			// Mark as processed
			await webhookEvent.update({
				processed: true,
				processingError: undefined,
			})

			logger.info(`Successfully processed webhook event ${webhookEventId}`)
		} catch (error: any) {
			logger.error(`Error processing webhook event ${webhookEventId}:`, error)

			// Mark as failed
			await webhookEvent.update({
				processed: true,
				processingError: error.message,
			})
			throw error
		}
	}

	/**
	 * Process pull request webhook
	 */
	private async processPullRequestWebhook(repositoryId: number, payload: WebhookPayload): Promise<void> {
		const { pull_request, repository } = payload

		if (!pull_request || !repository) {
			logger.warn("Missing pull_request or repository data in webhook payload")
			return
		}

		try {
			// Get repository info
			const repo = await Repository.findByPk(repositoryId)
			if (!repo) {
				throw new Error("Repository not found")
			}

			// Process the PR - we'll need the user's access token
			// For now, we'll store the webhook event and process it later when the user accesses the PR
			logger.info(
				`Received PR webhook for ${repository.full_name} - PR #${pull_request.number} - Action: ${payload.action}`,
			)
		} catch (error: any) {
			logger.error("Error processing pull request webhook:", error)
			throw error
		}
	}

	/**
	 * Get webhook events for a repository
	 */
	async getWebhookEvents(repositoryId: number, limit: number = 50, offset: number = 0): Promise<WebhookEvent[]> {
		try {
			const events = await WebhookEvent.findAll({
				where: { repositoryId },
				order: [["createdAt", "DESC"]],
				limit,
				offset,
			})

			return events
		} catch (error: any) {
			logger.error("Error getting webhook events:", error)
			throw error
		}
	}

	/**
	 * Reprocess a webhook event
	 */
	async reprocessWebhookEvent(webhookEventId: number): Promise<void> {
		try {
			await this.processWebhookEvent(webhookEventId)
		} catch (error: any) {
			logger.error("Error reprocessing webhook event:", error)
			throw error
		}
	}

	/**
	 * Process pending webhook events for a repository
	 */
	async processPendingWebhookEvents(repositoryId: number): Promise<void> {
		try {
			const pendingEvents = await WebhookEvent.findAll({
				where: {
					repositoryId,
					processed: false,
				},
				order: [["createdAt", "ASC"]],
			})

			for (const event of pendingEvents) {
				try {
					await this.processWebhookEvent(event.id)
				} catch (error) {
					logger.error(`Error processing webhook event ${event.id}:`, error)
					// Continue with other events
				}
			}
		} catch (error: any) {
			logger.error("Error processing pending webhook events:", error)
			throw error
		}
	}
}

export const webhookService = new WebhookService()
