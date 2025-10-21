import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { Repository } from "./Repository"

export interface WebhookEventAttributes {
	id: number
	repositoryId: number
	eventType: string
	action?: string
	githubEventId?: string
	payload: Record<string, any>
	processed: boolean
	processingError?: string
	deliveryId?: string
	signature?: string
	userAgent?: string
	githubDeliveredAt?: Date
	createdAt: Date
	updatedAt: Date
}

export interface WebhookEventCreationAttributes
	extends Optional<WebhookEventAttributes, "id" | "createdAt" | "updatedAt"> {}

export class WebhookEvent
	extends Model<WebhookEventAttributes, WebhookEventCreationAttributes>
	implements WebhookEventAttributes
{
	public id!: number
	public repositoryId!: number
	public eventType!: string
	public action?: string
	public githubEventId?: string
	public payload!: Record<string, any>
	public processed!: boolean
	public processingError?: string
	public deliveryId?: string
	public signature?: string
	public userAgent?: string
	public githubDeliveredAt?: Date
	public createdAt!: Date
	public updatedAt!: Date

	// Associations
	public repository?: Repository

	public static associate(): void {
		WebhookEvent.belongsTo(Repository, {
			foreignKey: "repositoryId",
			as: "repository",
		})
	}
}

export const initWebhookEventModel = (sequelize: any) => {
	WebhookEvent.init(
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
			eventType: {
				type: DataTypes.STRING(100),
				allowNull: false,
			},
			action: {
				type: DataTypes.STRING(100),
				allowNull: true,
			},
			githubEventId: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			payload: {
				type: DataTypes.JSON,
				allowNull: false,
			},
			processed: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			processingError: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			deliveryId: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			signature: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			userAgent: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			githubDeliveredAt: {
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
			tableName: "webhook_events",
			timestamps: true,
		},
	)

	return WebhookEvent
}
