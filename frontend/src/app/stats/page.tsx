export default function StatsPage() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Statistics</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Overview of your code review activity and metrics
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
						<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Reviews</h3>
						<p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
					</div>
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
						<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Issues Found</h3>
						<p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
					</div>
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
						<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Languages</h3>
						<p className="text-2xl font-bold text-gray-900 dark:text-white">0</p>
					</div>
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
						<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Score</h3>
						<p className="text-2xl font-bold text-gray-900 dark:text-white">-</p>
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
					<div className="p-6">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Overview</h2>
						<div className="text-center py-12">
							<div className="text-gray-400 dark:text-gray-600 mb-4">
								<svg
									className="mx-auto h-12 w-12"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1}
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
							</div>
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
								No data available
							</h3>
							<p className="text-gray-600 dark:text-gray-400">
								Start analyzing code to see your statistics
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
