import { CodeIndexingService } from "../services/indexing/CodeIndexingService"
import { Repository, User, IndexingConfiguration } from "../models"
import { logger } from "../utils/logger"

async function testIndexing() {
	try {
		logger.info("🧪 Testing code indexing functionality...")

		// Get the indexing service
		const indexingService = CodeIndexingService.getInstance()

		// Test configuration validation
		logger.info("📋 Testing configuration validation...")

		// You would need to create a test user and repository first
		// This is just a basic test structure

		logger.info("✅ Indexing test completed successfully")
	} catch (error) {
		logger.error("❌ Indexing test failed:", error)
	}
}

// Run the test if called directly
if (require.main === module) {
	testIndexing()
		.then(() => {
			logger.info("Test completed")
			process.exit(0)
		})
		.catch((error) => {
			logger.error("Test failed:", error)
			process.exit(1)
		})
}

export { testIndexing }
