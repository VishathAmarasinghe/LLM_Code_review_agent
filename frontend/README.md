# Code Review Agent - Frontend

Next.js web application for the Code Review Agent.

## Features

- Modern React 18 with Next.js 14
- TypeScript support
- Responsive design with Tailwind CSS
- Dark mode support
- Code editor with syntax highlighting
- Review results display
- Statistics dashboard
- Mobile-friendly interface

## Quick Start

1. Install dependencies:

    ```bash
    npm install
    ```

2. Start development server:
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:3000`

## Pages

- `/` - Home page with code editor and analysis
- `/reviews` - Review history
- `/stats` - Statistics dashboard
- `/docs` - Documentation

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## Project Structure

```
src/
├── app/             # Next.js app router pages
├── components/      # React components
│   ├── editor/      # Code editor components
│   ├── forms/       # Form components
│   ├── layout/      # Layout components
│   ├── review/      # Review display components
│   └── ui/          # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries
└── types/           # TypeScript type definitions
```

## Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```
