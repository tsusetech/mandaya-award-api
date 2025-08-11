# Status Progress Migration

## Overview
This migration removes status-related fields from `ResponseSession` and `Review` models and centralizes all status tracking through the `StatusProgress` system.

## Changes Made

### 1. Database Schema Changes (prisma/schema.prisma)

#### ResponseSession Model
- **Removed**: `status` field (was: 'draft', 'in_progress', 'paused', 'completed', 'submitted')
- **Removed**: `reviewStatus` field (was: 'pending', 'approved', 'rejected', 'needs_revision')
- **Removed**: Indexes on `status` and `reviewStatus` fields

#### Review Model
- **Removed**: `status` field (was: 'pending', 'in_progress', 'approved', 'rejected', 'needs_revision', 'scored', 'deliberated')
- **Removed**: Index on `status` field

### 2. StatusProgress Service Updates (src/common/services/status-progress.service.ts)

#### New Methods Added:
- `getLatestStatus(entityType, entityId)`: Get the latest status for an entity
- `updateStatus(entityType, entityId, newStatus, changedBy?, metadata?)`: Update status with automatic versioning
- `getResponseSessionStatus(sessionId)`: Get latest status for a response session
- `getReviewStatus(reviewId)`: Get latest status for a review
- `updateResponseSessionStatus(sessionId, newStatus, changedBy?, metadata?)`: Update response session status
- `updateReviewStatus(reviewId, newStatus, changedBy?, metadata?)`: Update review status

### 3. DTO Updates

#### AssessmentSessionDto (src/assessments/dto/assessment-session.dto.ts)
- **Removed**: `status` field
- **Removed**: `finalStatus` field
- **Removed**: `reviewStatus` field from AssessmentSessionDetailDto

#### ReviewResponseDto (src/reviews/dto/review-response.dto.ts)
- **Removed**: `status` field

### 4. Service Updates

#### AssessmentsService (src/assessments/assessments.service.ts)
- **Updated**: `getAssessmentQuestions()` - Removed status field from session creation, uses StatusProgress
- **Updated**: `submitAssessment()` - Removed status field updates, only uses StatusProgress
- **Updated**: `getUserAssessmentSessions()` - Gets status from StatusProgress instead of database fields
- **Updated**: `getAssessmentSessionDetail()` - Gets status from StatusProgress instead of database fields
- **Updated**: `createAssessmentReview()` - Removed status field from review creation, uses StatusProgress

#### ReviewsService (src/reviews/reviews.service.ts)
- **Updated**: `createReview()` - Removed status field from review creation, uses StatusProgress
- **Updated**: `mapReviewToDto()` - Gets status from StatusProgress (now async)
- **Updated**: `mapReviewToListDto()` - Gets status from StatusProgress (now async)
- **Updated**: `getReviewsForReviewer()` - Handles async mapping
- **Updated**: `getPendingReviews()` - Uses StatusProgress to filter sessions
- **Updated**: `getReviewStats()` - Uses StatusProgress to calculate statistics

## Migration Steps Required

### 1. Generate Prisma Client
```bash
npx prisma generate
```

### 2. Create and Run Migration
```bash
npx prisma migrate dev --name remove-status-fields
```

### 3. Data Migration (if needed)
If you have existing data, you may need to migrate existing status values to StatusProgress:

```sql
-- Example migration script for existing data
INSERT INTO "StatusProgress" ("entityType", "entityId", "status", "version", "changedAt")
SELECT 
  'response_session' as "entityType",
  id as "entityId",
  status as "status",
  1 as "version",
  "createdAt" as "changedAt"
FROM "ResponseSession"
WHERE status IS NOT NULL;

INSERT INTO "StatusProgress" ("entityType", "entityId", "status", "version", "changedAt")
SELECT 
  'review' as "entityType",
  id as "entityId",
  status as "status",
  1 as "version",
  "createdAt" as "changedAt"
FROM "Review"
WHERE status IS NOT NULL;
```

## Benefits of This Migration

1. **Centralized Status Management**: All status changes are tracked in one place
2. **Version History**: Complete audit trail of status changes with timestamps and user tracking
3. **Flexibility**: Easy to add new status types without schema changes
4. **Consistency**: Uniform status handling across different entity types
5. **Metadata Support**: Additional context can be stored with each status change

## API Changes

### Breaking Changes:
- ResponseSession and Review objects no longer have `status` fields
- Status information is now retrieved through StatusProgress system
- Some methods are now async due to StatusProgress lookups

### New Endpoints (if needed):
- Consider adding endpoints to get status history for entities
- Consider adding endpoints to get current status for entities

## Testing

After migration, test the following scenarios:
1. Creating new response sessions
2. Submitting assessments
3. Creating reviews
4. Updating review statuses
5. Retrieving assessment lists with status filtering
6. Status history tracking

## Rollback Plan

If rollback is needed:
1. Restore the removed fields in the schema
2. Create a migration to add the fields back
3. Update services to use both StatusProgress and direct fields during transition
4. Migrate StatusProgress data back to direct fields
