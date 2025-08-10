// Combined status enum that covers both session and review statuses
export enum CombinedStatus {
  // Session statuses
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  
  // Review statuses
  PENDING_REVIEW = 'pending_review',
  UNDER_REVIEW = 'under_review',
  NEEDS_REVISION = 'needs_revision',
  RESUBMITTED = 'resubmitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PASSED_TO_JURY = 'passed_to_jury',
  JURY_SCORING = 'jury_scoring',
  JURY_DELIBERATION = 'jury_deliberation',
  FINAL_DECISION = 'final_decision',
  COMPLETED = 'completed'
}
