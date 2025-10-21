import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { PullRequest } from "./PullRequest"

export interface PullRequestReviewAttributes {
	id: number
	pullRequestId: number
	githubReviewId: number
	body?: string
	state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING"
	authorLogin: string
	authorName?: string
	authorEmail?: string
	authorAvatarUrl?: string
	htmlUrl?: string
	commitId?: string
	createdAt: Date
	updatedAt: Date
	githubCreatedAt?: Date
	githubSubmittedAt?: Date
}

export interface PullRequestReviewCreationAttributes
	extends Optional<PullRequestReviewAttributes, "id" | "createdAt" | "updatedAt"> {}

export class PullRequestReview
	extends Model<PullRequestReviewAttributes, PullRequestReviewCreationAttributes>
	implements PullRequestReviewAttributes
{
	public id!: number
	public pullRequestId!: number
	public githubReviewId!: number
	public body?: string
	public state!: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING"
	public authorLogin!: string
	public authorName?: string
	public authorEmail?: string
	public authorAvatarUrl?: string
	public htmlUrl?: string
	public commitId?: string
	public createdAt!: Date
	public updatedAt!: Date
	public githubCreatedAt?: Date
	public githubSubmittedAt?: Date

	// Associations
	public pullRequest?: PullRequest

	public static associate(): void {
		PullRequestReview.belongsTo(PullRequest, {
			foreignKey: "pullRequestId",
			as: "pullRequest",
		})
	}
}

export const initPullRequestReviewModel = (sequelize: any) => {
	PullRequestReview.init(
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			pullRequestId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: {
					model: "pull_requests",
					key: "id",
				},
			},
			githubReviewId: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
			body: {
				type: DataTypes.TEXT("long"),
				allowNull: true,
			},
			state: {
				type: DataTypes.ENUM("APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"),
				allowNull: false,
			},
			authorLogin: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			authorName: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			authorEmail: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			authorAvatarUrl: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			htmlUrl: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			commitId: {
				type: DataTypes.STRING(40),
				allowNull: true,
			},
			githubCreatedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			githubSubmittedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			createdAt: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			updatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
			},
		},
		{
			sequelize,
			tableName: "pull_request_reviews",
			timestamps: true,
		},
	)

	return PullRequestReview
}
