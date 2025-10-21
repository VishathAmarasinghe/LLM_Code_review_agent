# Code Review Agent - Backend

Express.js API server for the Code Review Agent application.

## Features

- RESTful API for code analysis
- TypeScript support
- Request validation with Joi
- Comprehensive error handling
- Security middleware (Helmet, CORS, Rate limiting)
- Structured logging with Winston
- Health check endpoints
- Mock AI analysis service

## Quick Start

1. Install dependencies:

    ```bash
    npm install
    ```

2. Copy environment variables:

    ```bash
    cp env.example .env
    ```

3. Start development server:
    ```bash
    npm run dev
    ```

The API will be available at `http://localhost:3001`

## API Documentation

### Base URL

```
http://localhost:3001/api
```

### Endpoints

#### Health Check

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information

#### Code Review

- `POST /code-review/analyze` - Analyze code
- `GET /code-review/reviews` - Get all reviews
- `POST /code-review/reviews` - Create a new review
- `GET /code-review/stats` - Get review statistics

### Example Request

```bash
curl -X POST http://localhost:3001/api/code-review/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function hello() { console.log(\"Hello World\"); }",
    "language": "javascript",
    "reviewType": "comprehensive"
  }'
```

## Development

- `npm run dev` - Start with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
└── index.ts         # Application entry point
```
