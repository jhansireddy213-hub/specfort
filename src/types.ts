/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'Author' | 'Reviewer' | 'HOD';

export type WorkflowState =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Pending HOD'
  | 'Approved'
  | 'Returned';

export type TemplateType = 'Integrated' | 'Non-Lab';

export interface CourseOutcome {
  id: string; // e.g. "CO-1"
  title: string;
  leadingVerb: string;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
  targetPos: string[];
  hours: number;
  weight: number; // percentage, e.g. 20
}

export interface Unit {
  unitNumber: number;
  title: string;
  content: string;
  hours: number;
}

export interface AssessmentItem {
  id: string;
  category: 'Continuous Internal Evaluation (CIE)' | 'Semester End Exam (SEE)' | 'Laboratory & Practical';
  component: string; // e.g. "Midterm Test", "Capstone ROS2 Demo"
  targetCos: string[];
  weight: number; // percentage
}

export interface COPOCell {
  coId: string;
  poCode: string; // PO1..PO12, PSO1..PSO3
  strength: '3' | '2' | '1' | '';
  justification: string;
}

export interface Defect {
  code: string; // e.g. "DEF-V3-INVALID-VERB"
  location: {
    source: 'spec' | 'blueprint' | 'template';
    section: number | null; // Section 1-12 or null
    refs: string[]; // e.g. ["CO-1"], ["PSO-3"]
  };
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  fix: string;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  role: Role;
  fromState: WorkflowState;
  toState: WorkflowState;
  timestamp: string;
  comment: string;
}

export interface SectionComment {
  id: string;
  section: number;
  author: string;
  role: Role;
  timestamp: string;
  text: string;
  resolved: boolean;
}

export interface CourseSpec {
  courseCode: string;
  courseTitle: string;
  department: string;
  creditsLTP: string; // e.g. "3:0:2" or "3:1:0"
  totalCredits: number;
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  totalContactHours: number;
  courseType: string; // e.g. "Engineering Core", "Integrated Laboratory"
  summary: string;
  templateChoice: TemplateType;
  templateOverrideReason?: string;
  outcomes: CourseOutcome[];
  units: Unit[];
  copoMatrix: COPOCell[];
  assessments: AssessmentItem[];
  workflowState: WorkflowState;
  auditTrail: AuditLogEntry[];
  sectionComments: SectionComment[];
  defects: Defect[];
}

export interface SpecForgeOutput {
  input_id: string;
  course: {
    code: string;
    title: string;
    department: string;
    credits_ltp: string;
    total_credits: number;
    course_type: string;
    total_contact_hours: number;
  };
  template_used: TemplateType;
  workflow_status: WorkflowState;
  course_outcomes: CourseOutcome[];
  units: Unit[];
  copo_matrix: COPOCell[];
  assessments: AssessmentItem[];
  defects: Defect[];
  validation: {
    high_count: number;
    medium_count: number;
    low_count: number;
    passed_rules: string[];
    failed_rules: string[];
  };
  export_timestamp: string;
}
