/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Role, WorkflowState, AuditLogEntry, SectionComment, CourseSpec } from '../src/types.ts';

export interface TransitionRequest {
  fromState: WorkflowState;
  toState: WorkflowState;
  role: Role;
  user: string;
  comment: string;
}

export function canEditCourse(role: Role, state: WorkflowState): boolean {
  if (role !== 'Author') return false;
  return state === 'Draft' || state === 'Returned';
}

export function validateStateTransition(req: TransitionRequest): { allowed: boolean; reason?: string } {
  const { fromState, toState, role, comment } = req;

  // Author: Draft -> Submitted, or Returned -> Submitted
  if (role === 'Author') {
    if ((fromState === 'Draft' || fromState === 'Returned') && toState === 'Submitted') {
      return { allowed: true };
    }
    return { allowed: false, reason: `Authors can only submit from Draft or Returned states.` };
  }

  // Reviewer: Submitted -> Under Review; Under Review -> Pending HOD or Returned
  if (role === 'Reviewer') {
    if (fromState === 'Submitted' && toState === 'Under Review') {
      return { allowed: true };
    }
    if (fromState === 'Under Review' && (toState === 'Pending HOD' || toState === 'Returned')) {
      if (toState === 'Returned' && (!comment || comment.trim().length === 0)) {
        return { allowed: false, reason: `Returning a specification requires a review critique comment.` };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: `Reviewers can only review submitted specs or forward/return them.` };
  }

  // HOD: Pending HOD -> Approved or Returned
  if (role === 'HOD') {
    if (fromState === 'Pending HOD' && (toState === 'Approved' || toState === 'Returned')) {
      if (toState === 'Returned' && (!comment || comment.trim().length === 0)) {
        return { allowed: false, reason: `Returning a specification requires an HOD feedback comment.` };
      }
      return { allowed: true };
    }
    return { allowed: false, reason: `HOD can only approve or return specifications pending HOD review.` };
  }

  return { allowed: false, reason: `Unauthorized role ${role} for state transition.` };
}

export function applyTransition(
  spec: CourseSpec,
  req: TransitionRequest
): { updatedSpec: CourseSpec; entry: AuditLogEntry } {
  const check = validateStateTransition(req);
  if (!check.allowed) {
    throw new Error(check.reason || 'Invalid state transition');
  }

  const entry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user: req.user,
    role: req.role,
    fromState: req.fromState,
    toState: req.toState,
    timestamp: new Date().toISOString(),
    comment: req.comment || `Transitioned from ${req.fromState} to ${req.toState}`
  };

  const updatedSpec: CourseSpec = {
    ...spec,
    workflowState: req.toState,
    auditTrail: [entry, ...(spec.auditTrail || [])]
  };

  return { updatedSpec, entry };
}
