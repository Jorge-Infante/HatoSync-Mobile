---
name: api-design
description: RESTful API design, GraphQL schemas, versioning strategies, and OpenAPI documentation.
agent_ids: [jordan]
---

# API Design Skill

RESTful API design, GraphQL schemas, versioning strategies, and OpenAPI documentation.

## RESTful Principles

### URL Structure
```
# Good
GET    /api/v1/users          # List users
GET    /api/v1/users/{id}     # Get user
POST   /api/v1/users          # Create user
PUT    /api/v1/users/{id}     # Update user
DELETE /api/v1/users/{id}     # Delete user

# Bad
GET /api/getUser
POST /api/createUser
```

### HTTP Methods
```yaml
GET:
  description: "Retrieve resource(s)"
  idempotent: true
  status_codes: [200, 404]

POST:
  description: "Create new resource"
  idempotent: false
  status_codes: [201, 400, 422]

PUT:
  description: "Replace resource (full update)"
  idempotent: true
  status_codes: [200, 400, 404, 422]

PATCH:
  description: "Partial update"
  idempotent: true
  status_codes: [200, 400, 404, 422]

DELETE:
  description: "Remove resource"
  idempotent: true
  status_codes: [204, 404]
```

### Response Format
```json
// Success
{
  "data": { },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}

// Error (RFC 7807)
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request body contains invalid fields",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

## OpenAPI Document Template

```yaml
openapi: 3.0.0
info:
  title: API Title
  version: 1.0.0
  description: API Description

paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
```

## Pagination Patterns

### Cursor-based (Preferred)
```yaml
pagination:
  type: cursor
  request:
    - cursor: "base64_encoded_cursor"
    - limit: 20
  response:
    - data: [...]
    - next_cursor: "base64_encoded_cursor"
    - has_more: true
```

### Offset-based
```yaml
pagination:
  type: offset
  request:
    - page: 1
    - per_page: 20
  response:
    - data: [...]
    - page: 1
    - per_page: 20
    - total: 100
    - total_pages: 5
```

## Versioning Strategy

```yaml
versioning:
  strategy: URL path
  format: /api/v{version}
  
  headers:
    strategy: Accept header
    header: Accept
    value: application/vnd.api+json;version=2
  
  deprecation:
    sunset_header: Deprecation
    sunset_date: "2026-12-31"
    alternative: "Use /api/v2/users"
```

## API Design Checklist

```yaml
api_review:
  url_design:
    - nouns_not_verbs: true
    - lowercase_with_hyphens: true
    - plural_resources: true
    - nested_resources_for_ownership: true
  
  status_codes:
    - 200_for_success: true
    - 201_for_created: true
    - 204_for_no_content: true
    - 400_for_client_error: true
    - 401_for_unauthorized: true
    - 403_for_forbidden: true
    - 404_for_not_found: true
    - 500_for_server_error: true
  
  documentation:
    - openapi_spec: true
    - examples_provided: true
    - error_responses_documented: true
```
