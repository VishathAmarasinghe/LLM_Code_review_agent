import { createSequelizeInstance } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Verification script to check if body columns are LONGTEXT
 */
async function verifyBodyColumns() {
	const sequelize = createSequelizeInstance()

	try {
		logger.info("Checking body column types...")

		// Check pull_requests table
		const [prResults]: any = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pull_requests'
      AND COLUMN_NAME = 'body';
    `)
		logger.info("pull_requests.body:", prResults[0])

		// Check pull_request_comments table
		const [commentResults]: any = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pull_request_comments'
      AND COLUMN_NAME = 'body';
    `)
		logger.info("pull_request_comments.body:", commentResults[0])

		// Check pull_request_reviews table
		const [reviewResults]: any = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pull_request_reviews'
      AND COLUMN_NAME = 'body';
    `)
		logger.info("pull_request_reviews.body:", reviewResults[0])

		// Verify all are LONGTEXT
		const allLongText =
			prResults[0]?.DATA_TYPE === "longtext" &&
			commentResults[0]?.DATA_TYPE === "longtext" &&
			reviewResults[0]?.DATA_TYPE === "longtext"

		if (allLongText) {
			logger.info("✓ All body columns are correctly set to LONGTEXT!")
		} else {
			logger.error("✗ Some body columns are not LONGTEXT")
		}

		process.exit(0)
	} catch (error: any) {
		logger.error("Verification failed:", error)
		process.exit(1)
	}
}

verifyBodyColumns()
