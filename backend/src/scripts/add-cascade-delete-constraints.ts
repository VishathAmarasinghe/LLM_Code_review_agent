import { createSequelizeInstance } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Migration script to add CASCADE delete constraints to foreign keys
 * This ensures when a PR is deleted, all related data is automatically deleted
 */
async function addCascadeDeleteConstraints() {
	const sequelize = createSequelizeInstance()

	try {
		logger.info("Starting migration to add CASCADE delete constraints...")

		// Drop and recreate foreign keys with CASCADE

		// 1. pull_request_files
		logger.info("Updating pull_request_files foreign key...")
		await sequelize
			.query(
				`
      ALTER TABLE pull_request_files
      DROP FOREIGN KEY pull_request_files_ibfk_1;
    `,
			)
			.catch(() => logger.warn("Foreign key pull_request_files_ibfk_1 not found"))

		await sequelize.query(`
      ALTER TABLE pull_request_files
      ADD CONSTRAINT pull_request_files_ibfk_1
      FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id)
      ON DELETE CASCADE;
    `)
		logger.info("✓ Updated pull_request_files with CASCADE delete")

		// 2. pull_request_comments
		logger.info("Updating pull_request_comments foreign key...")
		await sequelize
			.query(
				`
      ALTER TABLE pull_request_comments
      DROP FOREIGN KEY pull_request_comments_ibfk_1;
    `,
			)
			.catch(() => logger.warn("Foreign key pull_request_comments_ibfk_1 not found"))

		await sequelize.query(`
      ALTER TABLE pull_request_comments
      ADD CONSTRAINT pull_request_comments_ibfk_1
      FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id)
      ON DELETE CASCADE;
    `)
		logger.info("✓ Updated pull_request_comments with CASCADE delete")

		// 3. pull_request_reviews
		logger.info("Updating pull_request_reviews foreign key...")
		await sequelize
			.query(
				`
      ALTER TABLE pull_request_reviews
      DROP FOREIGN KEY pull_request_reviews_ibfk_1;
    `,
			)
			.catch(() => logger.warn("Foreign key pull_request_reviews_ibfk_1 not found"))

		await sequelize.query(`
      ALTER TABLE pull_request_reviews
      ADD CONSTRAINT pull_request_reviews_ibfk_1
      FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id)
      ON DELETE CASCADE;
    `)
		logger.info("✓ Updated pull_request_reviews with CASCADE delete")

		logger.info("Migration completed successfully!")
		logger.info("Now when you delete a PR, all files, comments, and reviews will be automatically deleted.")

		process.exit(0)
	} catch (error: any) {
		logger.error("Migration failed:", error)
		process.exit(1)
	}
}

addCascadeDeleteConstraints()
