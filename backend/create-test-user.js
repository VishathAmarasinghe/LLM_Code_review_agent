const { User } = require("./dist/models")
const jwt = require("jsonwebtoken")

async function createTestUser() {
	try {
		// Check if user already exists
		let user = await User.findOne({ where: { username: "testuser" } })

		if (!user) {
			// Create test user
			user = await User.create({
				githubId: 12345,
				username: "testuser",
				displayName: "Test User",
				email: "test@example.com",
				avatarUrl: "https://avatars.githubusercontent.com/u/12345?v=4",
				profileUrl: "https://github.com/testuser",
				accessToken: "ghp_test_token_12345", // This would be a real GitHub token in production
				lastLoginAt: new Date(),
				createdAt: new Date(),
			})
			console.log("Test user created:", user.id)
		} else {
			console.log("Test user already exists:", user.id)
		}

		// Generate JWT token
		const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" })

		console.log("JWT Token:", token)
		console.log("You can use this token to test the API:")
		console.log(
			`curl -H "Authorization: Bearer ${token}" http://localhost:3001/api/code-review/start/VishathAmarasinghe/pr_testing_app/3`,
		)
	} catch (error) {
		console.error("Error creating test user:", error)
	}
}

createTestUser()
