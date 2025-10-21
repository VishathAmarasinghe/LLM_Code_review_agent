# Code Review Agent

An AI-powered code review and analysis tool with a modern web interface.

## Project Structure

```
code_review_agent/
├── backend/          # Express.js API server
├── frontend/         # Next.js web application
└── README.md         # This file
```

## Features

- 🤖 AI-powered code analysis
- 🔍 Multiple review types (security, performance, style, comprehensive)
- 📊 Code quality metrics and statistics
- 🔐 GitHub OAuth authentication
- 📁 GitHub repository integration
- 🎨 Modern, responsive web interface
- 🌙 Dark mode support
- 📱 Mobile-friendly design
- 🔧 TypeScript support
- 🚀 Fast development setup

## Tech Stack

### Backend

- Node.js with Express.js
- TypeScript
- MySQL with Sequelize
- Passport.js for GitHub OAuth
- Express Sessions
- JWT Authentication
- Winston logging
- Joi validation
- Helmet security
- CORS support
- Rate limiting

### Frontend

- Next.js 14 with App Router
- React 18
- TypeScript
- Tailwind CSS
- Headless UI
- Heroicons
- React Hook Form
- Axios for API calls

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MySQL (local or cloud instance)
- GitHub OAuth App (for authentication)

### Backend Setup

1. Navigate to the backend directory:

    ```bash
    cd backend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Copy environment variables:

    ```bash
    cp env.example .env
    ```

4. Set up your GitHub OAuth App:

    - Go to GitHub Settings > Developer settings > OAuth Apps
    - Create a new OAuth App with:
        - Authorization callback URL: `http://localhost:3001/auth/github/callback`
    - Copy the Client ID and Client Secret to your `.env` file

5. Update your `.env` file with your GitHub OAuth credentials:

    ```env
    GITHUB_CLIENT_ID=your_github_client_id
    GITHUB_CLIENT_SECRET=your_github_client_secret
    JWT_SECRET=your_jwt_secret_key
    SESSION_SECRET=your_session_secret_key
    DB_HOST=localhost
    DB_PORT=3306
    DB_NAME=code_review_agent
    DB_USER=root
    DB_PASSWORD=your_mysql_password
    ```

6. Start MySQL (if running locally):

    ```bash
    # On macOS with Homebrew
    brew services start mysql

    # On Ubuntu/Debian
    sudo systemctl start mysql

    # On Windows
    net start mysql
    ```

7. Create the database:

    ```bash
    mysql -u root -p
    CREATE DATABASE code_review_agent;
    ```

8. Initialize database tables:

    ```bash
    npm run init-db
    ```

9. Start the development server:
    ```bash
    npm run dev
    ```

The backend API will be available at `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Copy environment variables:

    ```bash
    cp env.local.example .env.local
    ```

4. Start the development server:
    ```bash
    npm run dev
    ```

The frontend application will be available at `http://localhost:3000`

## API Endpoints

### Authentication

- `GET /auth/github` - Initiate GitHub OAuth login
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout user
- `POST /auth/sync-repos` - Sync user repositories

### GitHub Integration

- `GET /github/repos` - Get user repositories
- `GET /github/repos/:owner/:repo` - Get specific repository
- `GET /github/repos/:owner/:repo/contents` - Get repository contents
- `GET /github/repos/:owner/:repo/file` - Get file content
- `GET /github/repos/:owner/:repo/languages` - Get repository languages
- `GET /github/repos/:owner/:repo/stats` - Get repository statistics

### Health Check

- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system information
- `GET /api/health/ready` - Readiness check
- `GET /api/health/live` - Liveness check

### Code Review

- `POST /api/code-review/analyze` - Analyze code
- `GET /api/code-review/reviews` - Get all reviews
- `GET /api/code-review/reviews/:id` - Get specific review
- `POST /api/code-review/reviews` - Create a new review
- `PUT /api/code-review/reviews/:id` - Update a review
- `DELETE /api/code-review/reviews/:id` - Delete a review
- `POST /api/code-review/batch` - Batch analyze multiple files
- `GET /api/code-review/stats` - Get review statistics

## Environment Variables

### Backend (.env)

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=code_review_agent
DB_USER=root
DB_PASSWORD=your_mysql_password

# Authentication
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Development

### Backend Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Frontend Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run tests

## Deployment

Both frontend and backend can be deployed independently:

### Backend Deployment

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Set environment variables for production

### Frontend Deployment

1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Or deploy to Vercel, Netlify, or other platforms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
