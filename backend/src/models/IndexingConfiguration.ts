import { DataTypes, Model, Optional } from "sequelize"
import { createSequelizeInstance } from "../config/database"
import { User } from "./User"

export interface IndexingConfigurationAttributes {
	id: number
	userId: number
	openaiApiKey: string // Encrypted
	qdrantUrl: string
	qdrantApiKey?: string // Encrypted
	embeddingModel: string
	maxFileSize: number
	batchSize: number
	maxConcurrentJobs: number
	isEnabled: boolean
	createdAt?: Date
	updatedAt?: Date
}

export interface IndexingConfigurationCreationAttributes
	extends Optional<IndexingConfigurationAttributes, "id" | "createdAt" | "updatedAt"> {}

export class IndexingConfiguration
	extends Model<IndexingConfigurationAttributes, IndexingConfigurationCreationAttributes>
	implements IndexingConfigurationAttributes
{
	public id!: number
	public userId!: number
	public openaiApiKey!: string
	public qdrantUrl!: string
	public qdrantApiKey?: string
	public embeddingModel!: string
	public maxFileSize!: number
	public batchSize!: number
	public maxConcurrentJobs!: number
	public isEnabled!: boolean
	public readonly createdAt!: Date
	public readonly updatedAt!: Date

	// Associations
	public user?: User

	public static associate() {
		IndexingConfiguration.belongsTo(User, {
			foreignKey: "userId",
			as: "user",
		})
	}
}

export const initIndexingConfigurationModel = (
	sequelize: ReturnType<typeof createSequelizeInstance>,
): typeof IndexingConfiguration => {
	IndexingConfiguration.init(
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
				unique: true, // One configuration per user
			},
			openaiApiKey: {
				type: DataTypes.TEXT,
				allowNull: false,
				field: "openai_api_key",
			},
			qdrantUrl: {
				type: DataTypes.STRING(500),
				allowNull: false,
				field: "qdrant_url",
				defaultValue: "http://localhost:6333",
			},
			qdrantApiKey: {
				type: DataTypes.TEXT,
				allowNull: true,
				field: "qdrant_api_key",
			},
			embeddingModel: {
				type: DataTypes.STRING(100),
				allowNull: false,
				field: "embedding_model",
				defaultValue: "text-embedding-3-small",
			},
			maxFileSize: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: "max_file_size",
				defaultValue: 1048576, // 1MB
			},
			batchSize: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: "batch_size",
				defaultValue: 100,
			},
			maxConcurrentJobs: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: "max_concurrent_jobs",
				defaultValue: 3,
			},
			isEnabled: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				field: "is_enabled",
				defaultValue: true,
			},
		},
		{
			sequelize,
			tableName: "indexing_configurations",
			timestamps: true,
			createdAt: "created_at",
			updatedAt: "updated_at",
			indexes: [
				{
					fields: ["user_id"],
					unique: true,
				},
				{
					fields: ["is_enabled"],
				},
			],
		},
	)

	return IndexingConfiguration
}
