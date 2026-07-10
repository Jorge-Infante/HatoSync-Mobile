---
name: zip-creation
description: Use for creating zip deliverables, packaging bundles, and validating archive contents.
---

# Zip Creation Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `zip-creation` |
| **Name** | Archive Creation & Bundling |
| **Category** | Operations |
| **Complexity** | Low |
| **Plan Availability** | starter, pro, studio |

## Purpose

Create compressed archive bundles for software distribution, backup, and deployment. ZIP archives provide a simple, widely-compatible packaging format.

## Responsibilities

- Create ZIP archives from build artifacts
- Optimize compression settings
- Handle large file sets
- Maintain archive integrity
- Extract archives when needed
- Clean up temporary files

## Archive Creation

```typescript
interface ArchiveOptions {
  compressionLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  includeBaseDirectory: boolean;
  excludePatterns: string[];
  includePatterns: string[];
}

async function createZipArchive(
  sourcePaths: string[],
  outputPath: string,
  options: ArchiveOptions = defaultOptions
): Promise<ArchiveResult> {
  const archive = archiver('zip', {
    zlib: { level: options.compressionLevel }
  });

  const output = createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      resolve({
        path: outputPath,
        size: archive.pointer(),
        files: archive.tapped.length
      });
    });

    archive.on('error', reject);

    archive.pipe(output);

    for (const sourcePath of sourcePaths) {
      const stats = await fs.stat(sourcePath);

      if (stats.isDirectory()) {
        archive.directory(sourcePath, path.basename(sourcePath));
      } else {
        archive.file(sourcePath, { name: path.basename(sourcePath) });
      }
    }

    archive.finalize();
  });
}
```

## Compression Levels

| Level | Speed | Size | Use Case |
|-------|-------|------|----------|
| **1** | Fastest | Largest | Development builds |
| **5** | Balanced | Balanced | Default |
| **9** | Slowest | Smallest | Release distributions |

## CLI Usage

```bash
# Basic archive creation
zip -r release.zip ./dist

# Exclude files
zip -r release.zip ./dist \
  -x "*.map" \
  -x "node_modules/*" \
  -x ".git/*"

# High compression
zip -9 -r release.zip ./dist

# Create from multiple directories
zip -r release.zip ./backend ./frontend ./docs
```

## Archive Contents Verification

```bash
# List archive contents
unzip -l release.zip

# Test archive integrity
unzip -t release.zip

# Verify checksums
sha256sum release.zip
```

## Use Cases

### 1. Release Distribution

```bash
# Package release for distribution
zip -r "ebrisk-ai-office-v${VERSION}-linux-x64.zip" \
  ./dist \
  -x "*.map" \
  -x "node_modules/test/*"

# Add README
zip -r "ebrisk-ai-office-v${VERSION}-linux-x64.zip" \
  ./README.md
```

### 2. Backup Creation

```bash
# Backup configuration and data
zip -r "backup-$(date +%Y%m%d).zip" \
  ./config \
  ./data \
  -x "*.log"
```

### 3. Deployment Bundles

```bash
# Create deployment package
zip -r deploy.zip \
  ./dist \
  ./migrations \
  ./scripts/start.sh
```

## Archive Extraction

```bash
# Extract to current directory
unzip release.zip

# Extract to specific directory
unzip release.zip -d ./target

# Extract specific files
unzip release.zip "dist/*"

# Extract silently
unzip -q release.zip
```

## Large Archive Handling

```typescript
// Stream processing for large archives
async function createLargeArchive(
  sourceDir: string,
  outputPath: string
): Promise<void> {
  const archive = archiver('zip', {
    zlib: { level: 5 }
  });

  const stream = createReadStream(sourceDir);

  for await (const entry of stream) {
    archive.file(entry.path, {
      name: path.relative(sourceDir, entry.path)
    });
  }

  archive.pipe(createWriteStream(outputPath));
  await archive.finalize();
}
```

## Temporary File Cleanup

```bash
# Clean up after extraction
rm -f release.zip

# Clean up temporary files
find . -name "*.tmp" -delete
find . -name "*.bak" -delete
```

## Quality Criteria

- Archives must pass integrity test
- All required files must be included
- No excluded files should be present
- Checksums must be generated

## Events Consumed

- `build.completed`

## Events Emitted

- `archive.created`
- `archive.extracted`

## References

- `backend/src/agents/config/agent-personalities.ts` — Devin agent
- archiver npm package
