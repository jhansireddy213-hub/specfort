/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CourseSpec, Defect } from '../src/types.ts';

export interface ValidationResult {
  defects: Defect[];
  summary: {
    high: number;
    medium: number;
    low: number;
    passedRules: string[];
    failedRules: string[];
  };
  reportHtml: string;
}

const BANNED_VERBS = ['understand', 'know', 'learn', 'familiarize', 'appreciate', 'comprehend', 'study', 'grasp'];
const TEMPLATE_LEFTOVERS = ['sample course', 'xx-000', '[department]', 'course title here', 'sample unit', 'l:t:p'];

export function runValidationRules(spec: CourseSpec): ValidationResult {
  const defects: Defect[] = [];
  const passedRules: string[] = [];
  const failedRules: string[] = [];

  // V1: Course Code & Title
  const codeRegex = /^[A-Z]{2,5}-?[0-9]{3,4}[A-Z]?$/i;
  if (!spec.courseCode || !codeRegex.test(spec.courseCode.trim())) {
    defects.push({
      code: 'DEF-V1-INVALID-CODE',
      location: { source: 'spec', section: 1, refs: [spec.courseCode || 'EMPTY'] },
      severity: 'High',
      description: `Course Code '${spec.courseCode || 'EMPTY'}' does not conform to institutional pattern (e.g., CS-482).`,
      fix: 'Standardized course code prefix and numeric catalogue formatting.'
    });
    failedRules.push('V1');
  } else if (!spec.courseTitle || spec.courseTitle.trim().length < 5) {
    defects.push({
      code: 'DEF-V1-TITLE-INCOMPLETE',
      location: { source: 'spec', section: 1, refs: [spec.courseTitle || 'EMPTY'] },
      severity: 'High',
      description: 'Course title is missing or contains insufficient descriptive tokens.',
      fix: 'Specified full canonical title matching department syllabus index.'
    });
    failedRules.push('V1');
  } else {
    passedRules.push('V1');
  }

  // V2: Credit & Contact Hour Equation
  const ltpParts = spec.creditsLTP.split(':').map(n => parseInt(n.trim(), 10) || 0);
  const l = ltpParts[0] || 0;
  const t = ltpParts[1] || 0;
  const p = ltpParts[2] || 0;
  const calculatedCredits = l + t + Math.floor(p / 2);
  const calculatedHours = (l * 15) + (t * 15) + (p * 15);

  if (spec.totalCredits !== calculatedCredits && calculatedCredits > 0) {
    defects.push({
      code: 'DEF-V2-CREDIT-MISMATCH',
      location: { source: 'spec', section: 1, refs: [spec.creditsLTP, `Credits: ${spec.totalCredits}`] },
      severity: 'High',
      description: `L:T:P structure (${spec.creditsLTP}) yields ${calculatedCredits} credits, but specification states ${spec.totalCredits}.`,
      fix: `Reconciled total credits to ${calculatedCredits} conforming to Carnegie/AICTE norms.`
    });
    failedRules.push('V2');
  } else {
    passedRules.push('V2');
  }

  // V3: Bloom's Taxonomy Verb Rigor
  let v3Failed = false;
  spec.outcomes.forEach(co => {
    const firstWord = (co.leadingVerb || co.title.split(' ')[0] || '').toLowerCase().trim();
    if (BANNED_VERBS.includes(firstWord)) {
      v3Failed = true;
      defects.push({
        code: 'DEF-V3-PASSIVE-VERB',
        location: { source: 'spec', section: 3, refs: [co.id] },
        severity: 'High',
        description: `${co.id} begins with unmeasurable passive verb '${firstWord}'.`,
        fix: `Upgraded verb to approved active Bloom's equivalent 'Analyze'/'Evaluate'.`
      });
    }
  });
  if (v3Failed) failedRules.push('V3'); else passedRules.push('V3');

  // V4: Cognitive Level Distribution (>=60% in Apply..Create)
  const higherOrder = spec.outcomes.filter(co => ['Apply', 'Analyze', 'Evaluate', 'Create'].includes(co.bloomLevel)).length;
  const ratio = spec.outcomes.length > 0 ? (higherOrder / spec.outcomes.length) : 0;
  if (ratio < 0.6) {
    defects.push({
      code: 'DEF-V4-COGNITIVE-DEPTH',
      location: { source: 'spec', section: 3, refs: [`Ratio: ${Math.round(ratio * 100)}%`] },
      severity: 'Medium',
      description: `Higher-order cognitive outcomes represent only ${Math.round(ratio * 100)}% (minimum threshold 60% for collegiate engineering).`,
      fix: 'Elevated outcomes from Remember/Understand to Apply and Analyze domains.'
    });
    failedRules.push('V4');
  } else {
    passedRules.push('V4');
  }

  // V5: CO Count Compliance (4 to 6 range)
  if (spec.outcomes.length < 4 || spec.outcomes.length > 6) {
    defects.push({
      code: 'DEF-V5-CO-COUNT',
      location: { source: 'spec', section: 3, refs: [`Count: ${spec.outcomes.length}`] },
      severity: 'Medium',
      description: `Course defines ${spec.outcomes.length} Course Outcomes; NBA/ABET guidelines mandate between 4 and 6 outcomes.`,
      fix: 'Rebalanced and consolidated micro-competencies into standard 5 CO structure.'
    });
    failedRules.push('V5');
  } else {
    passedRules.push('V5');
  }

  // V6: Unit Hours Sum Reconciliation
  const sumUnitHours = spec.units.reduce((acc, u) => acc + (u.hours || 0), 0);
  if (spec.lectureHours > 0 && Math.abs(sumUnitHours - (l * 15)) > 5) {
    defects.push({
      code: 'DEF-V6-UNIT-HOURS-DRIFT',
      location: { source: 'spec', section: 4, refs: [`Sum: ${sumUnitHours}h`, `Expected: ${l * 15}h`] },
      severity: 'Medium',
      description: `Sum of unit syllabus hours (${sumUnitHours}h) deviates from total lecture contact hours (${l * 15}h).`,
      fix: 'Adjusted unit contact hour distribution to match 15-week timetable allocation.'
    });
    failedRules.push('V6');
  } else {
    passedRules.push('V6');
  }

  // V7: Assessment Weighting Balance (Sum to 100%)
  const totalAssessment = spec.assessments.reduce((acc, a) => acc + (a.weight || 0), 0);
  if (Math.abs(totalAssessment - 100) > 0.1) {
    defects.push({
      code: 'DEF-V7-ASSESSMENT-SUM',
      location: { source: 'spec', section: 6, refs: [`Sum: ${totalAssessment}%`] },
      severity: 'High',
      description: `Cumulative assessment weight equals ${totalAssessment}%, violating the mandatory 100% total requirement.`,
      fix: 'Normalized Continuous Internal Evaluation (CIE) and Semester End Exam (SEE) weights to 100%.'
    });
    failedRules.push('V7');
  } else {
    passedRules.push('V7');
  }

  // V8: CO-PO Matrix Non-Zero Coverage
  const mappedCos = new Set(spec.copoMatrix.filter(c => c.strength !== '').map(c => c.coId));
  const unmapped = spec.outcomes.filter(co => !mappedCos.has(co.id));
  if (unmapped.length > 0) {
    defects.push({
      code: 'DEF-V8-UNMAPPED-CO',
      location: { source: 'spec', section: 5, refs: unmapped.map(u => u.id) },
      severity: 'High',
      description: `${unmapped.length} Course Outcome(s) (${unmapped.map(u => u.id).join(', ')}) lack correlation to any Program Outcome.`,
      fix: 'Established target PO correlations with formal articulation justification notes.'
    });
    failedRules.push('V8');
  } else {
    passedRules.push('V8');
  }

  // V9: Template Leftover Tokens
  const rawContent = `${spec.courseTitle} ${spec.summary} ${spec.units.map(u => u.title).join(' ')}`.toLowerCase();
  const foundLeftovers = TEMPLATE_LEFTOVERS.filter(token => rawContent.includes(token));
  if (foundLeftovers.length > 0) {
    defects.push({
      code: 'DEF-V9-LEFTOVER-PLACEHOLDER',
      location: { source: 'template', section: null, refs: foundLeftovers },
      severity: 'High',
      description: `Unrendered template placeholder string detected in document: ${foundLeftovers.join(', ')}.`,
      fix: 'Replaced residual sample placeholders with extracted course specification metadata.'
    });
    failedRules.push('V9');
  } else {
    passedRules.push('V9');
  }

  // V10: Template Suitability
  const hasLab = p > 0 || spec.courseType.toLowerCase().includes('lab') || spec.courseType.toLowerCase().includes('integrated');
  if (hasLab && spec.templateChoice !== 'Integrated') {
    defects.push({
      code: 'DEF-V10-TEMPLATE-MISMATCH',
      location: { source: 'template', section: null, refs: [spec.templateChoice, `P=${p}`] },
      severity: 'High',
      description: `Course has Practical component (P=${p}) but Non-Lab template was applied.`,
      fix: 'Auto-switched template to Integrated Laboratory specification.'
    });
    failedRules.push('V10');
  } else {
    passedRules.push('V10');
  }

  const high = defects.filter(d => d.severity === 'High').length;
  const medium = defects.filter(d => d.severity === 'Medium').length;
  const low = defects.filter(d => d.severity === 'Low').length;

  const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Validation Audit Report | ${spec.courseCode}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #001f24; background: #f8fafc; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { font-size: 20px; margin: 0 0 4px 0; color: #00696c; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .metric { padding: 12px; border-radius: 6px; background: #f1f5f9; text-align: center; }
    .metric .val { font-size: 22px; font-weight: bold; font-family: monospace; }
    .badge-High { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .badge-Medium { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .badge-Low { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>SpecForge Accreditation & Curriculum Audit Report</h1>
    <div style="font-size: 12px; color: #64748b;">Course: ${spec.courseCode} - ${spec.courseTitle} | Generated: ${new Date().toLocaleString()}</div>
    <div class="metric-grid">
      <div class="metric"><div class="val" style="color: #991b1b;">${high}</div><div>High Severity</div></div>
      <div class="metric"><div class="val" style="color: #92400e;">${medium}</div><div>Medium Severity</div></div>
      <div class="metric"><div class="val" style="color: #0369a1;">${low}</div><div>Low Severity</div></div>
      <div class="metric"><div class="val" style="color: #166534;">${passedRules.length}/10</div><div>Passed Rules</div></div>
    </div>
  </div>

  <div class="card">
    <h2>Detected Quality Defects (${defects.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Defect Code</th>
          <th>Section</th>
          <th>Location Refs</th>
          <th>Description</th>
          <th>Applied Correction</th>
        </tr>
      </thead>
      <tbody>
        ${defects.map(d => `
          <tr>
            <td><span class="badge-${d.severity}">${d.severity}</span></td>
            <td style="font-family: monospace; font-weight: bold;">${d.code}</td>
            <td>${d.location.section ? 'Sec. ' + d.location.section : 'Global'}</td>
            <td style="font-family: monospace;">${d.location.refs.join(', ')}</td>
            <td>${d.description}</td>
            <td style="color: #166534; font-weight: 500;">${d.fix}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  return {
    defects,
    summary: {
      high,
      medium,
      low,
      passedRules,
      failedRules
    },
    reportHtml
  };
}
