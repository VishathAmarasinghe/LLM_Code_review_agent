import { sequelize } from "../config/database"
import { logger } from "../utils/logger"

async function createIndexingTables() {
	try {
		logger.info("Creating indexing tables...")

		// Create indexing_jobs table
		await sequelize.query(`
      CREATE TABLE IF NOT EXISTS indexing_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        repository_id INT NOT NULL,
        user_id INT NOT NULL,
        status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
        progress INT NOT NULL DEFAULT 0,
        total_files INT NOT NULL DEFAULT 0,
        processed_files INT NOT NULL DEFAULT 0,
        total_blocks INT NOT NULL DEFAULT 0,
        indexed_blocks INT NOT NULL DEFAULT 0,
        stage ENUM('initializing', 'scanning', 'parsing', 'embedding', 'storing', 'completed') NOT NULL DEFAULT 'initializing',
        message TEXT,
        error TEXT,
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_repository_id (repository_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

		// Create code_blocks table
		await sequelize.query(`
      CREATE TABLE IF NOT EXISTS code_blocks (
        id VARCHAR(36) PRIMARY KEY,
        repository_id INT NOT NULL,
        file_path VARCHAR(1000) NOT NULL,
        file_name VARCHAR(500) NOT NULL,
        file_extension VARCHAR(20) NOT NULL,
        start_line INT NOT NULL,
        end_line INT NOT NULL,
        content TEXT NOT NULL,
        block_type ENUM('function', 'class', 'method', 'interface', 'type', 'variable', 'import', 'comment', 'other') NOT NULL,
        identifier VARCHAR(500),
        language VARCHAR(50) NOT NULL,
        file_hash VARCHAR(64) NOT NULL,
        segment_hash VARCHAR(64) NOT NULL,
        vector_id VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
        INDEX idx_repository_id (repository_id),
        INDEX idx_file_path (file_path),
        INDEX idx_file_hash (file_hash),
        INDEX idx_segment_hash (segment_hash),
        INDEX idx_vector_id (vector_id),
        INDEX idx_block_type (block_type),
        INDEX idx_language (language),
        INDEX idx_repository_file (repository_id, file_path)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

		// Create indexing_configurations table
		await sequelize.query(`
      CREATE TABLE IF NOT EXISTS indexing_configurations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        openai_api_key TEXT NOT NULL,
        qdrant_url VARCHAR(500) NOT NULL DEFAULT 'http://localhost:6333',
        qdrant_api_key TEXT,
        embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
        max_file_size INT NOT NULL DEFAULT 1048576,
        batch_size INT NOT NULL DEFAULT 100,
        max_concurrent_jobs INT NOT NULL DEFAULT 3,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_is_enabled (is_enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

		logger.info("✅ Indexing tables created successfully")
	} catch (error) {
		logger.error("❌ Error creating indexing tables:", error)
		throw error
	}
}

// Run the script if called directly
if (require.main === module) {
	createIndexingTables()
		.then(() => {
			logger.info("Database migration completed successfully")
			process.exit(0)
		})
		.catch((error) => {
			logger.error("Database migration failed:", error)
			process.exit(1)
		})
}

export { createIndexingTables }
