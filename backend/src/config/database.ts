import { Sequelize } from "sequelize"
import { logger } from "../utils/logger"

// Create Sequelize instance lazily
let sequelize: Sequelize

const createSequelizeInstance = (): Sequelize => {
	if (!sequelize) {
		sequelize = new Sequelize({
			dialect: "mysql",
			host: process.env.DB_HOST || "localhost",
			port: parseInt(process.env.DB_PORT || "3306"),
			database: process.env.DB_NAME || "code_review_agent",
			username: process.env.DB_USER || "root",
			password: process.env.DB_PASSWORD || "Akila@123",
			logging: (msg) => logger.debug(msg),
			pool: {
				max: 5,
				min: 0,
				acquire: 30000,
				idle: 10000,
			},
			define: {
				timestamps: true,
				underscored: true,
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		})
	}
	return sequelize
}

export { createSequelizeInstance }
export { sequelize }

// Test database connection
export const connectDB = async (): Promise<void> => {
	try {
		// Initialize sequelize instance with environment variables
		const db = createSequelizeInstance()
		await db.authenticate()
		logger.info("MySQL database connected successfully")

		// Sync database (create tables if they don't exist)
		// Use force: true in development to recreate tables, or just sync in production
		if (process.env.NODE_ENV === "development" && process.env.FORCE_DB_SYNC === "true") {
			await db.sync({ force: true })
			logger.info("Database recreated (force sync)")
		} else {
			await db.sync()
			logger.info("Database synchronized")
		}

		// Note: PR-related indexes can be added manually using: npm run add-pr-indexes
	} catch (error) {
		logger.error("MySQL connection failed:", error)
		process.exit(1)
	}
}

// Graceful shutdown
process.on("SIGINT", async () => {
	if (sequelize) {
		await sequelize.close()
		logger.info("MySQL connection closed through app termination")
	}
	process.exit(0)
})

export default connectDB
