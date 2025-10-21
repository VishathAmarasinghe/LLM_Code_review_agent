import { createSequelizeInstance } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Migration script to:
 * 1. Remove duplicate PRs (keep only the latest)
 * 2. Add unique constraint on (repository_id, github_pr_id)
 */
async function addUniqueConstraintPullRequests() {
	const sequelize = createSequelizeInstance()

	try {
		logger.info("Starting migration to add unique constraint on pull_requests...")

		// STEP 1: Find and remove duplicates
		logger.info("Step 1: Finding duplicate PRs...")

		const [duplicates]: any = await sequelize.query(`
      SELECT repository_id, github_pr_id, COUNT(*) as count, GROUP_CONCAT(id ORDER BY created_at DESC) as ids
      FROM pull_requests
      GROUP BY repository_id, github_pr_id
      HAVING COUNT(*) > 1;
    `)

		if (duplicates.length > 0) {
			logger.info(`Found ${duplicates.length} sets of duplicate PRs`)

			for (const dup of duplicates) {
				// Keep the first ID (latest), delete the rest
				const ids = dup.ids.split(",")
				const toKeep = ids[0]
				const toDelete = ids.slice(1)

				if (toDelete.length > 0) {
					logger.info(
						`Removing ${toDelete.length} duplicate(s) for PR ${dup.github_pr_id} in repo ${dup.repository_id}, keeping ID ${toKeep}`,
					)

					// Delete related records for duplicates
					await sequelize.query(
						`DELETE FROM pull_request_files WHERE pull_request_id IN (${toDelete.join(",")})`,
					)
					await sequelize.query(
						`DELETE FROM pull_request_comments WHERE pull_request_id IN (${toDelete.join(",")})`,
					)
					await sequelize.query(
						`DELETE FROM pull_request_reviews WHERE pull_request_id IN (${toDelete.join(",")})`,
					)

					// Delete duplicate PRs
					await sequelize.query(`DELETE FROM pull_requests WHERE id IN (${toDelete.join(",")})`)
				}
			}

			logger.info("✓ Removed all duplicate PRs")
		} else {
			logger.info("✓ No duplicate PRs found")
		}

		// STEP 2: Add unique constraint
		logger.info("Step 2: Adding unique constraint...")

		// First check if constraint already exists
		const [constraints]: any = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pull_requests'
      AND CONSTRAINT_NAME = 'unique_repository_pr';
    `)

		if (constraints.length > 0) {
			logger.info("✓ Unique constraint already exists")
		} else {
			await sequelize.query(`
        ALTER TABLE pull_requests
        ADD CONSTRAINT unique_repository_pr 
        UNIQUE (repository_id, github_pr_id);
      `)
			logger.info("✓ Added unique constraint on (repository_id, github_pr_id)")
		}

		logger.info("Migration completed successfully!")
		process.exit(0)
	} catch (error: any) {
		logger.error("Migration failed:", error)
		process.exit(1)
	}
}

addUniqueConstraintPullRequests()
