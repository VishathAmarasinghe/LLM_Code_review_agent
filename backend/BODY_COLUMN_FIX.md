# Body Column Size Fix

## Problem

The application was encountering the following error when syncing pull requests from GitHub:

```
error: [Sync] Error processing individual PR Data too long for column 'body' at row 1
```

This occurred because PR descriptions, comments, and reviews can sometimes be very large (containing extensive documentation, release notes, etc.), and the database columns were using MySQL's `TEXT` type which has a maximum limit of 65,535 bytes.

## Solution

Changed all `body` columns from `TEXT` to `LONGTEXT` in MySQL, which supports up to 4GB of text data.

### Files Modified

1. **`src/models/PullRequest.ts`** - Changed `body` field type to `DataTypes.TEXT('long')`
2. **`src/models/PullRequestComment.ts`** - Changed `body` field type to `DataTypes.TEXT('long')`
3. **`src/models/PullRequestReview.ts`** - Changed `body` field type to `DataTypes.TEXT('long')`

### Migration Script

Created `src/scripts/migrate-body-columns-to-longtext.ts` to alter existing database tables:

- `pull_requests.body` → LONGTEXT
- `pull_request_comments.body` → LONGTEXT
- `pull_request_reviews.body` → LONGTEXT

### Usage

To run the migration on a new database or after pulling these changes:

```bash
npm run migrate-body-columns
```

### Verification

The migration was successfully applied and verified. All body columns now have:

- **Data Type**: `longtext`
- **Max Length**: 4,294,967,295 bytes (4GB)

## Impact

- ✅ Fixes the "Data too long for column 'body'" error
- ✅ Allows syncing of PRs with very large descriptions
- ✅ Supports large comments and review bodies
- ✅ No data loss - existing data is preserved during column type change
- ✅ Backward compatible - no breaking changes to the API

## Testing

After this fix, you should be able to successfully sync the PR that was previously failing:

- Repository: `VishathAmarasinghe/axios_LLM_Dataset`
- PR: #1

The sync process will now handle PRs with large body content without errors.
