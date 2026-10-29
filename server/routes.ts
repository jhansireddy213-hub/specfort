/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { extractLlmHeaders, checkLlmConnection } from './llm.ts';
import { runValidationRules } from './validator.ts';
import { applyTransition, canEditCourse } from './workflow.ts';
import type { CourseSpec, SpecForgeOutput, TemplateType } from '../src/types.ts';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 1. Health Endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'up' }
  });
});

// 2. LLM Connectivity Probe
router.get('/llm-check', async (req, res) => {
  const headers = extractLlmHeaders(req.headers);
  const result = await checkLlmConnection(headers);
  res.json({
    success: true,
    data: result
  });
});

// Helper: Standard sample specification when no custom document is provided
export function getSampleCourseSpec(): CourseSpec {
  return {
    courseCode: 'CS-482',
    courseTitle: 'Autonomous Robotics & Algorithmic Ethics',
    department: 'Computer Science & AI',
    creditsLTP: '3:0:2',
    totalCredits: 4,
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 2,
    totalContactHours: 75,
    courseType: 'Integrated Laboratory Curriculum',
    summary: 'A comprehensive curriculum spanning spatial estimation, simultaneous localization and mapping (SLAM), and real-time motion planning with certified IEEE P7000 ethical constraints for safety-critical autonomous hardware.',
    templateChoice: 'Integrated',
    outcomes: [
      {
        id: 'CO-1',
        title: 'Analyze spatial coordinate transformations, Lie algebras, and kinematic motion models for non-holonomic mobile robots.',
        leadingVerb: 'Analyze',
        bloomLevel: 'Analyze',
        targetPos: ['PO1', 'PO2'],
        hours: 12,
        weight: 20
      },
      {
        id: 'CO-2',
        title: 'Apply Extended Kalman Filters (EKF) and graph-based SLAM optimization algorithms using real-time sensor fusion.',
        leadingVerb: 'Apply',
        bloomLevel: 'Apply',
        targetPos: ['PO1', 'PO5'],
        hours: 15,
        weight: 20
      },
      {
        id: 'CO-3',
        title: 'Design certified collision-avoidance barrier functions under kinematic uncertainty and sensor occlusion.',
        leadingVerb: 'Design',
        bloomLevel: 'Create',
        targetPos: ['PO3', 'PSO1'],
        hours: 15,
        weight: 20
      },
      {
        id: 'CO-4',
        title: 'Evaluate moral dilemmas and liability protocols in algorithmic driving systems under IEEE P7000 standards.',
        leadingVerb: 'Evaluate',
        bloomLevel: 'Evaluate',
        targetPos: ['PO8', 'PSO3'],
        hours: 15,
        weight: 20
      },
      {
        id: 'CO-5',
        title: 'Implement multi-agent cooperative task allocation algorithms on physical ROS2 hardware platforms.',
        leadingVerb: 'Implement',
        bloomLevel: 'Apply',
        targetPos: ['PO4', 'PO9', 'PSO2'],
        hours: 18,
        weight: 20
      }
    ],
    units: [
      {
        unitNumber: 1,
        title: 'Spatial Representations & Kinematic Manifolds',
        content: 'SO(3) and SE(3) groups, Rodrigues parameters, forward/inverse differential kinematics, sensor calibration.',
        hours: 9
      },
      {
        unitNumber: 2,
        title: 'Perception, Odometry & Sensor Fusion',
        content: 'LiDAR point cloud filtering, visual odometry, IMU pre-integration, Extended Kalman Filtering.',
        hours: 9
      },
      {
        unitNumber: 3,
        title: 'Simultaneous Localization & Mapping (SLAM)',
        content: 'Occupancy grid mapping, graph SLAM, loop closure verification, Ceres solver bundle adjustment.',
        hours: 9
      },
      {
        unitNumber: 4,
        title: 'Motion Planning & Barrier Safety Functions',
        content: 'RRT*, trajectory optimization, Model Predictive Control, control barrier functions (CBF).',
        hours: 9
      },
      {
        unitNumber: 5,
        title: 'Algorithmic Ethics & Institutional Governance',
        content: 'Safety certifiable bounds, algorithmic accountability, liability in fatal edge cases, IEEE P7000 compliance.',
        hours: 9
      }
    ],
    copoMatrix: [
      { coId: 'CO-1', poCode: 'PO1', strength: '3', justification: 'Requires advanced differential mathematics and spatial algebra.' },
      { coId: 'CO-1', poCode: 'PO2', strength: '3', justification: 'Formulates kinematic constraint equations for non-holonomic systems.' },
      { coId: 'CO-2', poCode: 'PO1', strength: '2', justification: 'Applies probabilistic linear algebra to sensor noise.' },
      { coId: 'CO-2', poCode: 'PO5', strength: '3', justification: 'Direct hands-on simulation with Ceres solver and ROS2.' },
      { coId: 'CO-3', poCode: 'PO3', strength: '3', justification: 'Designs robust barrier functions satisfying formal safety criteria.' },
      { coId: 'CO-3', poCode: 'PSO1', strength: '3', justification: 'Architects real-time motion control algorithms.' },
      { coId: 'CO-4', poCode: 'PO8', strength: '3', justification: 'Direct instruction and case analysis of engineering professional ethics.' },
      { coId: 'CO-4', poCode: 'PSO3', strength: '2', justification: 'Assesses liability and societal risk of autonomous decisions.' },
      { coId: 'CO-5', poCode: 'PO4', strength: '3', justification: 'Designs physical hardware experiments with empirical benchmarks.' },
      { coId: 'CO-5', poCode: 'PO9', strength: '3', justification: 'Students work in teams of three on multi-agent deployment.' },
      { coId: 'CO-5', poCode: 'PSO2', strength: '3', justification: 'Deploys production software on embedded robotics compute boards.' }
    ],
    assessments: [
      { id: 'A1', category: 'Continuous Internal Evaluation (CIE)', component: 'Midterm Theory Examination', targetCos: ['CO-1', 'CO-2'], weight: 25 },
      { id: 'A2', category: 'Laboratory & Practical', component: 'ROS2 SLAM Hardware Benchwork', targetCos: ['CO-2', 'CO-5'], weight: 25 },
      { id: 'A3', category: 'Continuous Internal Evaluation (CIE)', component: 'IEEE P7000 Ethics Case Analysis', targetCos: ['CO-4'], weight: 10 },
      { id: 'A4', category: 'Semester End Exam (SEE)', component: 'Comprehensive Final Examination & Capstone Defense', targetCos: ['CO-1', 'CO-2', 'CO-3', 'CO-4', 'CO-5'], weight: 40 }
    ],
    workflowState: 'Draft',
    auditTrail: [
      {
        id: 'init-1',
        user: 'Dr. Alistair Vance',
        role: 'Author',
        fromState: 'Draft',
        toState: 'Draft',
        timestamp: new Date().toISOString(),
        comment: 'Initial course specification drafted from syllabus workbench.'
      }
    ],
    sectionComments: [],
    defects: []
  };
}

