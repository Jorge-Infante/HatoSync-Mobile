---
name: packaging
description: Use for build packaging, release archives, distributable artifacts, and package metadata.
---

# Packaging Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `packaging` |
| **Name** | Software Packaging |
| **Category** | Operations |
| **Complexity** | Medium |
| **Plan Availability** | pro, studio |

## Purpose

Package software artifacts for distribution, deployment, and release. Packaging ensures consistent, reproducible builds that can be deployed reliably.

## Responsibilities

- Create and maintain build scripts
- Generate distribution artifacts
- Manage dependency versions
- Sign and verify packages
- Ensure reproducibility
- Handle multi-platform builds

## Package Types

| Type | Extension | Use Case |
|------|----------|----------|
| **Docker Image** | `.tar` | Container deployments |
| **npm Package** | `.tgz` | JavaScript libraries |
| **NuGet Package** | `.nupkg` | .NET libraries |
| **ZIP Archive** | `.zip` | Distribution bundles |
| **Helm Chart** | `.tgz` | Kubernetes deployments |

## Build Process

```typescript
interface BuildResult {
  artifacts: Artifact[];
  metadata: BuildMetadata;
  exitCode: number;
}

interface Artifact {
  name: string;
  path: string;
  size: number;
  checksum: string;
  platform?: string;
}

interface BuildMetadata {
  version: string;
  commit: string;
  buildNumber: number;
  timestamp: Date;
  builder: string;
}

async function buildPackage(config: BuildConfig): Promise<BuildResult> {
  // 1. Validate environment
  await validateEnvironment(config);

  // 2. Clean previous artifacts
  await cleanOutputDirectory();

  // 3. Run build steps
  await runBuildSteps(config.steps);

  // 4. Generate artifacts
  const artifacts = await generateArtifacts(config.formats);

  // 5. Sign artifacts (if required)
  await signArtifacts(artifacts);

  // 6. Create metadata
  const metadata = await createBuildMetadata();

  return { artifacts, metadata, exitCode: 0 };
}
```

## Docker Image Packaging

```dockerfile
# Multi-stage build for minimal image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
```

## npm Package Packaging

```json
// package.json
{
  "name": "@devzeros/ai-office-sdk",
  "version": "1.0.0",
  "description": "DevZeros AI Office SDK",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "pack": "npm pack"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

## Versioning Strategy

| Strategy | Format | Use Case |
|----------|--------|----------|
| **Semantic** | 1.2.3 | Public APIs |
| **Codebuild** | YYYYMMDD.HHMMSS | CI/CD builds |
| **Git Hash** | abc1234 | Debugging |

```typescript
// Semantic versioning
interface SemanticVersion {
  major: number; // Breaking changes
  minor: number; // New features (backward compatible)
  patch: number; // Bug fixes
  prerelease?: string; // alpha, beta, rc
}

function nextVersion(
  current: SemanticVersion,
  change: 'major' | 'minor' | 'patch'
): SemanticVersion {
  return {
    major: change === 'major' ? current.major + 1 : current.major,
    minor: change === 'major' ? 0 : change === 'minor' ? current.minor + 1 : current.minor,
    patch: change === 'patch' ? current.patch + 1 : 0
  };
}
```

## Artifact Verification

```bash
# Checksum verification
sha256sum artifact.tar.gz > artifact.tar.gz.sha256
sha256sum -c artifact.tar.gz.sha256

# Signature verification (if signed)
gpg --verify artifact.tar.gz.sig artifact.tar.gz
```

## Reproducible Builds

```dockerfile
# Pin base image version
FROM node:20.11.1-alpine3.19@sha256:abc123... AS builder

# Pin npm dependencies
COPY package-lock.json
RUN npm ci --only=production

# Use build arguments for consistency
ARG BUILD_DATE
ARG VCS_REF
LABEL org.label-schema.build-date=$BUILD_DATE
LABEL org.label-schema.vcs-ref=$VCS_REF
```

## Quality Criteria

- All artifacts must have checksums
- Build must be reproducible given same source
- Package metadata must be complete
- Version must follow semantic versioning

## Events Consumed

- `build.completed`
- `release.approved`

## Events Emitted

- `package.created`
- `package.signed`
- `package.verified`

## References

- `backend/src/agents/config/agent-personalities.ts` — Devin agent
