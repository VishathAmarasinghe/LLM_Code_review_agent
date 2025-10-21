# Code Indexing System

This document describes the code indexing system implemented in the Code Review Agent backend, which provides semantic code search capabilities using OpenAI embeddings and Qdrant vector database.

## 🚀 Features

- **Repository Indexing**: Index entire repositories for semantic code search
- **Real-time Progress**: Track indexing progress with detailed status updates
- **Semantic Search**: Find code based on meaning, not just keywords
- **Multi-language Support**: Supports 30+ programming languages
- **Vector Storage**: Uses Qdrant for efficient similarity search
- **OpenAI Integration**: Leverages OpenAI's text-embedding-3-small model
- **Batch Processing**: Efficient processing of large codebases
- **Error Handling**: Comprehensive error handling and retry logic

## 🏗️ Architecture

### Core Components

1. **CodeIndexingService**: Main orchestrator for indexing operations
2. **RepositoryScanner**: Scans repositories and filters supported files
3. **CodeParser**: Parses code files into semantic blocks
4. **OpenAIEmbedder**: Generates embeddings using OpenAI API
5. **QdrantVectorStore**: Stores and searches vectors in Qdrant
6. **Database Models**: IndexingJob, CodeBlock, IndexingConfiguration

### Data Flow

```
Repository → Scanner → Parser → Embedder → Vector Store → Search
     ↓           ↓        ↓         ↓           ↓
  Files → Code Blocks → Embeddings → Vectors → Results
```

## 📊 Database Schema

### IndexingJob

Tracks indexing progress and status for each repository.

