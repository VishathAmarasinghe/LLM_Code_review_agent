import dotenv from "dotenv"
dotenv.config()

import { createSequelizeInstance } from "../config/database"
import { User } from "../models/User"
import { Repository } from "../models/Repository"
import { SyncStatus } from "../models/SyncStatus"
import { logger } from "../utils/logger"

const resetDatabase = async () => {
	try {
		logger.info("Starting database reset...")

		const sequelize = createSequelizeInstance()

		// Test connection
		await sequelize.authenticate()
		logger.info("Database connection established")

		// Drop all tables
		logger.info("Dropping all tables...")
		await sequelize.drop()
		logger.info("All tables dropped")

		// Recreate tables
		logger.info("Creating tables...")
		await sequelize.sync()
		logger.info("Tables created successfully")

		logger.info("Database reset completed successfully")
		process.exit(0)
	} catch (error) {
		logger.error("Database reset failed:", error)
		process.exit(1)
	}
}

resetDatabase()
