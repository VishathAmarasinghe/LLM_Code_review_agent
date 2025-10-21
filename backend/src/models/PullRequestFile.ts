import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { PullRequest } from "./PullRequest"

export interface PullRequestFileAttributes {
	id: number
	pullRequestId: number
	filename: string
	status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged"
	additions: number
	deletions: number
	changes: number
	blobUrl?: string
	rawUrl?: string
	contentsUrl?: string
	patch?: string
	previousFilename?: string
	createdAt: Date
	updatedAt: Date
}

export interface PullRequestFileCreationAttributes
	extends Optional<PullRequestFileAttributes, "id" | "createdAt" | "updatedAt"> {}

export class PullRequestFile
	extends Model<PullRequestFileAttributes, PullRequestFileCreationAttributes>
	implements PullRequestFileAttributes
{
	public id!: number
	public pullRequestId!: number
	public filename!: string
	public status!: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged"
	public additions!: number
	public deletions!: number
	public changes!: number
	public blobUrl?: string
	public rawUrl?: string
	public contentsUrl?: string
	public patch?: string
	public previousFilename?: string
	public createdAt!: Date
	public updatedAt!: Date

	// Associations
	public pullRequest?: PullRequest

	public static associate(): void {
		PullRequestFile.belongsTo(PullRequest, {
			foreignKey: "pullRequestId",
			as: "pullRequest",
		})
	}
}

export const initPullRequestFileModel = (sequelize: any) => {
	PullRequestFile.init(
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
			filename: {
				type: DataTypes.STRING(500),
				allowNull: false,
			},
			status: {
				type: DataTypes.ENUM("added", "modified", "removed", "renamed", "copied", "changed", "unchanged"),
				allowNull: false,
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
			changes: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			blobUrl: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			rawUrl: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			contentsUrl: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			patch: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			previousFilename: {
				type: DataTypes.STRING(500),
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
			tableName: "pull_request_files",
			timestamps: true,
		},
	)

	return PullRequestFile
}