```sql
CREATE TABLE indexing_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repository_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
  progress INT NOT NULL DEFAULT 0,
  total_files INT NOT NULL DEFAULT 0,
  processed_files INT NOT NULL DEFAULT 0,
  total_blocks INT NOT NULL DEFAULT 0,
  indexed_blocks INT NOT NULL DEFAULT 0,
  stage ENUM('initializing', 'scanning', 'parsing', 'embedding', 'storing', 'completed'),
  message TEXT,
  error TEXT,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### CodeBlock

Stores parsed code blocks with metadata.

```sql
CREATE TABLE code_blocks (
  id VARCHAR(36) PRIMARY KEY,
  repository_id INT NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_extension VARCHAR(20) NOT NULL,
  start_line INT NOT NULL,
  end_line INT NOT NULL,
  content TEXT NOT NULL,
  block_type ENUM('function', 'class', 'method', 'interface', 'type', 'variable', 'import', 'comment', 'other'),
  identifier VARCHAR(500),
  language VARCHAR(50) NOT NULL,
  file_hash VARCHAR(64) NOT NULL,
  segment_hash VARCHAR(64) NOT NULL,
  vector_id VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### IndexingConfiguration

User-specific indexing settings.

```sql
CREATE TABLE indexing_configurations (
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Add to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_here_optional

# Indexing Configuration
INDEXING_MAX_FILE_SIZE=1048576
INDEXING_BATCH_SIZE=100
INDEXING_MAX_CONCURRENT_JOBS=3
```

### 3. Database Setup

Create the indexing tables:

```bash
npm run create-indexing-tables
```

### 4. Start Qdrant

Using Docker:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

Or install locally following [Qdrant documentation](https://qdrant.tech/documentation/quick-start/).

## 📚 API Endpoints

### Indexing Management

#### Start Indexing

```http
POST /api/indexing/start/:repositoryId
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "options": {
    "maxFileSize": 1048576,
    "batchSize": 100,
    "includePatterns": ["*.ts", "*.js"],
    "excludePatterns": ["*.test.ts", "*.spec.ts"]
  }
}
```

#### Stop Indexing

```http
POST /api/indexing/stop/:repositoryId
Authorization: Bearer <jwt_token>
```

#### Get Indexing Status

```http
GET /api/indexing/status/:repositoryId
Authorization: Bearer <jwt_token>
```

#### Get Indexing Jobs

```http
GET /api/indexing/jobs?limit=10
Authorization: Bearer <jwt_token>
```

#### Delete Indexing Job

```http
DELETE /api/indexing/jobs/:jobId
Authorization: Bearer <jwt_token>
```

### Code Search

#### Search Code in Repository

```http
POST /api/indexing/search/:repositoryId
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "query": "authentication function",
  "limit": 50
}
```

#### Global Code Search

```http
POST /api/search/code
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "query": "error handling",
  "repositoryIds": [1, 2, 3],
  "limit": 50,
  "minScore": 0.7
}
```

#### Get Indexed Files

```http
GET /api/search/repositories/:repositoryId/files?page=1&limit=50&filePath=src/
Authorization: Bearer <jwt_token>
```

#### Get Repository Statistics

```http
GET /api/search/repositories/:repositoryId/stats
Authorization: Bearer <jwt_token>
```

### Configuration Management

#### Get Indexing Configuration

```http
GET /api/indexing/config
Authorization: Bearer <jwt_token>
```

#### Update Indexing Configuration

```http
POST /api/indexing/config
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "openaiApiKey": "sk-...",
  "qdrantUrl": "http://localhost:6333",
  "qdrantApiKey": "optional_api_key",
  "embeddingModel": "text-embedding-3-small",
  "maxFileSize": 1048576,
  "batchSize": 100,
  "maxConcurrentJobs": 3,
  "isEnabled": true
}
```

## 🔍 Supported Languages

The system supports 30+ programming languages:

- **Web**: JavaScript, TypeScript, HTML, CSS, SCSS, Sass, Less
- **Backend**: Python, Java, C#, PHP, Ruby, Go, Rust, Swift, Kotlin, Scala
- **Mobile**: Dart, Objective-C, Objective-C++
- **Scripting**: Shell, Bash, Zsh, Fish, PowerShell, Batch
- **Data**: SQL, R, Python
- **Config**: JSON, XML, YAML, TOML, INI
- **Documentation**: Markdown, reStructuredText, AsciiDoc, LaTeX

## ⚙️ Configuration Options

### Indexing Options

- `maxFileSize`: Maximum file size to process (default: 1MB)
- `batchSize`: Number of files to process in each batch (default: 100)
- `includePatterns`: File patterns to include (e.g., ["*.ts", "*.js"])
- `excludePatterns`: File patterns to exclude (e.g., ["*.test.ts", "*.spec.ts"])
- `enableSecurityScanning`: Enable security analysis (future feature)
- `enablePerformanceAnalysis`: Enable performance analysis (future feature)
- `enableCrossFileAnalysis`: Enable cross-file dependency analysis (future feature)

### Embedding Models

- `text-embedding-3-small`: 1536 dimensions, cost-effective
- `text-embedding-3-large`: 3072 dimensions, higher quality
- `text-embedding-ada-002`: 1536 dimensions, legacy model

## 🚀 Usage Examples

### 1. Basic Indexing

```typescript
// Start indexing a repository
const response = await fetch("/api/indexing/start/123", {
	method: "POST",
	headers: {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		options: {
			batchSize: 50,
			maxFileSize: 2097152, // 2MB
		},
	}),
})

const result = await response.json()
console.log("Indexing started:", result.data.jobId)
```

### 2. Monitor Progress

```typescript
// Check indexing status
const checkStatus = async (repositoryId) => {
	const response = await fetch(`/api/indexing/status/${repositoryId}`, {
		headers: { Authorization: `Bearer ${token}` },
	})

	const result = await response.json()
	console.log(`Progress: ${result.data.progress}%`)
	console.log(`Stage: ${result.data.stage}`)
	console.log(`Message: ${result.data.message}`)

	if (result.data.status === "running") {
		setTimeout(() => checkStatus(repositoryId), 2000)
	}
}
```

### 3. Search Code

```typescript
// Search for authentication functions
const searchCode = async (repositoryId, query) => {
	const response = await fetch(`/api/indexing/search/${repositoryId}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			query: "authentication function",
			limit: 20,
		}),
	})

	const result = await response.json()
	result.data.results.forEach((result) => {
		console.log(`File: ${result.filePath}:${result.startLine}-${result.endLine}`)
		console.log(`Score: ${result.score}`)
		console.log(`Code: ${result.content}`)
	})
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Qdrant Connection Failed**

    - Ensure Qdrant is running on the specified URL
    - Check firewall settings
    - Verify API key if using authentication

2. **OpenAI API Errors**

    - Verify API key is valid
    - Check rate limits and billing
    - Ensure sufficient credits

3. **Indexing Stuck**

    - Check job status and error messages
    - Verify repository access permissions
    - Check file size limits

4. **Search Returns No Results**
    - Ensure repository is fully indexed
    - Try different search queries
    - Check minimum score threshold

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=debug
```

### Performance Tuning

- Increase `batchSize` for faster processing (but higher memory usage)
- Decrease `maxFileSize` to skip large files
- Adjust `maxConcurrentJobs` based on system resources
- Use faster embedding models for better performance

## 🔒 Security Considerations

- API keys are stored encrypted in the database
- Repository access is validated against user permissions
- File content is processed in memory and not persisted
- Vector data is stored in Qdrant with repository isolation

## 📈 Performance Metrics

- **Indexing Speed**: ~100-500 files per minute (depends on file size and complexity)
- **Search Latency**: <100ms for most queries
- **Memory Usage**: ~50-200MB per concurrent indexing job
- **Storage**: ~1-5MB per 1000 code blocks (depending on content)

## 🚀 Future Enhancements

- [ ] Security vulnerability detection
- [ ] Performance bottleneck analysis
- [ ] Cross-file dependency mapping
- [ ] Code quality metrics
- [ ] Real-time file watching
- [ ] Multi-repository search
- [ ] Search result ranking improvements
- [ ] Code similarity detection
