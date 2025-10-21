import { DataTypes, Model, Optional, JSON } from "sequelize"
import { createSequelizeInstance } from "../config/database"
import { User } from "./User"

export interface RepositoryAttributes {
	id: number
	githubId: number
	name: string
	fullName: string
	ownerLogin: string
	ownerId: number
	ownerAvatarUrl: string
	ownerType: string
	description?: string
	language?: string
	languages?: Record<string, number>
	url: string
	cloneUrl: string
	sshUrl: string
	htmlUrl: string
	defaultBranch: string
	isPrivate: boolean
	isFork: boolean
	forksCount: number
	starsCount: number
	watchersCount: number
	size: number
	repoCreatedAt: Date
	repoUpdatedAt: Date
	repoPushedAt: Date
	userId: number
	lastSyncedAt: Date
	createdAt?: Date
	updatedAt?: Date
}

export interface RepositoryCreationAttributes
	extends Optional<RepositoryAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Repository
	extends Model<RepositoryAttributes, RepositoryCreationAttributes>
	implements RepositoryAttributes
{
	public id!: number
	public githubId!: number
	public name!: string
	public fullName!: string
	public ownerLogin!: string
	public ownerId!: number
	public ownerAvatarUrl!: string
	public ownerType!: string
	public description?: string
	public language?: string
	public languages?: Record<string, number>
	public url!: string
	public cloneUrl!: string
	public sshUrl!: string
	public htmlUrl!: string
	public defaultBranch!: string
	public isPrivate!: boolean
	public isFork!: boolean
	public forksCount!: number
	public starsCount!: number
	public watchersCount!: number
	public size!: number
	public repoCreatedAt!: Date
	public repoUpdatedAt!: Date
	public repoPushedAt!: Date
	public userId!: number
	public lastSyncedAt!: Date
	public readonly createdAt!: Date
	public readonly updatedAt!: Date
}

Repository.init(
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		githubId: {
			type: DataTypes.BIGINT,
			allowNull: false,
			unique: true,
			field: "github_id",
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		fullName: {
			type: DataTypes.STRING(255),
			allowNull: false,
			unique: true,
			field: "full_name",
		},
		ownerLogin: {
			type: DataTypes.STRING(255),
			allowNull: false,
			field: "owner_login",
		},
		ownerId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: "owner_id",
		},
		ownerAvatarUrl: {
			type: DataTypes.TEXT,
			allowNull: false,
			field: "owner_avatar_url",
		},
		ownerType: {
			type: DataTypes.STRING(50),
			allowNull: false,
			field: "owner_type",
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		language: {
			type: DataTypes.STRING(100),
			allowNull: true,
		},
		languages: {
			type: DataTypes.JSON,
			allowNull: true,
		},
		url: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		cloneUrl: {
			type: DataTypes.TEXT,
			allowNull: false,
			field: "clone_url",
		},
		sshUrl: {
			type: DataTypes.TEXT,
			allowNull: false,
			field: "ssh_url",
		},
		htmlUrl: {
			type: DataTypes.TEXT,
			allowNull: false,
			field: "html_url",
		},
		defaultBranch: {
			type: DataTypes.STRING(100),
			allowNull: false,
			defaultValue: "main",
			field: "default_branch",
		},
		isPrivate: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: "is_private",
		},
		isFork: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: "is_fork",
		},
		forksCount: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
			field: "forks_count",
		},
		starsCount: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
			field: "stars_count",
		},
		watchersCount: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
			field: "watchers_count",
		},
		size: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		repoCreatedAt: {
			type: DataTypes.DATE,
			allowNull: false,
			field: "repo_created_at",
		},
		repoUpdatedAt: {
			type: DataTypes.DATE,
			allowNull: false,
			field: "repo_updated_at",
		},
		repoPushedAt: {
			type: DataTypes.DATE,
			allowNull: false,
			field: "repo_pushed_at",
		},
		userId: {
			type: DataTypes.INTEGER,
			allowNull: false,
			field: "user_id",
			references: {
				model: "users",
				key: "id",
			},
		},
		lastSyncedAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
			field: "last_synced_at",
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
		sequelize: createSequelizeInstance(),
		modelName: "Repository",
		tableName: "repositories",
		indexes: [
			{
				unique: true,
				fields: ["github_id"],
			},
			{
				fields: ["user_id"],
			},
			{
				fields: ["language"],
			},
		],
	},
)

// Define associations
export const setupAssociations = () => {
	Repository.belongsTo(User, {
		foreignKey: "userId",
		as: "user",
	})

	User.hasMany(Repository, {
		foreignKey: "userId",
		as: "repositories",
	})
}

export default Repository
