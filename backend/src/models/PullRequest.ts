import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { Repository } from "./Repository"
import { PullRequestFile } from "./PullRequestFile"
import { PullRequestComment } from "./PullRequestComment"
import { PullRequestReview } from "./PullRequestReview"

export interface PullRequestAttributes {
	id: number
	repositoryId: number
	githubPrId: number
	title: string
	body?: string
	state: "open" | "closed" | "merged"
	draft: boolean
	headRef: string
	baseRef: string
	headSha: string
	baseSha: string
	authorLogin: string
	authorName?: string
	authorEmail?: string
	authorAvatarUrl?: string
	htmlUrl: string
	diffUrl?: string
	patchUrl?: string
	additions: number
	deletions: number
	changedFiles: number
	commits: number
	reviewComments: number
	comments: number
	mergeable?: boolean
	rebaseable?: boolean
	labels?: Record<string, any>
	createdAt: Date
	updatedAt: Date
	closedAt?: Date
	mergedAt?: Date
	githubCreatedAt: Date
	githubUpdatedAt: Date
}

export interface PullRequestCreationAttributes
	extends Optional<PullRequestAttributes, "id" | "createdAt" | "updatedAt"> {}

export class PullRequest
	extends Model<PullRequestAttributes, PullRequestCreationAttributes>
	implements PullRequestAttributes
{
	public id!: number
	public repositoryId!: number
	public githubPrId!: number
	public title!: string
	public body?: string
	public state!: "open" | "closed" | "merged"
	public draft!: boolean
	public headRef!: string
	public baseRef!: string
	public headSha!: string
	public baseSha!: string
	public authorLogin!: string
	public authorName?: string
	public authorEmail?: string
	public authorAvatarUrl?: string
	public htmlUrl!: string
	public diffUrl?: string
	public patchUrl?: string
	public additions!: number
	public deletions!: number
	public changedFiles!: number
	public commits!: number
	public reviewComments!: number
	public comments!: number
	public mergeable?: boolean
	public rebaseable?: boolean
	public labels?: Record<string, any>
	public createdAt!: Date
	public updatedAt!: Date
	public closedAt?: Date
	public mergedAt?: Date
	public githubCreatedAt!: Date
	public githubUpdatedAt!: Date

	// Associations
	public repository?: Repository

	public static associate(): void {
		PullRequest.belongsTo(Repository, {
			foreignKey: "repositoryId",
			as: "repository",
		})

		// Child associations for eager loading with CASCADE delete
		PullRequest.hasMany(PullRequestFile, {
			foreignKey: "pullRequestId",
			as: "files",
			onDelete: "CASCADE",
			hooks: true,
		})
		PullRequest.hasMany(PullRequestComment, {
			foreignKey: "pullRequestId",
			as: "prComments",
			onDelete: "CASCADE",
			hooks: true,
		})
		PullRequest.hasMany(PullRequestReview, {
			foreignKey: "pullRequestId",
			as: "reviews",
			onDelete: "CASCADE",
			hooks: true,
		})
	}
}

export const initPullRequestModel = (sequelize: any) => {
	PullRequest.init(
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			repositoryId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: {
					model: "repositories",
					key: "id",
				},
			},
			githubPrId: {
				type: DataTypes.BIGINT,
				allowNull: false,
			},
			title: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			body: {
				type: DataTypes.TEXT("long"),
				allowNull: true,
			},
			state: {
				type: DataTypes.ENUM("open", "closed", "merged"),
				allowNull: false,
				defaultValue: "open",
			},
			draft: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			headRef: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			baseRef: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			headSha: {
				type: DataTypes.STRING(40),
				allowNull: false,
			},
			baseSha: {
				type: DataTypes.STRING(40),
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
				allowNull: false,
			},
			diffUrl: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			patchUrl: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			additions: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			deletions: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			changedFiles: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			commits: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			reviewComments: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			comments: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			mergeable: {
				type: DataTypes.BOOLEAN,
				allowNull: true,
			},
			rebaseable: {
				type: DataTypes.BOOLEAN,
				allowNull: true,
			},
			labels: {
				type: DataTypes.JSON,
				allowNull: true,
			},
			githubCreatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			githubUpdatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			closedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			mergedAt: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			createdAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
				field: "created_at",
			},
			updatedAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
				field: "updated_at",
			},
		},
		{
			sequelize,
			tableName: "pull_requests",
			timestamps: true,
			indexes: [
				{
					unique: true,
					fields: ["repository_id", "github_pr_id"],
					name: "unique_repository_pr",
				},
			],
		},
	)

	return PullRequest
}
