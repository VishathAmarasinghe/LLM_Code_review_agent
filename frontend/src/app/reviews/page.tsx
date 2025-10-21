export default function ReviewsPage() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Code Reviews</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">View and manage your code review history</p>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
					<div className="p-6">
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
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
							</div>
							<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reviews yet</h3>
							<p className="text-gray-600 dark:text-gray-400">
								Start by analyzing some code to see your reviews here
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
