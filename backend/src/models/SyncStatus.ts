import { DataTypes, Model, Sequelize } from "sequelize"

export interface SyncStatusAttributes {
	id?: number
	userId: number
	type: "repositories" | "issues" | "pull_requests"
	status: "pending" | "in_progress" | "completed" | "failed"
	progress: number // 0-100
	totalItems?: number
	processedItems?: number
	message?: string
	error?: string
	startedAt: Date
	completedAt?: Date
	createdAt?: Date
	updatedAt?: Date
}

export interface SyncStatusCreationAttributes
	extends Omit<SyncStatusAttributes, "id" | "startedAt" | "createdAt" | "updatedAt"> {
	startedAt?: Date
}

export class SyncStatus extends Model<SyncStatusAttributes, SyncStatusCreationAttributes> {
	// Remove public field declarations to avoid shadowing Sequelize's attribute getters & setters
	// The attributes will be available through the model instance without explicit declarations
}

export const initSyncStatusModel = (sequelize: Sequelize): typeof SyncStatus => {
	SyncStatus.init(
		{
			id: {
				type: DataTypes.INTEGER,
				autoIncrement: true,
				primaryKey: true,
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
			type: {
				type: DataTypes.ENUM("repositories", "issues", "pull_requests"),
				allowNull: false,
			},
			status: {
				type: DataTypes.ENUM("pending", "in_progress", "completed", "failed"),
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
			totalItems: {
				type: DataTypes.INTEGER,
				allowNull: true,
				field: "total_items",
			},
			processedItems: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
				field: "processed_items",
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
				defaultValue: DataTypes.NOW,
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
			modelName: "SyncStatus",
			tableName: "sync_statuses",
			timestamps: true,
			indexes: [
				{
					fields: ["user_id", "type", "status"],
				},
				{
					fields: ["status"],
				},
			],
		},
	)

	return SyncStatus
}

export default SyncStatus
