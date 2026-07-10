---
name: security
description: Application security including authentication, authorization, input validation, and OWASP compliance.
agent_ids: [jordan]
---

# Security Skill

Application security including authentication, authorization, input validation, and OWASP compliance.

## Authentication

### JWT Implementation
```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// Password hashing
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Token generation
function generateToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

// Token verification
function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
}
```

### Refresh Token
```typescript
interface RefreshToken {
  tokenId: string;
  userId: string;
  expiresAt: Date;
}

// Store refresh tokens in Redis with TTL
async function createRefreshToken(userId: string): Promise<string> {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign(
    { tokenId, sub: userId },
    process.env.REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  
  await redis.setex(`refresh:${tokenId}`, 7 * 24 * 60 * 60, userId);
  return token;
}
```

## Authorization

### RBAC Implementation
```typescript
enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

const permissions: Record<Role, string[]> = {
  [Role.ADMIN]: ['*'],
  [Role.USER]: ['read:own', 'write:own', 'delete:own'],
  [Role.GUEST]: ['read:public'],
};

function hasPermission(role: Role, action: string): boolean {
  const perms = permissions[role];
  return perms.includes('*') || perms.includes(action);
}

// Middleware
export const authorize = (...allowedActions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user as User;
    
    const hasAccess = allowedActions.some(action => 
      hasPermission(user.role, action)
    );
    
    if (!hasAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    
    next();
  };
};
```

## Input Validation

### Validation with Zod
```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100).optional(),
});

type CreateUser = z.infer<typeof userSchema>;

// In handler
const result = userSchema.safeParse(req.body);
if (!result.success) {
  res.status(400).json({ errors: result.error.errors });
  return;
}
```

### SQL Injection Prevention
```typescript
// Parameterized queries ONLY
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// NOT this - VULNERABLE TO SQL INJECTION
// db.query(`SELECT * FROM users WHERE id = ${userId}`)
```

## Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

## Security Checklist

```yaml
security_review:
  authentication:
    - password_hashing_bcrypt: true
    - jwt_with_expiry: true
    - refresh_tokens: true
    - token_in_http_only_cookie: true
  
  authorization:
    - rbac_implemented: true
    - resource_ownership_checked: true
    - principle_of_least_privilege: true
  
  input_validation:
    - all_user_input_validated: true
    - parameterized_queries_only: true
    - output_encoding: true
    - file_upload_validation: true
  
  infrastructure:
    - https_only: true
    - security_headers: true
    - rate_limiting: true
    - cors_configured: true
```
