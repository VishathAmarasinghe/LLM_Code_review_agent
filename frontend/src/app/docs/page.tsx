export default function DocsPage() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documentation</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">Learn how to use the Code Review Agent</p>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
					<div className="p-6">
						<div className="prose prose-gray dark:prose-invert max-w-none">
							<h2>Getting Started</h2>
							<p>
								The Code Review Agent helps you analyze and improve your code quality using AI-powered
								analysis.
							</p>

							<h3>How to Use</h3>
							<ol>
								<li>Select your programming language</li>
								<li>Paste your code in the editor</li>
								<li>Choose review type (comprehensive, security, performance, or style)</li>
								<li>Click "Analyze Code" to get started</li>
							</ol>

							<h3>Supported Languages</h3>
							<p>
								We support a wide range of programming languages including JavaScript, TypeScript,
								Python, Java, C++, Go, Rust, and many more.
							</p>

							<h3>Review Types</h3>
							<ul>
								<li>
									<strong>Comprehensive:</strong> Full analysis including security, performance, and
									style
								</li>
								<li>
									<strong>Security:</strong> Focus on security vulnerabilities and best practices
								</li>
								<li>
									<strong>Performance:</strong> Optimize for speed, memory usage, and efficiency
								</li>
								<li>
									<strong>Style:</strong> Code style, formatting, and best practices
								</li>
							</ul>

							<h3>Features</h3>
							<ul>
								<li>AI-powered code analysis</li>
								<li>Issue detection and suggestions</li>
								<li>Code quality metrics</li>
								<li>Review history and statistics</li>
								<li>Multiple programming language support</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
