# Claude Mobile Coding Agent

Welcome to the Global Safety Solution frontend project. This document contains the setup instructions, coding standards, and development rules you must follow.

## 🚀 Quick Setup

To start development, you need to set up the environment and understand the project structure.

### Environment Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## 📁 Project Structure

The frontend uses Next.js with App Router.

```
apps/frontend/
├── src/
│   ├── app/              # Next.js App Router routes
│   │   ├── dashboard/    # Dashboard pages
│   │   └── auth/         # Authentication pages
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utility functions and helpers
│   │   ├── api.ts        # API client configuration
│   │   ├── auth.ts       # Authentication utilities
│   │   ├── utils.ts      # General utilities
│   │   └── constants.ts  # Constants and enums
│   ├── services/         # Business logic services
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
├── .env.local            # Environment variables
└── next.config.js        # Next.js configuration
```

## 🛠️ Coding Standards

### TypeScript

- Always use TypeScript for new files
- Use strict type checking
- Prefer interfaces over type aliases for component props
- Use discriminated unions for state management

### Component Design

- Components should be functional and use React Hooks
- Use TypeScript for component props
- Keep components focused and reusable
- Use `shadcn/ui` components when available
- Use Tailwind CSS for styling

### State Management

- Use Zustand for global state management
- Keep stores focused on a single responsibility
- Use middleware for common patterns (e.g., persist)
- Use middleware for common patterns (e.g., persist)

### API Client

- Use the provided API client in `src/lib/api.ts`
- Use `axios` for HTTP requests
- Handle authentication using token from `localStorage`
- Use `try/catch` blocks for error handling

### Authentication

- Use `src/lib/auth.ts` for authentication utilities
- Token is stored in `localStorage`
- Use interceptors for token management
- Use helper functions for checking auth state

## 🛡️ Security Requirements

- Always validate and sanitize user input
- Use prepared statements for database queries
- Implement proper error handling and logging
- Never expose sensitive information in logs
- Use environment variables for sensitive configuration
- Enforce proper authentication and authorization

## 🏗️ Development Workflow

1.  Understand the task from the user request
2.  Identify relevant components and services
3.  Implement the changes with proper TypeScript types
4.  Test the changes thoroughly
5.  Update any necessary documentation

## 📝 File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Pages**: PascalCase or kebab-case (e.g., `DashboardPage.tsx`, `user-profile.tsx`)
- **Services**: camelCase (e.g., `userService.ts`)
- **Stores**: camelCase (e.g., `userStore.ts`)
- **Utils**: camelCase (e.g., `formatters.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)

## 📚 Useful Resources

- **Next.js Documentation**: https://nextjs.org/docs
- **React Documentation**: https://react.dev/docs
- **Zustand Documentation**: https://github.com/pmndrs/zustand
- **Shadcn/UI**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
