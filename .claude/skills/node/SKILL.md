---
name: node
description: Node.js development with Express/Fastify, async patterns, middleware, and ecosystem best practices.
agent_ids: [jordan]
---

# Node.js Development Skill

Node.js development with Express/Fastify, async patterns, middleware, and ecosystem best practices.

## Project Structure

```
src/
├── app.ts                 # Express app setup
├── server.ts              # Server entry point
├── config/                # Configuration
│   └── index.ts
├── routes/                # Route definitions
│   ├── index.ts
│   └── users.routes.ts
├── controllers/           # Request handlers
│   └── users.controller.ts
├── services/              # Business logic
│   └── users.service.ts
├── repositories/          # Data access
│   └── users.repository.ts
├── middleware/            # Express middleware
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── models/                # TypeScript interfaces
│   └── user.model.ts
├── utils/                 # Utility functions
│   └── logger.ts
└── types/                 # Type declarations
```

## Express Setup

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error.middleware';
import { userRoutes } from './routes/users.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/users', userRoutes);

// Error handling
app.use(errorHandler);

export default app;
```

## Async Patterns

```typescript
// Handler with async/await
export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await userService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    next(error);
  }
};

// Service with proper error handling
export class UserService {
  async findById(id: string): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    if (!user) return null;
    return this.mapToUser(user);
  }
}
```

## Middleware Patterns

```typescript
// Authentication middleware
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Validation middleware factory
export const validate = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0].message });
      return;
    }
    next();
  };
};
```

## Error Handling

```typescript
// Custom error class
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
  });
};
```

## Node.js Checklist

```yaml
node_review:
  project_structure:
    - clear_separation_of_concerns: true
    - single_responsibility: true
    - barrel_exports_for_modules: true
  
  async_patterns:
    - no_callbacks: true
    - proper_await_usage: true
    - error_propagation: true
  
  security:
    - helmet_used: true
    - cors_configured: true
    - rate_limiting: true
    - input_validation: true
  
  performance:
    - connection_pooling: true
    - caching_strategy: true
    - compression_enabled: true
```
