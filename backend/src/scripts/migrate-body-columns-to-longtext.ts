import { createSequelizeInstance } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Migration script to change body columns from TEXT to LONGTEXT
 * This fixes the "Data too long for column 'body'" error for large PR descriptions
 */
async function migrateBodyColumnsToLongtext() {
	const sequelize = createSequelizeInstance()

	try {
		logger.info("Starting migration to change body columns to LONGTEXT...")

		// Alter pull_requests table
		await sequelize.query(`
      ALTER TABLE pull_requests 
      MODIFY COLUMN body LONGTEXT NULL;
    `)
		logger.info("✓ Updated pull_requests.body to LONGTEXT")

		// Alter pull_request_comments table
		await sequelize.query(`
      ALTER TABLE pull_request_comments 
      MODIFY COLUMN body LONGTEXT NOT NULL;
    `)
		logger.info("✓ Updated pull_request_comments.body to LONGTEXT")

		// Alter pull_request_reviews table
		await sequelize.query(`
      ALTER TABLE pull_request_reviews 
      MODIFY COLUMN body LONGTEXT NULL;
    `)
		logger.info("✓ Updated pull_request_reviews.body to LONGTEXT")

		logger.info("Migration completed successfully!")
		process.exit(0)
	} catch (error: any) {
		logger.error("Migration failed:", error)
		process.exit(1)
	}
}

migrateBodyColumnsToLongtext()
