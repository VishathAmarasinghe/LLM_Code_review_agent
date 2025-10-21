import { createSequelizeInstance } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Migration script to change GitHub ID columns from INTEGER to BIGINT
 * This fixes the "Out of range value for column" error for large GitHub IDs
 */
async function migrateGitHubIdsToBigint() {
	const sequelize = createSequelizeInstance()

	try {
		logger.info("Starting migration to change GitHub ID columns to BIGINT...")

		// Alter users table
		await sequelize.query(`
      ALTER TABLE users 
      MODIFY COLUMN github_id BIGINT NOT NULL;
    `)
		logger.info("✓ Updated users.github_id to BIGINT")

		// Alter repositories table
		await sequelize.query(`
      ALTER TABLE repositories 
      MODIFY COLUMN github_id BIGINT NOT NULL;
    `)
		logger.info("✓ Updated repositories.github_id to BIGINT")

		// Alter pull_requests table
		await sequelize.query(`
      ALTER TABLE pull_requests 
      MODIFY COLUMN github_pr_id BIGINT NOT NULL;
    `)
		logger.info("✓ Updated pull_requests.github_pr_id to BIGINT")

		// Alter pull_request_comments table
		await sequelize.query(`
      ALTER TABLE pull_request_comments 
      MODIFY COLUMN github_comment_id BIGINT NOT NULL;
    `)
		logger.info("✓ Updated pull_request_comments.github_comment_id to BIGINT")

		// Alter pull_request_reviews table
		await sequelize.query(`
      ALTER TABLE pull_request_reviews 
      MODIFY COLUMN github_review_id BIGINT NOT NULL;
    `)
		logger.info("✓ Updated pull_request_reviews.github_review_id to BIGINT")

		logger.info("Migration completed successfully!")
		process.exit(0)
	} catch (error: any) {
		logger.error("Migration failed:", error)
		process.exit(1)
	}
}

migrateGitHubIdsToBigint()
