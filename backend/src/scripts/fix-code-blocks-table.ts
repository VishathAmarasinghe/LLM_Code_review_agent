import dotenv from "dotenv"
dotenv.config()

import { createSequelizeInstance } from "../config/database"
import { logger } from "../utils/logger"

async function fixCodeBlocksTable() {
	const sequelize = createSequelizeInstance()

	try {
		await sequelize.authenticate()
		logger.info("Database connected successfully")

		// Drop the code_blocks table if it exists
		await sequelize.query("DROP TABLE IF EXISTS `code_blocks`")
		logger.info("Dropped existing code_blocks table")

		// Force sync to recreate the table with correct indexes
		await sequelize.sync({ force: true })
		logger.info("Recreated all tables with correct indexes")

		logger.info("✅ Database fix completed successfully!")
	} catch (error) {
		logger.error("❌ Error fixing database:", error)
		throw error
	} finally {
		await sequelize.close()
	}
}

// Run the fix
fixCodeBlocksTable()
	.then(() => {
		logger.info("Database fix script completed")
		process.exit(0)
	})
	.catch((error) => {
		logger.error("Database fix script failed:", error)
		process.exit(1)
	})
