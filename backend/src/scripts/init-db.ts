import dotenv from "dotenv"
import { createSequelizeInstance } from "../config/database"
import { User, Repository, SyncStatus } from "../models"
import { logger } from "../utils/logger"

// Load environment variables
dotenv.config()

async function initializeDatabase() {
	let sequelize: any

	try {
		logger.info("Initializing database...")

		// Create sequelize instance
		sequelize = createSequelizeInstance()

		// Test connection
		await sequelize.authenticate()
		logger.info("Database connection established successfully")

		// Sync all models (create tables)
		await sequelize.sync({ force: false, alter: true })
		logger.info("Database tables synchronized")

		// Create session table for express-session-sequelize
		try {
			const { SequelizeStore } = require("connect-session-sequelize")
			const sessionStore = new SequelizeStore({
				db: sequelize,
				table: "Sessions",
			})

			await sessionStore.sync()
			logger.info("Session table synchronized")
		} catch (sessionError) {
			logger.warn("Session table sync failed (this is optional):", sessionError)
		}

		logger.info("Database initialization completed successfully")
	} catch (error) {
		logger.error("Database initialization failed:", error)
		process.exit(1)
	} finally {
		if (sequelize) {
			await sequelize.close()
		}
		process.exit(0)
	}
}

// Run if called directly
if (require.main === module) {
	initializeDatabase()
}

export default initializeDatabase
