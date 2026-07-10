---
name: db
description: PostgreSQL database design, query optimization, indexing strategies, and migration management.
agent_ids: [jordan]
---

# Database Skill

PostgreSQL database design, query optimization, indexing strategies, and migration management.

## Schema Design

### Tables
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

### Relationships
```sql
-- One-to-Many
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Many-to-Many (junction table)
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

## Query Optimization

### Explain Analyze
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 20;
```

### Index Types
```sql
-- B-tree (default, for equality/range)
CREATE INDEX idx_users_created_at ON users(created_at);

-- Partial index (smaller, faster)
CREATE INDEX idx_users_active ON users(email) 
WHERE deleted_at IS NULL;

-- Composite index (for multi-column queries)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- GIN (for JSON/hstore)
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);
```

### Query Patterns
```sql
-- Use EXISTS instead of IN for subqueries
EXISTS (SELECT 1 FROM orders WHERE user_id = users.id)

-- Use UNION ALL when possible (no deduplication)
UNION ALL -- faster than UNION

-- Avoid SELECT *
SELECT id, email FROM users  -- only needed columns
```

## Migration Management

### Naming Convention
```
V{YYYYMMDDHHMM}__{description}.sql
V202603231200__add_user_roles_table.sql
```

### Migration Template
```sql
-- Migration: V202603231200__add_user_roles_table.sql

--rollback: DROP TABLE IF EXISTS user_roles;

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Comment
COMMENT ON TABLE user_roles IS 'Junction table for users and roles many-to-many relationship';
```

## Database Checklist

```yaml
db_review:
  schema:
    - primary_keys_uuid: true
    - timestamps_with_timezone: true
    - soft_deletes: true
    - version_column: true
    - audit_columns: true
  
  indexes:
    - foreign_keys_indexed: true
    - high_cardinality_indexed: true
    - partial_indexes_for_filtered_queries: true
    - no_redundant_indexes: true
  
  queries:
    - explain_analyze: true
    - no_select_star: true
    - parameterized_queries: true
    - batch_operations: true
```
