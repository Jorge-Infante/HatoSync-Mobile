---
name: validation
description: Use for acceptance validation, input checks, invariants, and evidence-backed completion review.
---

# Validation Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `validation` |
| **Name** | Input Validation & Verification |
| **Category** | Quality Assurance |
| **Complexity** | Medium |
| **Plan Availability** | starter, pro, studio |

## Purpose

Ensure all inputs to the system are validated, sanitized, and verified before processing. Validation is the first line of defense against invalid data, security vulnerabilities, and system errors.

## Responsibilities

- Validate request payloads against schemas
- Sanitize user inputs to prevent injection attacks
- Verify data integrity and referential consistency
- Ensure business rules are enforced at entry points
- Provide clear, actionable error messages
- Create reusable validation utilities

## Validation Layers

### 1. Schema Validation

| Layer | Tool | Purpose |
|-------|------|---------|
| API Gateway | JSON Schema | Structure, types, required fields |
| Controller | Class-validator (NestJS) | DTO validation |
| Service | Pydantic (FastAPI) | Domain object validation |

### 2. Business Rule Validation

```typescript
// Example: Document upload validation
const uploadValidation = {
  fileSize: { max: 100 * 1024 * 1024 }, // 100MB
  allowedTypes: ['.pdf', '.docx', '.xlsx'],
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};
```

## Validation Patterns

### Centralized Validation Error Response

```typescript
// RFC 7807 Problem Details
{
  "type": "https://example.com/probs/validation",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The request body contains invalid fields",
  "errors": [
    { "field": "email", "message": "Must be a valid email address" },
    { "field": "tenantId", "message": "Tenant ID is required" }
  ]
}
```

### FluentValidation Example

```typescript
// C# FluentValidation
public class CreateDocumentCommandValidator : AbstractValidator<CreateDocumentCommand>
{
    public CreateDocumentCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(255).WithMessage("Title cannot exceed 255 characters");

        RuleFor(x => x.TenantId)
            .NotEmpty().WithMessage("Tenant ID is required");

        RuleFor(x => x.File)
            .NotNull().WithMessage("File is required")
            .Must(BeAValidFileType).WithMessage("Invalid file type");
    }
}
```

## Input Sanitization

| Input Type | Sanitization |
|------------|--------------|
| **SQL** | Parameterized queries (never string concatenation) |
| **XSS** | Output encoding, Content-Security-Policy |
| **Path Traversal** | Validate and sanitize file paths |
| **Command Injection** | Avoid shell execution, use safe APIs |
| **Email** | Regex validation + format verification |
| **URLs** | Protocol allowlist (https only) |

## Business Rule Validation

```typescript
// Example: Folder access validation
async function validateFolderAccess(
  folderId: Guid,
  userId: Guid,
  tenantId: Guid
): Promise<ValidationResult> {
  const errors: string[] = [];

  const folder = await folderRepository.getById(folderId);
  if (!folder) {
    errors.push(`Folder ${folderId} does not exist`);
  } else if (folder.tenantId !== tenantId) {
    errors.push('Folder does not belong to your organization');
  }

  const hasAccess = await accessControl.hasPermission(userId, folderId, 'read');
  if (!hasAccess) {
    errors.push('You do not have access to this folder');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

## Multitenancy Validation

```typescript
// Every request must validate tenant context
function validateTenantContext(context: RequestContext): ValidationResult {
  if (!context.tenantId) {
    return { isValid: false, errors: ['Tenant ID is required'] };
  }

  if (!isValidGuid(context.tenantId)) {
    return { isValid: false, errors: ['Invalid Tenant ID format'] };
  }

  return { isValid: true, errors: [] };
}
```

## Quality Criteria

- All public endpoints must have input validation
- Validation errors must return RFC 7807 Problem Details
- Business rules must be validated before database operations
- File uploads must validate size, type, and content
- Tenant context must be validated on every request

## Error Message Guidelines

| Rule | Example |
|------|---------|
| Specific | "Email must be a valid email address" |
| Actionable | "Provide a valid email address" |
| No Technical Details | Don't expose stack traces |
| Localized | Use i18n keys for user-facing errors |

## Events Consumed

- `validation.requested`

## Events Emitted

- `validation.passed`
- `validation.failed`

## References

- `backend/src/agents/config/agent-personalities.ts` — Casey agent
- OWASP Input Validation Guidelines
