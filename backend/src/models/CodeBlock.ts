import { DataTypes, Model, Optional } from "sequelize"
import { createSequelizeInstance } from "../config/database"
import { Repository } from "./Repository"

export interface CodeBlockAttributes {
	id: string // UUID
	repositoryId: number
	filePath: string
	fileName: string
	fileExtension: string
	startLine: number
	endLine: number
	content: string
	blockType: "function" | "class" | "method" | "interface" | "type" | "variable" | "import" | "comment" | "other"
	identifier?: string
	language: string
	fileHash: string
	segmentHash: string
	vectorId?: string // Qdrant vector ID
	createdAt?: Date
	updatedAt?: Date
}

export interface CodeBlockCreationAttributes extends Optional<CodeBlockAttributes, "id" | "createdAt" | "updatedAt"> {}

export class CodeBlock extends Model<CodeBlockAttributes, CodeBlockCreationAttributes> implements CodeBlockAttributes {
	public id!: string
	public repositoryId!: number
	public filePath!: string
	public fileName!: string
	public fileExtension!: string
	public startLine!: number
	public endLine!: number
	public content!: string
	public blockType!:
		| "function"
		| "class"
		| "method"
		| "interface"
		| "type"
		| "variable"
		| "import"
		| "comment"
		| "other"
	public identifier?: string
	public language!: string
	public fileHash!: string
	public segmentHash!: string
	public vectorId?: string
	public readonly createdAt!: Date
	public readonly updatedAt!: Date

	// Associations
	public repository?: Repository

	public static associate() {
		CodeBlock.belongsTo(Repository, {
			foreignKey: "repositoryId",
			as: "repository",
		})
	}
}

export const initCodeBlockModel = (sequelize: ReturnType<typeof createSequelizeInstance>): typeof CodeBlock => {
	CodeBlock.init(
		{
			id: {
				type: DataTypes.UUID,
				defaultValue: DataTypes.UUIDV4,
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
			filePath: {
				type: DataTypes.STRING(500),
				allowNull: false,
				field: "file_path",
			},
			fileName: {
				type: DataTypes.STRING(500),
				allowNull: false,
				field: "file_name",
			},
			fileExtension: {
				type: DataTypes.STRING(20),
				allowNull: false,
				field: "file_extension",
			},
			startLine: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: "start_line",
			},
			endLine: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: "end_line",
			},
			content: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			blockType: {
				type: DataTypes.ENUM(
					"function",
					"class",
					"method",
					"interface",
					"type",
					"variable",
					"import",
					"comment",
					"other",
				),
				allowNull: false,
				field: "block_type",
			},
			identifier: {
				type: DataTypes.STRING(500),
				allowNull: true,
			},
			language: {
				type: DataTypes.STRING(50),
				allowNull: false,
			},
			fileHash: {
				type: DataTypes.STRING(64),
				allowNull: false,
				field: "file_hash",
			},
			segmentHash: {
				type: DataTypes.STRING(64),
				allowNull: false,
				field: "segment_hash",
			},
			vectorId: {
				type: DataTypes.STRING(100),
				allowNull: true,
				field: "vector_id",
			},
		},
		{
			sequelize,
			tableName: "code_blocks",
			timestamps: true,
			createdAt: "created_at",
			updatedAt: "updated_at",
			indexes: [
				{
					fields: ["repository_id"],
				},
				{
					fields: ["file_path"],
					// Note: MySQL prefix indexing is handled differently in Sequelize
				},
				{
					fields: ["file_hash"],
				},
				{
					fields: ["segment_hash"],
				},
				{
					fields: ["vector_id"],
				},
				{
					fields: ["block_type"],
				},
				{
					fields: ["language"],
				},
				{
					fields: ["repository_id", "file_path"],
					// Note: MySQL prefix indexing is handled differently in Sequelize
				},
			],
		},
	)

	return CodeBlock
}