// 3. Document Parser Endpoint
router.post('/parse', upload.fields([{ name: 'spec', maxCount: 1 }, { name: 'blueprint', maxCount: 1 }]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const specFile = files?.spec?.[0];

    // If no file uploaded, return structured sample spec
    let parsedSpec = getSampleCourseSpec();

    if (specFile) {
      const fileName = specFile.originalname;
      const cleanFileName = fileName.replace(/\.[^/.]+$/, '');
      const rawBufferStr = specFile.buffer.toString('utf-8', 0, Math.min(specFile.buffer.length, 500000));

      // 1. Try to detect Course Code from content or filename
      const codeMatch = rawBufferStr.match(/\b([A-Z]{2,5}-?[0-9]{3,4}[A-Z]?)\b/i) || cleanFileName.match(/\b([A-Z]{2,5}-?[0-9]{3,4}[A-Z]?)\b/i);
      if (codeMatch) {
        parsedSpec.courseCode = codeMatch[1].toUpperCase();
      }

      // 2. Try to detect Course Title from content or filename
      const titleMatch = rawBufferStr.match(/course\s*title\s*[:\-]\s*([^\n\r<]{3,80})/i) || rawBufferStr.match(/title\s*[:\-]\s*([^\n\r<]{3,80})/i);
      if (titleMatch) {
        parsedSpec.courseTitle = titleMatch[1].trim();
      } else if (cleanFileName.length > 5 && !cleanFileName.includes('spec') && !cleanFileName.includes('upload')) {
        parsedSpec.courseTitle = cleanFileName.replace(/^[A-Z]{2,5}-?[0-9]{3,4}[A-Z]?[\s_\-]*/i, '').replace(/[_\-]+/g, ' ').trim() || parsedSpec.courseTitle;
      }

      // 3. Try to detect L:T:P credits
      const ltpMatch = rawBufferStr.match(/\b([1-6])\s*[:\-]\s*([0-4])\s*[:\-]\s*([0-6])\b/);
      if (ltpMatch) {
        parsedSpec.creditsLTP = `${ltpMatch[1]}:${ltpMatch[2]}:${ltpMatch[3]}`;
        const l = parseInt(ltpMatch[1], 10);
        const t = parseInt(ltpMatch[2], 10);
        const p = parseInt(ltpMatch[3], 10);
        parsedSpec.lectureHours = l;
        parsedSpec.tutorialHours = t;
        parsedSpec.practicalHours = p;
        parsedSpec.totalCredits = l + t + Math.floor(p / 2);
        parsedSpec.totalContactHours = (l + t + p) * 15;
      }
    }

    // Run V1 to V10 validation
    const validation = runValidationRules(parsedSpec);
    parsedSpec.defects = validation.defects;

    res.json({
      success: true,
      data: parsedSpec
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to parse uploaded documents: ${err.message}`
    });
  }
});

// 4. Workflow Transition Endpoint (RBAC Enforced)
router.post('/workflow/transition', (req, res) => {
  try {
    const { spec, role, user, toState, comment } = req.body;
    if (!spec || !role || !toState) {
      return res.status(400).json({ success: false, error: 'Missing transition parameters.' });
    }

    const { updatedSpec, entry } = applyTransition(spec, {
      fromState: spec.workflowState,
      toState,
      role,
      user: user || 'Anonymous User',
      comment: comment || ''
    });

    res.json({
      success: true,
      data: updatedSpec,
      auditEntry: entry
    });
  } catch (err: any) {
    res.status(403).json({
      success: false,
      error: err.message
    });
  }
});

// Helper: Fill HTML Template
export function fillHtmlTemplate(spec: CourseSpec, templateType: TemplateType): string {
  const templatePath = path.resolve(process.cwd(), 'templates', templateType === 'Integrated' ? 'integrated.html' : 'non-lab.html');
  let html = '';
  try {
    html = fs.readFileSync(templatePath, 'utf-8');
  } catch {
    html = `<html><body><h1>${spec.courseCode} - ${spec.courseTitle}</h1></body></html>`;
  }

  // Populate CO Table Rows
  const coRows = spec.outcomes.map(co => `
    <tr>
      <td style="font-family: monospace; font-weight: bold; color: #00696c;">${co.id}</td>
      <td>${co.title}</td>
      <td><span class="badge">${co.bloomLevel}</span></td>
      <td style="font-size: 11px; color: #475569;">${co.targetPos.join(', ')}</td>
    </tr>
  `).join('');

  // Populate Unit Rows
  const unitRows = spec.units.map(u => `
    <tr>
      <td style="font-weight: bold; color: #00696c;">Unit ${u.unitNumber}</td>
      <td style="font-weight: 600;">${u.title}</td>
      <td style="color: #334155;">${u.content}</td>
      <td style="text-align: right; font-family: monospace;">${u.hours} hrs</td>
    </tr>
  `).join('');

  // Populate Matrix Rows
  const pos = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12', 'PSO1', 'PSO2', 'PSO3'];
  const matrixRows = spec.outcomes.map(co => {
    const cells = pos.map(p => {
      const cell = spec.copoMatrix.find(c => c.coId === co.id && c.poCode === p);
      const str = cell?.strength || '';
      const cls = str ? `co-po-cell strength-${str}` : 'co-po-cell';
      return `<td class="${cls}">${str || '-'}</td>`;
    }).join('');
    return `<tr><td style="font-weight: bold; background: #f8fafc;">${co.id}</td>${cells}</tr>`;
  }).join('');

  // Populate Assessment Rows
  const assessRows = spec.assessments.map(a => `
    <tr>
      <td style="font-weight: 600;">${a.category}</td>
      <td>${a.component}</td>
      <td>${a.targetCos.join(', ')}</td>
      <td style="text-align: right; font-family: monospace; font-weight: bold; color: #00696c;">${a.weight}%</td>
    </tr>
  `).join('');

  // Replacements
  return html
    .replace(/\{\{COURSE_CODE\}\}/g, spec.courseCode)
    .replace(/\{\{COURSE_TITLE\}\}/g, spec.courseTitle)
    .replace(/\{\{DEPARTMENT\}\}/g, spec.department)
    .replace(/\{\{COURSE_TYPE\}\}/g, spec.courseType)
    .replace(/\{\{CREDITS_LTP\}\}/g, spec.creditsLTP)
    .replace(/\{\{TOTAL_CREDITS\}\}/g, String(spec.totalCredits))
    .replace(/\{\{TOTAL_HOURS\}\}/g, String(spec.totalContactHours))
    .replace(/\{\{LECTURE_HOURS\}\}/g, String(spec.lectureHours * 15))
    .replace(/\{\{TUTORIAL_HOURS\}\}/g, String(spec.tutorialHours * 15))
    .replace(/\{\{LAB_HOURS\}\}/g, String(spec.practicalHours * 15))
    .replace(/\{\{COURSE_SUMMARY\}\}/g, spec.summary)
    .replace(/\{\{WORKFLOW_STATUS\}\}/g, spec.workflowState)
    .replace(/\{\{CO_TABLE_ROWS\}\}/g, coRows)
    .replace(/\{\{UNIT_TABLE_ROWS\}\}/g, unitRows)
    .replace(/\{\{MATRIX_TABLE_ROWS\}\}/g, matrixRows)
    .replace(/\{\{ASSESSMENT_TABLE_ROWS\}\}/g, assessRows);
}

// 5. Automated Pipeline Generator Endpoint: POST /api/v1/generate
router.post('/generate', upload.fields([{ name: 'spec', maxCount: 1 }, { name: 'blueprint', maxCount: 1 }]), async (req, res) => {
  try {
    const spec = getSampleCourseSpec();

    // Template selection logic
    const ltpParts = spec.creditsLTP.split(':').map(n => parseInt(n.trim(), 10) || 0);
    const p = ltpParts[2] || 0;
    const isIntegrated = p > 0 || spec.courseType.toLowerCase().includes('lab') || spec.courseType.toLowerCase().includes('integrated');
    spec.templateChoice = isIntegrated ? 'Integrated' : 'Non-Lab';

    // Run plain-code validation
    const validation = runValidationRules(spec);
    spec.defects = validation.defects;

    // Fill HTML template
    const filledHtml = fillHtmlTemplate(spec, spec.templateChoice);

    // Build specforge_output
    const output: SpecForgeOutput = {
      input_id: 'SAMPLE',
      course: {
        code: spec.courseCode,
        title: spec.courseTitle,
        department: spec.department,
        credits_ltp: spec.creditsLTP,
        total_credits: spec.totalCredits,
        course_type: spec.courseType,
        total_contact_hours: spec.totalContactHours
      },
      template_used: spec.templateChoice,
      workflow_status: spec.workflowState,
      course_outcomes: spec.outcomes,
      units: spec.units,
      copo_matrix: spec.copoMatrix,
      assessments: spec.assessments,
      defects: spec.defects,
      validation: {
        high_count: validation.summary.high,
        medium_count: validation.summary.medium,
        low_count: validation.summary.low,
        passed_rules: validation.summary.passedRules,
        failed_rules: validation.summary.failedRules
      },
      export_timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        output,
        html: filledHtml
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Pipeline generation error: ${err.message}`
    });
  }
});

export default router;
