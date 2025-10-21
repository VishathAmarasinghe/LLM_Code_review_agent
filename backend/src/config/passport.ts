import passport from "passport"
import { Strategy as GitHubStrategy } from "passport-github2"
import { logger } from "../utils/logger"
import { User } from "../models"

// Serialize user for session
passport.serializeUser((user: any, done) => {
	done(null, user.id)
})

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
	try {
		// Check if database is connected
		if (!User.sequelize || !User.sequelize.authenticate) {
			logger.error("Database not connected during user deserialization")
			return done(new Error("Database not connected"), null)
		}

		const user = await User.findByPk(id)
		done(null, user)
	} catch (error) {
		logger.error("Error deserializing user:", error)
		done(error, null)
	}
})

// GitHub OAuth Strategy - Initialize lazily
const initializeGitHubStrategy = () => {
	if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.GITHUB_CALLBACK_URL) {
		throw new Error("GitHub OAuth environment variables are not set. Please check your .env file.")
	}

	passport.use(
		new GitHubStrategy(
			{
				clientID: process.env.GITHUB_CLIENT_ID!,
				clientSecret: process.env.GITHUB_CLIENT_SECRET!,
				callbackURL: process.env.GITHUB_CALLBACK_URL!,
				scope: ["user:email", "repo", "read:user"],
			},
			async (accessToken: string, refreshToken: string, profile: any, done: any) => {
				try {
					logger.info(`GitHub OAuth attempt for user: ${profile.username}`)
					logger.info("Profile data:", {
						id: profile.id,
						username: profile.username,
						displayName: profile.displayName,
						email: profile.emails?.[0]?.value,
					})

					// Check if database is connected
					if (!User.sequelize) {
						logger.error("Database not connected during OAuth verification")
						return done(new Error("Database not connected"), null)
					}

					logger.info("Database connection verified, proceeding with user lookup")

					// Check if user already exists
					let user = await User.findOne({ where: { githubId: profile.id } })
					// logger.info('User lookup result:', { found: !!user, userId: user?.id });

					if (user) {
						// Update existing user's access token and last login
						user.set("accessToken", accessToken)
						user.set("refreshToken", refreshToken)
						user.set("lastLoginAt", new Date())
						user.set("avatarUrl", profile.photos?.[0]?.value || user.get("avatarUrl"))
						user.set("displayName", profile.displayName || profile.username)
						user.set("email", profile.emails?.[0]?.value || user.get("email"))

						await user.save()
						logger.info(`Updated existing user: ${profile.username}`)
					} else {
						// Create new user
						user = await User.create({
							githubId: profile.id,
							username: profile.username,
							displayName: profile.displayName || profile.username,
							email: profile.emails?.[0]?.value,
							avatarUrl: profile.photos?.[0]?.value || `https://github.com/${profile.username}.png`,
							profileUrl: profile.profileUrl,
							accessToken,
							refreshToken,
							lastLoginAt: new Date(),
						})

						logger.info(`Created new user: ${profile.username}`)
					}

					return done(null, user)
				} catch (error) {
					logger.error("GitHub OAuth error:", error)
					return done(error, null)
				}
			},
		),
	)
}

// Export both passport and the initialization function
export { initializeGitHubStrategy }
export default passport
