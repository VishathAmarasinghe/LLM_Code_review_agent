import { sequelize } from "../config/database"
import { logger } from "../utils/logger"

async function addPRIndexes() {
	try {
		logger.info("Adding PR-related indexes...")

		// Helper function to create index with error handling
		const createIndex = async (indexName: string, tableName: string, columns: string, unique = false) => {
			try {
				const uniqueKeyword = unique ? "UNIQUE " : ""
				await sequelize.query(`
          CREATE ${uniqueKeyword}INDEX ${indexName} 
          ON ${tableName} (${columns})
        `)
				logger.info(`Created index: ${indexName}`)
			} catch (error: any) {
				if (error.message.includes("Duplicate key name") || error.message.includes("already exists")) {
					logger.info(`Index ${indexName} already exists, skipping...`)
				} else {
					throw error
				}
			}
		}

		// Add indexes for pull_requests table
		await createIndex("pull_requests_repository_id_github_pr_id", "pull_requests", "repositoryId, githubPrId", true)
		await createIndex("pull_requests_state", "pull_requests", "state")
		await createIndex("pull_requests_author_login", "pull_requests", "authorLogin")
		await createIndex("pull_requests_github_created_at", "pull_requests", "githubCreatedAt")
		await createIndex("pull_requests_github_updated_at", "pull_requests", "githubUpdatedAt")

		// Add indexes for pull_request_files table
		await createIndex("pull_request_files_pull_request_id", "pull_request_files", "pullRequestId")
		await createIndex("pull_request_files_filename", "pull_request_files", "filename")
		await createIndex("pull_request_files_status", "pull_request_files", "status")

		// Add indexes for pull_request_comments table
		await createIndex(
			"pull_request_comments_pull_request_id_github_comment_id",
			"pull_request_comments",
			"pullRequestId, githubCommentId",
			true,
		)
		await createIndex("pull_request_comments_pull_request_id", "pull_request_comments", "pullRequestId")
		await createIndex("pull_request_comments_author_login", "pull_request_comments", "authorLogin")
		await createIndex("pull_request_comments_comment_type", "pull_request_comments", "commentType")
		await createIndex("pull_request_comments_github_created_at", "pull_request_comments", "githubCreatedAt")

		// Add indexes for pull_request_reviews table
		await createIndex(
			"pull_request_reviews_pull_request_id_github_review_id",
			"pull_request_reviews",
			"pullRequestId, githubReviewId",
			true,
		)
		await createIndex("pull_request_reviews_pull_request_id", "pull_request_reviews", "pullRequestId")
		await createIndex("pull_request_reviews_author_login", "pull_request_reviews", "authorLogin")
		await createIndex("pull_request_reviews_state", "pull_request_reviews", "state")
		await createIndex("pull_request_reviews_github_submitted_at", "pull_request_reviews", "githubSubmittedAt")

		// Add indexes for webhook_events table
		await createIndex("webhook_events_repository_id", "webhook_events", "repositoryId")
		await createIndex("webhook_events_event_type", "webhook_events", "eventType")
		await createIndex("webhook_events_action", "webhook_events", "action")
		await createIndex("webhook_events_processed", "webhook_events", "processed")
		await createIndex("webhook_events_github_event_id", "webhook_events", "githubEventId")
		await createIndex("webhook_events_created_at", "webhook_events", "createdAt")

		logger.info("All PR-related indexes added successfully")
	} catch (error: any) {
		logger.error("Error adding PR indexes:", error)
		throw error
	}
}

// Run the script if called directly
if (require.main === module) {
	addPRIndexes()
		.then(() => {
			logger.info("Index creation completed")
			process.exit(0)
		})
		.catch((error) => {
			logger.error("Index creation failed:", error)
			process.exit(1)
		})
}

export default addPRIndexes
