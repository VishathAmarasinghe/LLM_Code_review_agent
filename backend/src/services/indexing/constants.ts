// Code Indexing Constants - Matching RooCode exactly

/**Parser */
export const MAX_BLOCK_CHARS = 1000
export const MIN_BLOCK_CHARS = 50
export const MIN_CHUNK_REMAINDER_CHARS = 200 // Minimum characters for the *next* chunk after a split
export const MAX_CHARS_TOLERANCE_FACTOR = 1.15 // 15% tolerance for max chars

/**Search */
export const DEFAULT_SEARCH_MIN_SCORE = 0.7
export const DEFAULT_MAX_SEARCH_RESULTS = 50

/**File Watcher */
export const QDRANT_CODE_BLOCK_NAMESPACE = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
export const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024 // 1MB

/**Directory Scanner */
export const MAX_LIST_FILES_LIMIT_CODE_INDEX = 50_000
export const BATCH_SEGMENT_THRESHOLD = 60 // Number of code segments to batch for embeddings/upserts
export const MAX_BATCH_RETRIES = 3
export const INITIAL_RETRY_DELAY_MS = 500
export const PARSING_CONCURRENCY = 10
export const MAX_PENDING_BATCHES = 20 // Maximum number of batches to accumulate before waiting

/**OpenAI Embedder */
export const MAX_BATCH_TOKENS = 100000
export const MAX_ITEM_TOKENS = 8191
export const BATCH_PROCESSING_CONCURRENCY = 10

/**Gemini Embedder */
export const GEMINI_MAX_ITEM_TOKENS = 2048

// Embedding settings
export const EMBEDDING_DIMENSIONS = 1536 // text-embedding-3-small dimensions

// Supported file extensions
export const SUPPORTED_EXTENSIONS = [
	".js",
	".ts",
	".jsx",
	".tsx",
	".py",
	".java",
	".cpp",
	".c",
	".h",
	".hpp",
	".cs",
	".php",
	".rb",
	".go",
	".rs",
	".swift",
	".kt",
	".scala",
	".r",
	".m",
	".mm",
	".pl",
	".sh",
	".bash",
	".zsh",
	".fish",
	".ps1",
	".bat",
	".sql",
	".html",
	".css",
	".scss",
	".sass",
	".less",
	".vue",
	".svelte",
	".dart",
	".lua",
	".vim",
	".yaml",
	".yml",
	".json",
	".xml",
	".toml",
	".ini",
	".cfg",
	".conf",
	".md",
	".txt",
	".rst",
	".tex",
	".org",
]

// Ignored directories
export const IGNORED_DIRECTORIES = [
	"node_modules",
	".git",
	".svn",
	".hg",
	".bzr",
	".vscode",
	".idea",
	"dist",
	"build",
	"out",
	"target",
	"bin",
	"obj",
	".next",
	".nuxt",
	"coverage",
	".nyc_output",
	"logs",
	"tmp",
	"temp",
	".cache",
	"vendor",
	"bower_components",
	".sass-cache",
	".parcel-cache",
]

// Ignored file patterns
export const IGNORED_FILE_PATTERNS = [
	"*.log",
	"*.tmp",
	"*.temp",
	"*.cache",
	"*.min.js",
	"*.min.css",
	"*.bundle.js",
	"*.chunk.js",
	"*.map",
	"*.lock",
	"*.pid",
]

// Rate limiting
export const RATE_LIMIT_DELAY_MS = 1000
export const MAX_RETRIES = 3
export const RETRY_DELAY_MS = 2000
