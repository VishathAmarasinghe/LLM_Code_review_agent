import { createSequelizeInstance } from "../config/database"
import User from "./User"
import Repository, { setupAssociations } from "./Repository"
import { SyncStatus, initSyncStatusModel } from "./SyncStatus"
import { IndexingJob, initIndexingJobModel } from "./IndexingJob"
import { CodeBlock, initCodeBlockModel } from "./CodeBlock"
import { IndexingConfiguration, initIndexingConfigurationModel } from "./IndexingConfiguration"
import { PullRequest, initPullRequestModel } from "./PullRequest"
import { PullRequestFile, initPullRequestFileModel } from "./PullRequestFile"
import { PullRequestComment, initPullRequestCommentModel } from "./PullRequestComment"
import { PullRequestReview, initPullRequestReviewModel } from "./PullRequestReview"
import { WebhookEvent, initWebhookEventModel } from "./WebhookEvent"

// Ensure Sequelize instance is created before initializing models
const sequelize = createSequelizeInstance()

// Initialize models
const SyncStatusModel = initSyncStatusModel(sequelize)
const IndexingJobModel = initIndexingJobModel(sequelize)
const CodeBlockModel = initCodeBlockModel(sequelize)
const IndexingConfigurationModel = initIndexingConfigurationModel(sequelize)
const PullRequestModel = initPullRequestModel(sequelize)
const PullRequestFileModel = initPullRequestFileModel(sequelize)
const PullRequestCommentModel = initPullRequestCommentModel(sequelize)
const PullRequestReviewModel = initPullRequestReviewModel(sequelize)
const WebhookEventModel = initWebhookEventModel(sequelize)

// Setup model associations
setupAssociations()

// Setup new model associations
IndexingJob.associate()
CodeBlock.associate()
IndexingConfiguration.associate()
PullRequest.associate()
PullRequestFile.associate()
PullRequestComment.associate()
PullRequestReview.associate()
WebhookEvent.associate()

export {
	User,
	Repository,
	SyncStatus,
	IndexingJob,
	CodeBlock,
	IndexingConfiguration,
	PullRequest,
	PullRequestFile,
	PullRequestComment,
	PullRequestReview,
	WebhookEvent,
	sequelize,
}
