import { DataTypes, Model, Optional } from "sequelize"
import { createSequelizeInstance } from "../config/database"

export interface UserAttributes {
	id: number
	githubId: number
	username: string
	displayName: string
	email?: string
	avatarUrl: string
	profileUrl: string
	accessToken: string
	refreshToken?: string
	tokenExpiresAt?: Date
	lastLoginAt: Date
	createdAt?: Date
	updatedAt?: Date
}

export interface UserCreationAttributes extends Optional<UserAttributes, "id" | "createdAt" | "updatedAt"> {}

export class User extends Model<UserAttributes, UserCreationAttributes> {
	// Remove public class fields to avoid shadowing Sequelize's getters/setters
	// Access properties using .get() method or direct property access
}

User.init(
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
		username: {
			type: DataTypes.STRING(255),
			allowNull: false,
			unique: true,
		},
		displayName: {
			type: DataTypes.STRING(255),
			allowNull: false,
			field: "display_name",
		},
		email: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		avatarUrl: {
			type: DataTypes.TEXT,
			allowNull: false,
			field: "avatar_url",
		},
		profileUrl: {
			type: DataTypes.TEXT,
			allowNull: false,
			field: "profile_url",
		},
		accessToken: {
			type: DataTypes.TEXT,
			allowNull: false,
			field: "access_token",
		},
		refreshToken: {
			type: DataTypes.TEXT,
			allowNull: true,
			field: "refresh_token",
		},
		tokenExpiresAt: {
			type: DataTypes.DATE,
			allowNull: true,
			field: "token_expires_at",
		},
		lastLoginAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
			field: "last_login_at",
		},
	},
	{
		sequelize: createSequelizeInstance(),
		modelName: "User",
		tableName: "users",
		indexes: [
			{
				unique: true,
				fields: ["github_id"],
			},
			{
				unique: true,
				fields: ["username"],
			},
			{
				fields: ["email"],
			},
		],
	},
)

export default User
