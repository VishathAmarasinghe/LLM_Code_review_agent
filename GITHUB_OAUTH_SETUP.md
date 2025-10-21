# GitHub OAuth Setup Guide

This guide will help you set up GitHub OAuth authentication for the Code Review Agent.

## Prerequisites

1. A GitHub account
2. MySQL database running locally
3. Node.js and npm/pnpm installed

## Step 1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the following details:
    - **Application name**: Code Review Agent
    - **Homepage URL**: `http://localhost:3000`
    - **Authorization callback URL**: `http://localhost:3001/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Environment Variables

### Backend Configuration

1. Copy the example environment file:

    ```bash
    cd code_review_agent/backend
    cp env.example .env
    ```

2. Update the `.env` file with your values:

    ```env
    # Database
    DB_HOST=localhost
    DB_PORT=3306
    DB_NAME=code_review_agent
    DB_USER=root
    DB_PASSWORD=your_mysql_password

    # Authentication
    JWT_SECRET=your_very_secure_jwt_secret_key_here
    SESSION_SECRET=your_very_secure_session_secret_key_here

    # GitHub OAuth
    GITHUB_CLIENT_ID=your_github_client_id_from_step_1
    GITHUB_CLIENT_SECRET=your_github_client_secret_from_step_1
    GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

    # OpenAI (optional)
    OPENAI_API_KEY=your_openai_api_key_here
    ```

### Frontend Configuration

1. Copy the example environment file:

    ```bash
    cd code_review_agent/frontend
    cp env.local.example .env.local
    ```

2. The `.env.local` file should contain:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:3001/api
    ```

## Step 3: Set Up the Database

1. Create the MySQL database:

    ```sql
    CREATE DATABASE code_review_agent;
    ```

2. Run the database initialization script:
    ```bash
    cd code_review_agent/backend
    npm run init-db
    ```

## Step 4: Install Dependencies

### Backend

```bash
cd code_review_agent/backend
npm install
```

### Frontend

```bash
cd code_review_agent/frontend
npm install
```

## Step 5: Start the Applications

### Start the Backend

```bash
cd code_review_agent/backend
npm run dev
```

The backend will start on `http://localhost:3001`

### Start the Frontend

```bash
cd code_review_agent/frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

## Step 6: Test the OAuth Flow

1. Open your browser and go to `http://localhost:3000`
2. Click "Sign in with GitHub"
3. You'll be redirected to GitHub for authorization
4. After authorizing, you'll be redirected back to the dashboard
5. Click "Sync Repositories" to load your GitHub repositories

## Features Implemented

### Authentication

- ✅ GitHub OAuth login/signup
- ✅ JWT token-based authentication
- ✅ Automatic token refresh
- ✅ Secure logout

### Repository Access

- ✅ View all GitHub repositories
- ✅ Sync repositories from GitHub
- ✅ Repository details (stars, forks, watchers)
- ✅ Language detection
- ✅ Private repository support
- ✅ Repository search and filtering

### API Endpoints

#### Authentication

- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - OAuth callback
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/sync-repos` - Sync user repositories

#### GitHub Integration

- `GET /api/github/repos` - Get user repositories
- `GET /api/github/repos/:owner/:repo` - Get specific repository
- `GET /api/github/repos/:owner/:repo/contents` - Get repository contents
- `GET /api/github/repos/:owner/:repo/file` - Get file content
- `GET /api/github/repos/:owner/:repo/languages` - Get repository languages
- `GET /api/github/repos/:owner/:repo/stats` - Get repository statistics

## Troubleshooting

### Common Issues

1. **"GitHub OAuth environment variables are not set"**

    - Make sure you've created the `.env` file in the backend directory
    - Verify the GitHub OAuth credentials are correct

2. **"Database connection failed"**

    - Ensure MySQL is running
    - Check database credentials in `.env`
    - Make sure the database exists

3. **"CORS error"**

    - Verify `CORS_ORIGIN` is set to `http://localhost:3000`
    - Check that both frontend and backend are running

4. **"Authentication failed"**
    - Check GitHub OAuth app settings
    - Verify callback URL matches exactly
    - Ensure JWT_SECRET is set

### Logs

Check the backend logs for detailed error messages:

```bash
cd code_review_agent/backend
npm run dev
```

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets for JWT_SECRET and SESSION_SECRET
- In production, use HTTPS for all URLs
- Regularly rotate your GitHub OAuth secrets
- Consider implementing rate limiting for API endpoints

## Next Steps

After successful setup, you can:

1. Customize the UI/UX
2. Add more GitHub API integrations
3. Implement code review features
4. Add user preferences and settings
5. Deploy to production
