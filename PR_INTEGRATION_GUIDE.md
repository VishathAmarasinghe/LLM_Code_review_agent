# Pull Request Integration Guide

This guide explains the complete pull request integration system implemented in the Code Review Agent.

## Overview

The PR integration system automatically detects and displays pull requests from GitHub repositories. It includes:

- **Automatic PR Detection**: Webhooks automatically notify the system when PRs are created, updated, or closed
- **Manual Sync**: Users can manually sync PRs from GitHub repositories
- **Real-time Updates**: WebSocket notifications for live PR updates
- **Comprehensive PR Data**: Files, comments, reviews, and statistics
- **Search and Filtering**: Advanced search and filtering capabilities

## Architecture

### Backend Components

#### Database Models

- **PullRequest**: Main PR data including title, body, state, branches, author info
- **PullRequestFile**: Files changed in the PR with additions/deletions
- **PullRequestComment**: Comments on PRs (issue comments, review comments)
- **PullRequestReview**: Code reviews with approval status
- **WebhookEvent**: Raw webhook events for debugging and reprocessing

#### Services

- **PullRequestService**: Core PR operations, GitHub API integration
- **WebhookService**: Webhook signature verification and event processing

#### API Endpoints

- `GET /api/repositories/:id/pull-requests` - List PRs for a repository
- `GET /api/pull-requests/:id` - Get detailed PR information
- `POST /api/repositories/:id/pull-requests/sync` - Sync all PRs for a repository
- `POST /api/repositories/:id/pull-requests/:number/sync` - Sync specific PR
- `GET /api/repositories/:id/pull-requests/stats` - Get PR statistics
- `GET /api/repositories/:id/pull-requests/search` - Search PRs with filters
- `POST /api/webhooks/github` - GitHub webhook endpoint
- `GET /api/webhooks/test` - Test webhook endpoint

### Frontend Components

#### Pages

- `/pull-requests` - Global PR dashboard across all repositories
- `/repositories/[id]/pull-requests` - Repository-specific PR list

#### Components

- **PullRequestCard**: Individual PR display with expandable details
- **PullRequestList**: List of PRs with search, filtering, and pagination
- **PullRequestStats**: Statistics and metrics display

#### Features

- Real-time search and filtering
- Pagination and infinite scroll
- Statistics dashboard
- Direct GitHub integration
- Responsive design with dark mode

## Setup Instructions

### 1. Environment Configuration

Add these environment variables to your `.env` file:

```env
# GitHub Webhook Secret (optional but recommended)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# GitHub Token (already configured for OAuth)
GITHUB_TOKEN=your_github_token_here
```

### 2. Database Setup

The PR tables will be automatically created when you run the database initialization:

```bash
cd code_review_agent/backend
npm run init-db
```

### 3. GitHub Webhook Configuration

1. Go to your GitHub repository settings
2. Navigate to "Webhooks" section
3. Click "Add webhook"
4. Set the following:
    - **Payload URL**: `https://your-domain.com/api/webhooks/github`
    - **Content type**: `application/json`
    - **Secret**: Your webhook secret from environment variables
    - **Events**: Select "Pull requests" and "Issue comments"
    - **Active**: Check this box

### 4. Start the Application

```bash
# Backend
cd code_review_agent/backend
npm run dev

# Frontend
cd code_review_agent/frontend
npm run dev
```

## Usage

### For Users

1. **Sign in** with GitHub OAuth
2. **Sync repositories** from the dashboard
3. **View PRs** in two ways:
    - Global view: Navigate to "Pull Requests" in the header
    - Repository view: Go to a repository and click "Pull Requests"
4. **Search and filter** PRs using the search bar and filters
5. **Manual sync** if webhooks aren't configured

### For Developers

#### Manual PR Sync

```javascript
// Sync all PRs for a repository
await pullRequestApi.syncPullRequests(repositoryId)

// Sync a specific PR
await pullRequestApi.syncPullRequest(repositoryId, prNumber)
```

#### Webhook Testing

```bash
# Test webhook endpoint
curl -X GET http://localhost:3001/api/webhooks/test
```

## API Reference

### Pull Request Operations

#### Get Pull Requests

```http
GET /api/repositories/{repositoryId}/pull-requests?state=open&limit=50&offset=0
```

#### Get Pull Request Details

```http
GET /api/pull-requests/{pullRequestId}
```

#### Search Pull Requests

```http
GET /api/repositories/{repositoryId}/pull-requests/search?q=bug&author=username&state=open
```

#### Get PR Statistics

```http
GET /api/repositories/{repositoryId}/pull-requests/stats
```

### Webhook Events

The system handles these GitHub webhook events:

- `pull_request`: PR created, updated, closed, merged
- `issue_comment`: Comments on PRs
- `pull_request_review`: Code reviews
- `pull_request_review_comment`: Review comments

## Security

### Webhook Signature Verification

- All webhooks are verified using HMAC-SHA256 signatures
- Configure `GITHUB_WEBHOOK_SECRET` environment variable
- Invalid signatures are rejected with 401 status

### Authentication

- All API endpoints require GitHub OAuth authentication
- Users can only access PRs from repositories they have access to
- Repository ownership is verified for all operations

## Troubleshooting

### Common Issues

1. **Webhooks not working**

    - Check webhook URL is accessible
    - Verify webhook secret matches environment variable
    - Check webhook events are properly configured

2. **PRs not syncing**

    - Ensure GitHub token has proper permissions
    - Check repository access permissions
    - Verify network connectivity to GitHub API

3. **Database errors**
    - Run `npm run init-db` to create missing tables
    - Check database connection configuration
    - Verify MySQL is running

### Debugging

#### Check Webhook Events

```http
GET /api/repositories/{repositoryId}/webhooks/events
```

#### Reprocess Failed Webhooks

```http
POST /api/webhooks/events/{eventId}/reprocess
```

#### View Logs

```bash
# Backend logs
tail -f code_review_agent/backend/logs/combined.log

# Error logs
tail -f code_review_agent/backend/logs/error.log
```

## Performance Considerations

- **Rate Limiting**: GitHub API has rate limits (5000 requests/hour for authenticated users)
- **Pagination**: PR lists are paginated to handle large repositories
- **Async Processing**: Webhook processing is asynchronous to avoid timeouts
- **Caching**: PR data is cached in the database to reduce API calls

## Future Enhancements

- Real-time WebSocket notifications for live PR updates
- PR diff visualization
- Integration with code review workflows
- Automated PR analysis and suggestions
- Team collaboration features
- PR templates and automation

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify your GitHub permissions and webhook configuration
4. Ensure all environment variables are properly set

## License

This PR integration system is part of the Code Review Agent project and follows the same MIT license.
