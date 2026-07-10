---
name: docs
description: Use for project documentation, runbooks, ADR updates, and user-facing technical writing.
---

# Docs Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `docs` |
| **Name** | Documentation |
| **Category** | Operations |
| **Complexity** | Medium |
| **Plan Availability** | starter, pro, studio |

## Purpose

Create, maintain, and improve technical and user documentation. Good documentation enables adoption, reduces support burden, and preserves institutional knowledge.

## Responsibilities

- Write and maintain API documentation
- Create user guides and tutorials
- Document architecture decisions (ADRs)
- Maintain README files and onboarding docs
- Update documentation with code changes
- Ensure documentation accuracy
- Manage documentation structure and organization

## Documentation Types

### 1. API Documentation

```yaml
# OpenAPI/Swagger
openapi: 3.0.0
info:
  title: DevZeros AI Office API
  version: 1.0.0
paths:
  /api/documents:
    post:
      summary: Create a new document
      tags:
        - Documents
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateDocumentRequest'
      responses:
        '201':
          description: Document created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Document'
        '400':
          $ref: '#/components/responses/ValidationError'
```

### 2. Architecture Decision Records (ADRs)

```markdown
# ADR-001: Use PostgreSQL with pgvector for Document Storage

## Status
Accepted

## Context
We need to store documents and their vector embeddings for RAG-based search.
The system should support semantic similarity search across document chunks.

## Decision
We will use PostgreSQL 16 with the pgvector extension.
- Store documents in `dms.documents` table
- Store embeddings in `dms.document_embeddings` with vector(1536) column
- Use HNSW index for similarity search

## Consequences
### Positive
- Single database for documents and vectors
- ACID compliance for vector operations
- SQL querying for hybrid search

### Negative
- Additional database extension to manage
- Vector storage increases database size

## Alternatives Considered
- Pinecone: Higher cost, external dependency
- Elasticsearch: More complex, separate from primary DB
```

### 3. User Guides

```markdown
# Document Upload Guide

## Prerequisites
- Valid tenant account
- Supported file types: PDF, DOCX, XLSX

## Steps
1. Navigate to the Documents section
2. Click the "Upload" button
3. Select your file(s)
4. Wait for processing to complete
5. Verify document appears in your folder

## Troubleshooting
- **Upload fails**: Check file size (max 100MB)
- **Processing takes long**: Large files may take several minutes
- **File not found**: Verify folder permissions
```

## Documentation Standards

| Element | Standard |
|---------|----------|
| **Format** | Markdown (MD) |
| **Code blocks** | Specify language |
| **Images** | Stored in `/docs/assets/` |
| **Links** | Relative within repo |
| **Diagrams** | Mermaid preferred |

## File Structure

```
docs/
├── api/
│   ├── openapi.yml
│   └── endpoints/
│       ├── documents.md
│       └── folders.md
├── architecture/
│   ├── adrs/
│   └── system-overview.md
├── user-guides/
│   ├── getting-started.md
│   └── document-upload.md
└── README.md
```

## Documentation as Code

```typescript
// Auto-generate API docs from route decorators
/**
 * @route POST /api/documents
 * @summary Create a new document
 * @tags Documents
 * @param {CreateDocumentRequest} request.body
 * @returns {Document} 201 - Document created
 * @returns {Error} 400 - Validation error
 */
router.post('/', documentController.create);
```

## Quality Checklist

- [ ] All public APIs documented
- [ ] Code examples are tested
- [ ] Screenshots are current
- [ ] Links are valid
- [ ] No placeholder text
- [ ] Consistent formatting

## Events Emitted

- `docs.updated`
- `docs.created`

## References

- `backend/src/agents/config/agent-personalities.ts` — Quinn agent
- Diátaxis Documentation Framework
