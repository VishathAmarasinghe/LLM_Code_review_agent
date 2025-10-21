import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { PullRequest } from "./PullRequest"

export interface PullRequestCommentAttributes {
	id: number
	pullRequestId: number
	githubCommentId: number
	body: string
	authorLogin: string
	authorName?: string
	authorEmail?: string
	authorAvatarUrl?: string
	htmlUrl?: string
	filePath?: string
	lineNumber?: number
	position?: number
	originalLineNumber?: number
	originalPosition?: number
	commentType: "review_comment" | "issue_comment" | "pr_comment"
	createdAt: Date
	updatedAt: Date
	githubCreatedAt: Date
	githubUpdatedAt: Date
}

export interface PullRequestCommentCreationAttributes
	extends Optional<PullRequestCommentAttributes, "id" | "createdAt" | "updatedAt"> {}

export class PullRequestComment
	extends Model<PullRequestCommentAttributes, PullRequestCommentCreationAttributes>
	implements PullRequestCommentAttributes
{
	public id!: number
	public pullRequestId!: number
	public githubCommentId!: number
	public body!: string
	public authorLogin!: string
	public authorName?: string
	public authorEmail?: string
	public authorAvatarUrl?: string
	public htmlUrl?: string
	public filePath?: string
	public lineNumber?: number
	public position?: number
	public originalLineNumber?: number
	public originalPosition?: number
	public commentType!: "review_comment" | "issue_comment" | "pr_comment"
	public createdAt!: Date
	public updatedAt!: Date
	public githubCreatedAt!: Date
	public githubUpdatedAt!: Date

	// Associations
	public pullRequest?: PullRequest

	public static associate(): void {
		PullRequestComment.belongsTo(PullRequest, {
			foreignKey: "pullRequestId",
			as: "pullRequest",
		})
	}
}

export const initPullRequestCommentModel = (sequelize: any) => {
	PullRequestComment.init(
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
			githubCommentId: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
			body: {
				type: DataTypes.TEXT("long"),
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
			filePath: {
				type: DataTypes.STRING(500),
				allowNull: true,
			},
			lineNumber: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			position: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			originalLineNumber: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			originalPosition: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			commentType: {
				type: DataTypes.ENUM("review_comment", "issue_comment", "pr_comment"),
				allowNull: false,
				defaultValue: "pr_comment",
			},
			githubCreatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			githubUpdatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
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
			tableName: "pull_request_comments",
			timestamps: true,
		},
	)

	return PullRequestComment
}
