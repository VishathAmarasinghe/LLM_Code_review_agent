import { DataTypes, Model, Optional } from "sequelize"
import { createSequelizeInstance } from "../config/database"
import { Repository } from "./Repository"
import { User } from "./User"

export interface IndexingJobAttributes {
	id: number
	repositoryId: number
	userId: number
	status: "pending" | "running" | "completed" | "failed" | "cancelled"
	progress: number // 0-100
	totalFiles: number
	processedFiles: number
	totalBlocks: number
	indexedBlocks: number
	stage: "initializing" | "scanning" | "parsing" | "embedding" | "storing" | "completed"
	message?: string
	error?: string
	startedAt: Date
	completedAt?: Date
	createdAt?: Date
	updatedAt?: Date
}

export interface IndexingJobCreationAttributes
	extends Optional<IndexingJobAttributes, "id" | "createdAt" | "updatedAt"> {}

export class IndexingJob
	extends Model<IndexingJobAttributes, IndexingJobCreationAttributes>
	implements IndexingJobAttributes
{
	public id!: number
	public repositoryId!: number
	public userId!: number
	public status!: "pending" | "running" | "completed" | "failed" | "cancelled"
	public progress!: number
	public totalFiles!: number
	public processedFiles!: number
	public totalBlocks!: number
	public indexedBlocks!: number
	public stage!: "initializing" | "scanning" | "parsing" | "embedding" | "storing" | "completed"
	public message?: string
	public error?: string
	public startedAt!: Date
	public completedAt?: Date
	public readonly createdAt!: Date
	public readonly updatedAt!: Date

	// Associations
	public repository?: Repository
	public user?: User

	public static associate() {
		IndexingJob.belongsTo(Repository, {
			foreignKey: "repositoryId",
			as: "repository",
		})

		IndexingJob.belongsTo(User, {
			foreignKey: "userId",
			as: "user",
		})
	}
}

export const initIndexingJobModel = (sequelize: ReturnType<typeof createSequelizeInstance>): typeof IndexingJob => {
	IndexingJob.init(
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			repositoryId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: "repository_id",
				references: {
					model: "repositories",
					key: "id",
				},
				onDelete: "CASCADE",
			},
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: "user_id",
				references: {
					model: "users",
					key: "id",
				},
				onDelete: "CASCADE",
			},
			status: {
				type: DataTypes.ENUM("pending", "running", "completed", "failed", "cancelled"),
				allowNull: false,
				defaultValue: "pending",
			},
			progress: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
				validate: {
					min: 0,
					max: 100,
				},
			},
			totalFiles: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			processedFiles: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			totalBlocks: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			indexedBlocks: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			stage: {
				type: DataTypes.ENUM("initializing", "scanning", "parsing", "embedding", "storing", "completed"),
				allowNull: false,
				defaultValue: "initializing",
			},
			message: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			error: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			startedAt: {
				type: DataTypes.DATE,
				allowNull: false,
				field: "started_at",
			},
			completedAt: {
				type: DataTypes.DATE,
				allowNull: true,
				field: "completed_at",
			},
		},
		{
			sequelize,
			tableName: "indexing_jobs",
			timestamps: true,
			createdAt: "created_at",
			updatedAt: "updated_at",
			indexes: [
				{
					fields: ["repository_id"],
				},
				{
					fields: ["user_id"],
				},
				{
					fields: ["status"],
				},
				{
					fields: ["created_at"],
				},
			],
		},
	)

	return IndexingJob
}
