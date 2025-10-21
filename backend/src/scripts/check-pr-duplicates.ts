import { createSequelizeInstance } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Script to check for duplicate PRs
 */
async function checkPRDuplicates() {
	const sequelize = createSequelizeInstance()

	try {
		logger.info("Checking for duplicate PRs...")

		const [duplicates]: any = await sequelize.query(`
      SELECT repository_id, github_pr_id, COUNT(*) as count
      FROM pull_requests
      GROUP BY repository_id, github_pr_id
      HAVING COUNT(*) > 1;
    `)

		if (duplicates.length > 0) {
			logger.error(`❌ Found ${duplicates.length} sets of duplicate PRs:`, duplicates)
		} else {
			logger.info("✅ No duplicate PRs found - all unique!")
		}

		// Also show total count
		const [total]: any = await sequelize.query(`
      SELECT COUNT(*) as total FROM pull_requests;
    `)

		logger.info(`Total PRs in database: ${total[0].total}`)

		process.exit(0)
	} catch (error: any) {
		logger.error("Check failed:", error)
		process.exit(1)
	}
}

checkPRDuplicates()
