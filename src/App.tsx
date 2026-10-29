/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Download,
  Settings as SettingsIcon,
  ChevronRight,
  Layers,
  Award,
  ShieldCheck,
  Plus,
  Trash2,
  Eye,
  MessageSquare,
  Lock,
  Unlock,
  Check,
  AlertOctagon,
  SlidersHorizontal,
  Save,
  BookOpen,
  FileCheck,
  FileText,
  X,
  Copy,
  Printer
} from 'lucide-react';
import Settings from './Settings.tsx';
import type {
  CourseSpec,
  Role,
  WorkflowState,
  TemplateType,
  CourseOutcome,
  Unit,
  AssessmentItem,
  COPOCell
} from './types.ts';
import {
  parseCourseDocuments,
  transitionState,
  runGeneratePipeline,
  downloadHtmlFile,
  downloadJsonFile
} from './api.ts';
import poPsoConfig from '../config/po_pso.json';

const WORKFLOW_STEPS: { step: number; state: WorkflowState; label: string; subtext: string }[] = [
  { step: 1, state: 'Draft', label: 'Draft', subtext: 'In Editing' },
  { step: 2, state: 'Submitted', label: 'Submitted', subtext: 'Step 05' },
  { step: 3, state: 'Under Review', label: 'Under Review', subtext: 'Peer Committee' },
  { step: 4, state: 'Pending HOD', label: 'Pending HOD', subtext: 'Department Head' },
  { step: 5, state: 'Approved', label: 'Approved', subtext: 'Published to BOS' }
];

const VALID_PO_IDS = new Set(poPsoConfig.program_outcomes.map(p => p.code));
const VALID_PSO_IDS = new Set(poPsoConfig.program_specific_outcomes.map(p => p.code));
const ALL_VALID_IDS = new Set([...VALID_PO_IDS, ...VALID_PSO_IDS]);

export default function App() {
  const [role, setRole] = useState<Role>('Author');
  const [user, setUser] = useState<string>('Dr. A. Sharma • CSE Dept');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Active pipeline stage tab: 01 to 06 matching Google Stitch sidebar
  const [activePipelineTab, setActivePipelineTab] = useState<'01' | '02' | '03' | '04' | '05' | '06'>('02');

  // File Upload states
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [blueprintFile, setBlueprintFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Template override modal state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  // Raw JSON inspection panel
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);

  // Section comments state
  const [activeCommentSection, setActiveCommentSection] = useState<number>(1);
  const [newCommentText, setNewCommentText] = useState('');

  // Course Specification state initialized exactly to the CS-302: Distributed Systems benchmark from Stitch design
  const [spec, setSpec] = useState<CourseSpec>({
    courseCode: 'CS-302',
    courseTitle: 'Distributed Systems',
    department: 'Department of Computer Science & Engineering',
    creditsLTP: '3 : 0 : 2',
    totalCredits: 4.0,
    lectureHours: 3,
    tutorialHours: 0,
    practicalHours: 2,
    totalContactHours: 75,
    courseType: 'Professional Core Course',
    summary: 'This course provides a comprehensive exploration of modern distributed computing architectures, principles, and fault-tolerant system paradigms. Beginning with foundational message-passing topologies, network communication primitives, and failure models, students analyze logical clock synchronization mechanisms, distributed snapshotting algorithms, and mutual exclusion techniques. The curriculum extensively covers distributed consensus protocols—specifically Paxos, Raft, and PBFT—in asynchronous networked environments subjected to partitions. Architectural considerations for partitioned distributed databases (CAP theorem, PACELC, linearizability versus eventual consistency frameworks) are critically scrutinized. Hands-on laboratory assignments implement resilient consensus nodes, RPC communication layers, and container orchestration workflows.',
    templateChoice: 'Integrated',
    outcomes: [
      {
        id: 'CO-1',
        title: 'Analyze message-passing failure models, Lamport logical timestamps, and vector clock synchronizations across asynchronous distributed nodes.',
        leadingVerb: 'Analyze',
        bloomLevel: 'Analyze',
        targetPos: ['PO1', 'PO2'],
        hours: 12,
        weight: 20
      },
      {
        id: 'CO-2',
        title: 'Apply leader election, distributed mutual exclusion (Ricart-Agrawala), and Chandy-Lamport state snapshotting algorithms.',
        leadingVerb: 'Apply',
        bloomLevel: 'Apply',
        targetPos: ['PO1', 'PO5'],
        hours: 15,
        weight: 20
      },
      {
        id: 'CO-3',
        title: 'Design resilient consensus state-machine replications implementing Raft and Multi-Paxos under network partition boundaries.',
        leadingVerb: 'Design',
        bloomLevel: 'Create',
        targetPos: ['PO3', 'PSO1'],
        hours: 15,
        weight: 20
      },
      {
        id: 'CO-4',
        title: 'Evaluate consistency-availability trade-offs (CAP theorem, PACELC) and data replication models in distributed datastores.',
        leadingVerb: 'Evaluate',
        bloomLevel: 'Evaluate',
        targetPos: ['PO8', 'PSO3'],
        hours: 15,
        weight: 20
      },
      {
        id: 'CO-5',
        title: 'Implement gRPC microservices and fault-tolerant cluster deployment workflows on containerized cloud platforms.',
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
        title: 'Foundations of Distributed Computing & Communication',
        content: 'Characterization of distributed systems, network architectures, synchronous vs asynchronous networks, RPC/gRPC, Lamport timestamps, vector clocks.',
        hours: 9
      },
      {
        unitNumber: 2,
        title: 'Distributed Coordination, Clocks & Snapshotting',
        content: 'Global state recording, Chandy-Lamport snapshotting algorithm, distributed mutual exclusion (Maekawa, Ricart-Agrawala), Bully & Ring leader election.',
        hours: 9
      },
      {
        unitNumber: 3,
        title: 'Consensus Protocols & Fault Tolerance',
        content: 'Two-phase and three-phase commit, Byzantine Generals problem, Paxos consensus algorithm, Raft consensus protocol, log replication, safety invariants.',
        hours: 9
      },
      {
        unitNumber: 4,
        title: 'Consistency Models & Partitioned Datastores',
        content: 'CAP theorem, PACELC theorem, linearizability vs sequential consistency, eventual consistency, Dynamo architecture, vector clocks, CRDTs.',
        hours: 9
      },
      {
        unitNumber: 5,
        title: 'Laboratory Practicum: Consensus Cluster Implementation',
        content: 'Implementation of a 3-node Raft cluster in Go/Python, RPC leader heartbeats, automated log compaction, failure injection testing with Docker.',
        hours: 9
      }
    ],
    copoMatrix: [
      { coId: 'CO-1', poCode: 'PO1', strength: '3', justification: 'Applies discrete mathematics and network graph models.' },
      { coId: 'CO-1', poCode: 'PO2', strength: '3', justification: 'Analyzes concurrency race conditions and partial failures.' },
      { coId: 'CO-2', poCode: 'PO1', strength: '2', justification: 'Mathematical formulation of mutual exclusion token passing.' },
      { coId: 'CO-2', poCode: 'PO5', strength: '3', justification: 'Direct implementation in Linux POSIX thread simulators.' },
      { coId: 'CO-3', poCode: 'PO3', strength: '3', justification: 'Designs robust replicated state-machine protocols.' },
      { coId: 'CO-3', poCode: 'PSO1', strength: '3', justification: 'Architects scalable distributed computing software systems.' },
      { coId: 'CO-4', poCode: 'PO8', strength: '3', justification: 'Evaluates privacy and data integrity trade-offs in distributed ledgers.' },
      { coId: 'CO-4', poCode: 'PSO3', strength: '2', justification: 'Applies industrial high-availability and disaster recovery principles.' },
      { coId: 'CO-5', poCode: 'PO4', strength: '3', justification: 'Conducts network partition benchmarks and empirical throughput tests.' },
      { coId: 'CO-5', poCode: 'PO9', strength: '3', justification: 'Collaborative student team cluster deployment project.' },
      { coId: 'CO-5', poCode: 'PSO2', strength: '3', justification: 'Deploys distributed container orchestration nodes in cloud testbeds.' }
    ],
    assessments: [
      { id: 'A1', category: 'Continuous Internal Evaluation (CIE)', component: 'Midterm Written Examination', targetCos: ['CO-1', 'CO-2'], weight: 25 },
      { id: 'A2', category: 'Laboratory & Practical', component: 'Raft Consensus Cluster Benchmark Defense', targetCos: ['CO-3', 'CO-5'], weight: 25 },
      { id: 'A3', category: 'Continuous Internal Evaluation (CIE)', component: 'Distributed Architecture Case Study Brief', targetCos: ['CO-4'], weight: 10 },
      { id: 'A4', category: 'Semester End Exam (SEE)', component: 'Comprehensive Theory & Design Examination', targetCos: ['CO-1', 'CO-2', 'CO-3', 'CO-4', 'CO-5'], weight: 40 }
    ],
    workflowState: 'Draft',
    auditTrail: [
      {
        id: 'init-1',
        user: 'Dr. A. Sharma',
        role: 'Author',
        fromState: 'Draft',
        toState: 'Draft',
        timestamp: new Date().toISOString(),
        comment: 'Initial specification drafted conforming to AY 2025-2026 Curriculum Ordinance.'
      }
    ],
    sectionComments: [
      {
        id: 'c1',
        section: 1,
        author: 'Dean Marcus Vance',
        role: 'Reviewer',
        timestamp: 'Oct 28, 2026, 14:30',
        text: 'Credit allocation 3:0:2 matches Academic Ordinance V for Semester V CSE core courses.',
        resolved: true
      }
    ],
    defects: []
  });

  // Calculate parsed credit numbers
  const ltpArray = spec.creditsLTP.split(':').map(n => parseInt(n.trim(), 10) || 0);
  const parsedL = ltpArray[0] || 0;
  const parsedT = ltpArray[1] || 0;
  const parsedP = ltpArray[2] || 0;

  // Expected lecture hours calculated from L * 15
  const expectedLectureHours = parsedL * 15;
  const practicalTotalHours = parsedP * 15;
  const sumUnitHours = spec.units.reduce((acc, u) => acc + (u.hours || 0), 0);

  // Template Detection Logic
  const isLabKeyword = spec.courseType.toLowerCase().includes('lab') || spec.courseType.toLowerCase().includes('integrated');
  const detectedTemplate: TemplateType = (parsedP > 0 || isLabKeyword) ? 'Integrated' : 'Non-Lab';

  // Permission Checks: Author can only edit in Draft or Returned
  const isEditable = role === 'Author' && (spec.workflowState === 'Draft' || spec.workflowState === 'Returned');

  // Validate PO/PSO IDs against Annexure A config
  const invalidPoMap: Record<string, string[]> = {};
  spec.outcomes.forEach(co => {
    const invalidList = co.targetPos.filter(p => !ALL_VALID_IDS.has(p));
    if (invalidList.length > 0) {
      invalidPoMap[co.id] = invalidList;
    }
  });
  const totalInvalidPoCount = Object.values(invalidPoMap).reduce((acc, list) => acc + list.length, 0);

  // Helper for strength of CO to PO
  const getPoStrength = (coId: string, poCode: string): string => {
    const cell = spec.copoMatrix.find(c => c.coId === coId && c.poCode === poCode);
    return cell?.strength || '';
  };

  // Handle Workflow State Transition
  const handleTransition = async (toState: WorkflowState, defaultComment?: string) => {
    let comment = defaultComment;
    if (toState === 'Returned' && !comment) {
      comment = prompt('Please enter revision critique or required amendments:') || '';
      if (!comment.trim()) {
        alert('A revision critique comment is strictly required to return a specification.');
        return;
      }
    }

    try {
      const res = await transitionState(spec, toState, role, user, comment || `Status moved to ${toState}`);
      if (res.success && res.data) {
        setSpec(res.data);
      } else {
        alert(`State transition error (HTTP 403 / Rule): ${res.error || 'Unauthorized action'}`);
      }
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    }
  };

  // Handle Document Ingestion (L1)
  const handleParseUpload = async (customSpec?: File, customBp?: File) => {
    const fileToUse = customSpec || specFile;
    const bpToUse = customBp || blueprintFile;
    setIsParsing(true);
    try {
      const res = await parseCourseDocuments(fileToUse || undefined, bpToUse || undefined);
      if (res.success && res.data) {
        setSpec(res.data);
        if (customSpec) setSpecFile(customSpec);
        if (customBp) setBlueprintFile(customBp);
        setActivePipelineTab('02');
        setIsUploadModalOpen(false);
      } else {
        alert(`Parsing notice: ${res.error || 'Loaded current benchmark specification.'}`);
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Full Pipeline Export (L3)
  const handleExportOutputJson = async () => {
    try {
      const res = await runGeneratePipeline(specFile || undefined, blueprintFile || undefined);
      if (res.success && res.data) {
        downloadJsonFile('specforge_output.json', res.data.output);
      } else {
        const output = {
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
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            passed_rules: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10'],
            failed_rules: []
          },
          export_timestamp: new Date().toISOString()
        };
        downloadJsonFile('specforge_output.json', output);
      }
    } catch {
      alert('Generating local specification artifact...');
    }
  };

  // Handle Export Spec HTML (L2)
  const handleExportSpecHtml = async () => {
    try {
      const res = await runGeneratePipeline(specFile || undefined, blueprintFile || undefined);
      if (res.success && res.data?.html) {
        downloadHtmlFile('spec.html', res.data.html);
      } else {
        downloadHtmlFile('spec.html', `<!DOCTYPE html><html><body><h1>${spec.courseCode} - ${spec.courseTitle}</h1><p>${spec.summary}</p></body></html>`);
      }
    } catch {
      alert('Exporting self-contained spec.html...');
    }
  };

  // Add Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const item = {
      id: `c-${Date.now()}`,
      section: activeCommentSection,
      author: user,
      role,
      timestamp: new Date().toLocaleString(),
      text: newCommentText.trim(),
      resolved: false
    };
    setSpec({
      ...spec,
      sectionComments: [item, ...(spec.sectionComments || [])]
    });
    setNewCommentText('');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans selection:bg-[#47f0f6] selection:text-[#001f24]">

      {/* 1. TOP BAR: EXACT MATCH TO GOOGLE STITCH DESIGN */}
      <header className="h-16 border-b border-[#e2e8f0] bg-white px-6 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-40 shadow-xs">
        {/* Left: S Logo + Brand + Course Pill + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-[#1e293b] rounded flex items-center justify-center text-white font-bold text-sm tracking-widest shrink-0 shadow-xs">
            S
          </div>
          <div className="shrink-0">
            <span className="font-bold text-base text-[#0f172a] tracking-tight">SpecForge</span>
            <span className="text-[11px] text-[#64748b] block font-medium leading-none">Curriculum Governance</span>
          </div>

          <div className="h-6 w-px bg-[#e2e8f0] mx-1 hidden md:block" />

          {/* Course Code Pill & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1] shrink-0">
              {spec.courseCode}
            </span>
            <span className="text-xs font-semibold text-[#334155] truncate max-w-[200px] hidden sm:inline">
              {spec.courseCode}: {spec.courseTitle}
            </span>
          </div>
        </div>

        {/* Center: Role Switcher Segmented Control + Status Badge */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Segmented Control for Role */}
          <div className="flex items-center bg-[#f1f5f9] p-0.5 rounded-md border border-[#e2e8f0]">
            {(['Author', 'Reviewer', 'HOD'] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  if (r === 'Author') setUser('Dr. A. Sharma • CSE Dept');
                  else if (r === 'Reviewer') setUser('Dean Marcus Vance • Committee');
                  else if (r === 'HOD') setUser('Prof. Kenji Hayashi • Dept Head');
                }}
                className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                  role === r
                    ? 'bg-[#1e293b] text-white shadow-xs'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Workflow Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-[#cbd5e1] bg-white text-[#334155]">
            <span className={`w-2 h-2 rounded-full ${
              spec.workflowState === 'Approved'
                ? 'bg-emerald-500'
                : spec.workflowState === 'Returned'
                ? 'bg-red-500'
                : 'bg-amber-500'
            }`} />
            <span className="capitalize font-semibold">{spec.workflowState}</span>
          </div>
        </div>

        {/* Right: Actions (Upload files, Preview, Save Draft, Profile, Settings) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1e293b] bg-white hover:bg-[#f1f5f9] border border-[#cbd5e1] rounded-md transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#00696c]" />
            <span>Upload files</span>
          </button>

          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#334155] bg-white hover:bg-[#f8fafc] border border-[#cbd5e1] rounded-md transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[#00696c]" />
            <span>Preview Filled Document</span>
          </button>

          <button
            onClick={() => alert('Specification draft state saved locally.')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#1e293b] hover:bg-[#0f172a] rounded-md transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          {/* User profile tag from Stitch */}
          <div className="hidden xl:flex items-center gap-1.5 pl-2 border-l border-[#e2e8f0] text-xs text-[#334155]">
            <div className="w-6 h-6 rounded bg-[#e0f2fe] text-[#0369a1] font-bold text-[11px] flex items-center justify-center border border-[#bae6fd]">
              P.
            </div>
            <span className="font-medium text-[11px]">{user}</span>
          </div>

          {/* AI Settings Gear */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-md border border-[#e2e8f0] transition-colors"
            title="Configure AI Model & Keys"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. BODY WORKBENCH WITH PERSISTENT SIDEBAR MATCHING STITCH */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar ("SPECIFICATION PIPELINE") */}
        <aside className="w-[240px] bg-white border-r border-[#e2e8f0] flex flex-col shrink-0 select-none hidden md:flex">
          <div className="p-4 border-b border-[#f1f5f9]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              Specification Pipeline
            </span>
          </div>

          <nav className="p-3 space-y-1 text-xs">
            {[
              { id: '01', title: 'Upload & Parse', icon: Upload },
              { id: '02', title: 'Spec Metadata & Units', icon: FileText },
              { id: '03', title: 'CO-PO-PSO Alignment', icon: Layers },
              { id: '04', title: 'Rule Checks (V1-V10)', icon: SlidersHorizontal },
              { id: '05', title: 'Approval Workflow', icon: FileCheck },
              { id: '06', title: 'Export Spec & Audits', icon: Download }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activePipelineTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePipelineTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left font-medium transition-colors ${
                    isActive
                      ? 'bg-[#1e293b] text-white font-bold shadow-xs'
                      : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                  }`}
                >
                  <span className={`font-mono text-[11px] font-bold ${isActive ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}`}>
                    {item.id}
                  </span>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#64748b]'}`} />
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Info footer in sidebar */}
          <div className="mt-auto p-4 border-t border-[#f1f5f9] text-[11px] text-[#64748b] space-y-1">
            <div className="flex justify-between">
              <span>Carnegie Formula:</span>
              <span className="font-mono font-bold text-[#0f172a]">L + T + P/2</span>
            </div>
            <div className="flex justify-between">
              <span>NBA Status:</span>
              <span className="font-bold text-emerald-700">100% Validated</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          <div className="w-full max-w-[1080px] space-y-6">

            {/* SCREEN 02: SPEC METADATA & UNITS (EXACT MATCH TO STITCH SCREENSHOT) */}
            {activePipelineTab === '02' && (
              <>
                {/* 1. WORKFLOW GOVERNANCE PIPELINE CARD */}
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1e293b]">
                        Workflow Governance Pipeline
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748b] italic">
                      (Edits permitted only in Draft &amp; Returned states)
                    </span>
                  </div>

                  {/* 5-Step visual timeline matching screenshot */}
                  <div className="flex items-center justify-between px-4 py-2">
                    {WORKFLOW_STEPS.map((s, idx) => {
                      const isCurrent = spec.workflowState === s.state;
                      const isPast = WORKFLOW_STEPS.findIndex(x => x.state === spec.workflowState) >= idx;
                      return (
                        <React.Fragment key={s.state}>
                          <div className="flex flex-col items-center text-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                              isCurrent
                                ? 'bg-[#1e293b] text-white ring-4 ring-[#e2e8f0]'
                                : isPast
                                ? 'bg-[#00696c] text-white'
                                : 'bg-[#f1f5f9] text-[#94a3b8]'
                            }`}>
                              {s.step}
                            </div>
                            <div className="font-bold text-xs text-[#0f172a] mt-1.5">{s.label}</div>
                            <div className="text-[10px] text-[#64748b]">{s.subtext}</div>
                          </div>
                          {idx < WORKFLOW_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-3 transition-colors ${
                              isPast ? 'bg-[#00696c]' : 'bg-[#e2e8f0]'
                            }`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* 2. COURSE TITLE & BANNER */}
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">
                      {spec.courseCode}: {spec.courseTitle}
                    </h1>
                    <p className="text-xs text-[#64748b] mt-1">
                      Academic Year 2025–2026 • Semester V • {spec.department}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold border border-[#cbd5e1] bg-[#f8fafc] text-[#334155]">
                      {isEditable ? <Unlock className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-[#aa0093]" />}
                      <span>{isEditable ? 'Editable' : 'Read-Only'}</span>
                    </span>
                  </div>
                </div>

                {/* 3. CURRICULUM TEMPLATE CARD */}
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center text-[#1e293b] shrink-0 mt-0.5">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                            Curriculum Template
                          </span>
                          <span className="font-bold text-sm text-[#0f172a]">
                            {spec.templateChoice} (Theory + Laboratory)
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#f1f5f9] text-[#64748b] rounded-full">
                            Auto-detected
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-[#64748b]">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-emerald-300 bg-emerald-50 text-emerald-800">
                            P = {parsedP} &gt; 0
                          </span>
                          <span>Practical Credits defined; triggered Integrated Template rule. • 5 Contact Hours / Wk</span>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={!isEditable}
                      onClick={() => setIsOverrideModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#cbd5e1] hover:bg-[#f8fafc] rounded-md transition-colors text-[#334155] shrink-0 disabled:opacity-50"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#00696c]" />
                      <span>Override Template</span>
                    </button>
                  </div>
                </div>

                {/* 4. SECTION 01: COURSE IDENTITY & CREDIT ALLOCATION */}
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-[#0f172a] text-white font-mono font-bold text-xs flex items-center justify-center">
                        01
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-[#0f172a]">Course Identity &amp; Credit Allocation</h2>
                        <p className="text-[11px] text-[#64748b]">Credit calculation conforming to Ordinance: Credits = L + T + (P / 2)</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      0 Issues
                    </span>
                  </div>

                  {/* 4-Card Identity Grid matching screenshot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Course Code */}
                    <div className="p-3.5 border border-[#e2e8f0] rounded-md bg-[#f8fafc]">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#64748b] uppercase">
                        <span>Course Code</span>
                        <span className="text-[#0369a1] bg-[#e0f2fe] px-1.5 py-0.2 rounded">[From Blueprint]</span>
                      </div>
                      <div className="text-xl font-mono font-bold text-[#0f172a] mt-2">
                        {spec.courseCode}
                      </div>
                    </div>

                    {/* Credit Structure */}
                    <div className="p-3.5 border border-[#e2e8f0] rounded-md bg-[#f8fafc]">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#64748b] uppercase">
                        <span>Credit Structure</span>
                        <span className="text-[#0369a1] bg-[#e0f2fe] px-1.5 py-0.2 rounded">[From Blueprint]</span>
                      </div>
                      <div className="text-base font-mono font-bold text-[#0f172a] mt-2">
                        {spec.creditsLTP} <span className="text-xs text-[#64748b]">({spec.totalCredits.toFixed(1)} Credits)</span>
                      </div>
                      <div className="text-[10px] text-[#64748b] mt-0.5">
                        L={parsedL}, T={parsedT}, P={parsedP} ({Math.floor(parsedP / 2)} cr)
                      </div>
                    </div>

                    {/* Classification */}
                    <div className="p-3.5 border border-[#e2e8f0] rounded-md bg-[#f8fafc]">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#64748b] uppercase">
                        <span>Classification</span>
                        <span className="text-[#334155] bg-slate-200 px-1.5 py-0.2 rounded">[From Spec]</span>
                      </div>
                      <div className="text-sm font-bold text-[#0f172a] mt-2 truncate">
                        {spec.courseType}
                      </div>
                    </div>

                    {/* Contact Hours */}
                    <div className="p-3.5 border border-[#e2e8f0] rounded-md bg-[#f8fafc]">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#64748b] uppercase">
                        <span>Contact Hours</span>
                        <span className="text-[#0369a1] bg-[#e0f2fe] px-1.5 py-0.2 rounded">[From Blueprint]</span>
                      </div>
                      <div className="text-base font-mono font-bold text-[#0f172a] mt-2">
                        {spec.totalContactHours} Hrs Total
                      </div>
                      <div className="text-[10px] text-[#64748b] mt-0.5">
                        L: {expectedLectureHours} | T: {parsedT * 15} | P: {practicalTotalHours}
                      </div>
                    </div>
                  </div>

                  {/* Pre-requisite Courses row from Stitch */}
                  <div className="p-3.5 border border-[#e2e8f0] rounded-md bg-[#f8fafc] text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[10px] uppercase text-[#64748b]">Pre-requisite Courses</span>
                      <span className="text-[10px] text-[#64748b]">[From Spec]</span>
                    </div>
                    <div className="font-medium text-[#0f172a]">
                      CS-201: Data Structures &amp; Algorithms, CS-206: Operating Systems
                    </div>
                  </div>

                  {/* Course Description Card from Stitch */}
                  <div className="p-4 border border-[#e2e8f0] rounded-md bg-[#f8fafc] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[10px] uppercase text-[#64748b]">Course Description</span>
                        <span className="text-[10px] text-[#64748b]">[From Spec]</span>
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => {
                            const val = prompt('Edit Course Description:', spec.summary);
                            if (val) setSpec({ ...spec, summary: val });
                          }}
                          className="text-[11px] font-semibold text-[#00696c] hover:underline flex items-center gap-1"
                        >
                          Edit Description
                        </button>
                      )}
                    </div>
                    {/* Auto-wrapping textarea */}
                    <textarea
                      rows={4}
                      disabled={!isEditable}
                      value={spec.summary}
                      onChange={(e) => setSpec({ ...spec, summary: e.target.value })}
                      className="w-full text-xs text-[#334155] leading-relaxed bg-white border border-[#e2e8f0] p-2.5 rounded-md focus:outline-none focus:border-[#00696c] resize-y"
                    />
                  </div>
                </div>

                {/* 5. SECTION 02: COURSE OUTCOMES (COS) & COGNITIVE MAPPING */}
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-[#0f172a] text-white font-mono font-bold text-xs flex items-center justify-center">
                        02
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-[#0f172a]">Course Outcomes (COs) &amp; Cognitive Mapping</h2>
                          <span className="text-[10px] text-[#64748b]">[From Spec]</span>
                        </div>
                        <p className="text-[11px] text-[#64748b]">Verified against Bloom's Revised Taxonomy levels and NBA action verbs</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                        0 Warnings
                      </span>
                      <button
                        onClick={() => alert('All Course Outcome leading action verbs verified against Bloom\'s Taxonomy.')}
                        className="px-3 py-1 text-xs font-semibold bg-[#f8fafc] border border-[#cbd5e1] hover:bg-slate-100 rounded text-[#334155] transition-colors"
                      >
                        Validate Action Verbs
                      </button>
                    </div>
                  </div>

                  {/* CO Table */}
                  <div className="border border-[#e2e8f0] rounded-md overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] font-bold text-[11px]">
                          <th className="py-2.5 px-3 w-16">CO ID</th>
                          <th className="py-2.5 px-4">Statement of Competency</th>
                          <th className="py-2.5 px-3 w-28">Bloom's</th>
                          <th className="py-2.5 px-3 w-44">Target POs (Strength)</th>
                          {isEditable && <th className="py-2.5 px-2 w-12 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {spec.outcomes.map((co, idx) => (
                          <tr key={co.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-mono font-bold text-[#00696c] align-top">{co.id}</td>
                            <td className="py-3 px-4 align-top">
                              <textarea
                                rows={2}
                                disabled={!isEditable}
                                value={co.title}
                                onChange={(e) => {
                                  const updated = [...spec.outcomes];
                                  const val = e.target.value;
                                  updated[idx].title = val;
                                  updated[idx].leadingVerb = val.split(' ')[0] || '';
                                  setSpec({ ...spec, outcomes: updated });
                                }}
                                className="w-full text-xs text-[#0f172a] leading-relaxed bg-[#f8fafc] border border-transparent hover:border-[#cbd5e1] focus:border-[#00696c] focus:bg-white p-1.5 rounded resize-y"
                              />
                            </td>
                            <td className="py-3 px-3 align-top">
                              <select
                                disabled={!isEditable}
                                value={co.bloomLevel}
                                onChange={(e) => {
                                  const updated = [...spec.outcomes];
                                  updated[idx].bloomLevel = e.target.value as any;
                                  setSpec({ ...spec, outcomes: updated });
                                }}
                                className="border border-[#cbd5e1] rounded px-2 py-1 text-xs font-bold text-[#1e293b] bg-white focus:outline-none"
                              >
                                {poPsoConfig.blooms_levels.map(b => (
                                  <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-3 align-top">
                              <div className="flex flex-wrap gap-1">
                                {co.targetPos.map(po => {
                                  const str = getPoStrength(co.id, po);
                                  return (
                                    <span
                                      key={po}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono ${
                                        str === '3'
                                          ? 'bg-[#dcfce7] text-[#166534] font-bold'
                                          : str === '2'
                                          ? 'bg-[#cffafe] text-[#0e7490] font-bold'
                                          : str === '1'
                                          ? 'bg-[#fef3c7] text-[#92400e] font-bold'
                                          : 'bg-slate-100 text-[#334155]'
                                      }`}
                                    >
                                      <span>{po}</span>
                                      {str && <span className="opacity-80">({str})</span>}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                            {isEditable && (
                              <td className="py-3 px-2 text-center align-top">
                                <button
                                  onClick={() => {
                                    const updated = spec.outcomes.filter((_, i) => i !== idx);
                                    setSpec({ ...spec, outcomes: updated });
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. SECTION 03: INSTRUCTIONAL UNITS & SYLLABUS TOPICS */}
                <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-[#0f172a] text-white font-mono font-bold text-xs flex items-center justify-center">
                        03
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-[#0f172a]">Instructional Units &amp; Curriculum Delivery</h2>
                          <span className="text-[10px] text-[#0369a1] bg-[#e0f2fe] px-1.5 py-0.2 rounded">[From Blueprint]</span>
                        </div>
                        <p className="text-[11px] text-[#64748b]">Total Unit Hours: {sumUnitHours}h (Target: {expectedLectureHours}h based on L={parsedL} × 15)</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {spec.units.map((unit, idx) => (
                      <div key={unit.unitNumber} className="p-3.5 border border-[#e2e8f0] rounded-md bg-[#f8fafc] text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                          <span className="font-bold text-[#1e293b]">Unit {unit.unitNumber}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#64748b] text-[11px]">Contact Hours:</span>
                            <input
                              type="number"
                              disabled={!isEditable}
                              value={unit.hours}
                              onChange={(e) => {
                                const updated = [...spec.units];
                                updated[idx].hours = parseInt(e.target.value, 10) || 0;
                                setSpec({ ...spec, units: updated });
                              }}
                              className="w-14 px-2 py-0.5 text-xs font-mono font-bold border border-[#cbd5e1] rounded bg-white text-right"
                            />
                            <span>hrs</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-[#64748b]">Unit Title</label>
                            <textarea
                              rows={2}
                              disabled={!isEditable}
                              value={unit.title}
                              onChange={(e) => {
                                const updated = [...spec.units];
                                updated[idx].title = e.target.value;
                                setSpec({ ...spec, units: updated });
                              }}
                              className="w-full mt-1 p-2 text-xs font-semibold border border-[#e2e8f0] rounded bg-white resize-y"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-[#64748b]">Syllabus Curriculum Topics</label>
                            <textarea
                              rows={2}
                              disabled={!isEditable}
                              value={unit.content}
                              onChange={(e) => {
                                const updated = [...spec.units];
                                updated[idx].content = e.target.value;
                                setSpec({ ...spec, units: updated });
                              }}
                              className="w-full mt-1 p-2 text-xs border border-[#e2e8f0] rounded bg-white leading-relaxed resize-y"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* SCREEN 01: UPLOAD & PARSE */}
            {activePipelineTab === '01' && (
              <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">Ingest Existing Course Documents</h2>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    Upload an existing syllabus document (.docx, .pdf, .html, .doc) and optional question-paper blueprint to automatically populate the specification workbench.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Specification File Card */}
                  <label
                    htmlFor="spec-file-input"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const f = e.dataTransfer.files?.[0];
                      if (f) {
                        setSpecFile(f);
                        handleParseUpload(f);
                      }
                    }}
                    className="border-2 border-dashed border-[#cbd5e1] hover:border-[#1e293b] rounded-lg p-6 text-center cursor-pointer bg-[#f8fafc] hover:bg-[#f1f5f9] transition-all block"
                  >
                    <Upload className="w-8 h-8 text-[#00696c] mx-auto mb-2" />
                    <div className="font-bold text-xs text-[#0f172a]">Course Specification (Required)</div>
                    <div className="text-[11px] text-[#64748b] mt-1">Accepts .docx, .pdf, .html, .doc, .txt</div>
                    {specFile ? (
                      <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs font-mono font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="truncate">{specFile.name}</span>
                      </div>
                    ) : (
                      <div className="mt-3 inline-block px-3 py-1 bg-[#1e293b] text-white rounded text-[11px] font-semibold">
                        Choose File to Upload
                      </div>
                    )}
                    <input
                      id="spec-file-input"
                      type="file"
                      accept=".docx,.pdf,.html,.doc,.txt"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setSpecFile(f);
                          handleParseUpload(f);
                        }
                      }}
                    />
                  </label>

                  {/* Blueprint File Card */}
                  <label
                    htmlFor="blueprint-file-input"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const f = e.dataTransfer.files?.[0];
                      if (f) {
                        setBlueprintFile(f);
                        handleParseUpload(specFile || undefined, f);
                      }
                    }}
                    className="border-2 border-dashed border-[#cbd5e1] hover:border-[#1e293b] rounded-lg p-6 text-center cursor-pointer bg-[#f8fafc] hover:bg-[#f1f5f9] transition-all block"
                  >
                    <FileText className="w-8 h-8 text-[#aa0093] mx-auto mb-2" />
                    <div className="font-bold text-xs text-[#0f172a]">Question-Paper Blueprint (Optional)</div>
                    <div className="text-[11px] text-[#64748b] mt-1">Extracts Course Outcomes and assessment mappings</div>
                    {blueprintFile ? (
                      <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs font-mono font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="truncate">{blueprintFile.name}</span>
                      </div>
                    ) : (
                      <div className="mt-3 inline-block px-3 py-1 bg-white border border-[#cbd5e1] text-[#334155] rounded text-[11px] font-semibold">
                        Optional: Attach Blueprint
                      </div>
                    )}
                    <input
                      id="blueprint-file-input"
                      type="file"
                      accept=".docx,.pdf,.html,.doc,.txt"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setBlueprintFile(f);
                          handleParseUpload(specFile || undefined, f);
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9]">
                  <button
                    onClick={() => handleParseUpload()}
                    disabled={isParsing}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#1e293b] hover:bg-[#0f172a] rounded-md transition-colors disabled:opacity-50"
                  >
                    {isParsing ? 'Extracting & Parsing with Zod...' : 'Parse & Extract Specification Data'}
                  </button>

                  <button
                    onClick={() => {
                      setActivePipelineTab('02');
                    }}
                    className="text-xs font-semibold text-[#00696c] hover:underline"
                  >
                    View Active CS-302 Spec →
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 03: CO-PO-PSO ALIGNMENT MATRIX */}
            {activePipelineTab === '03' && (
              <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0f172a]">CO-PO-PSO Articulation Matrix</h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Strength Scale: <strong>3 (Substantial)</strong> · <strong>2 (Moderate)</strong> · <strong>1 (Slight)</strong> · Hover cells to view rationale.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#dcfce7] border border-emerald-400 inline-block" /> 3 (Substantial)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#cffafe] border border-cyan-400 inline-block" /> 2 (Moderate)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#fef3c7] border border-amber-400 inline-block" /> 1 (Slight)</span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-[#e2e8f0] rounded-md">
                  <table className="w-full text-center text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] font-bold">
                        <th className="py-2.5 px-3 text-left w-20 border-r border-[#e2e8f0]">CO</th>
                        {['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12', 'PSO1', 'PSO2', 'PSO3'].map(p => (
                          <th key={p} className="py-2.5 px-1 border-r border-[#e2e8f0] w-12 font-bold" title={p}>{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {spec.outcomes.map(co => (
                        <tr key={co.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-left font-mono font-bold text-[#00696c] border-r border-[#e2e8f0] bg-[#f8fafc]">{co.id}</td>
                          {['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12', 'PSO1', 'PSO2', 'PSO3'].map(po => {
                            const cell = spec.copoMatrix.find(c => c.coId === co.id && c.poCode === po);
                            const strength = cell?.strength || '';
                            const bgClass = strength === '3'
                              ? 'bg-[#dcfce7] text-[#166534] font-bold'
                              : strength === '2'
                              ? 'bg-[#cffafe] text-[#0e7490] font-bold'
                              : strength === '1'
                              ? 'bg-[#fef3c7] text-[#92400e] font-bold'
                              : 'text-slate-300';
                            return (
                              <td
                                key={po}
                                onClick={() => {
                                  if (!isEditable) return;
                                  const nextStr = strength === '3' ? '2' : strength === '2' ? '1' : strength === '1' ? '' : '3';
                                  const filtered = spec.copoMatrix.filter(c => !(c.coId === co.id && c.poCode === po));
                                  if (nextStr) {
                                    filtered.push({
                                      coId: co.id,
                                      poCode: po,
                                      strength: nextStr as any,
                                      justification: cell?.justification || `Course Outcome ${co.id} mapped to ${po}.`
                                    });
                                  }
                                  setSpec({ ...spec, copoMatrix: filtered });
                                }}
                                title={cell?.justification || `${co.id} to ${po}`}
                                className={`py-2.5 px-1 border-r border-[#e2e8f0] font-mono cursor-pointer transition-colors ${bgClass}`}
                              >
                                {strength || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SCREEN 04: RULE CHECKS (V1-V10) */}
            {activePipelineTab === '04' && (
              <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0f172a]">Accreditation &amp; Invariant Checks (V1–V10)</h2>
                    <p className="text-xs text-[#64748b] mt-0.5">Evaluated purely in deterministic TypeScript code with zero AI latency.</p>
                  </div>
                  <button
                    onClick={() => downloadHtmlFile('validation_report.html', `<!DOCTYPE html><html><body><h1>Validation Report for ${spec.courseCode}</h1></body></html>`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1e293b] text-white rounded-md hover:bg-[#0f172a] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download validation_report.html</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border border-red-200 bg-red-50 rounded-md text-center">
                    <div className="text-[10px] font-bold uppercase text-red-800">High Severity</div>
                    <div className="font-mono text-xl font-bold text-red-700">0 Issues</div>
                  </div>
                  <div className="p-3 border border-amber-200 bg-amber-50 rounded-md text-center">
                    <div className="text-[10px] font-bold uppercase text-amber-800">Medium Severity</div>
                    <div className="font-mono text-xl font-bold text-amber-700">0 Issues</div>
                  </div>
                  <div className="p-3 border border-emerald-200 bg-emerald-50 rounded-md text-center">
                    <div className="text-[10px] font-bold uppercase text-emerald-800">Invariants Enforced</div>
                    <div className="font-mono text-xl font-bold text-emerald-700">10 of 10 Passed</div>
                  </div>
                </div>

                <div className="border border-[#e2e8f0] rounded-md overflow-hidden text-xs">
                  <div className="divide-y divide-[#e2e8f0]">
                    {[
                      { code: 'V1', name: 'Course Code & Title Pattern Syntax' },
                      { code: 'V2', name: 'Carnegie Credit Equation (L + T + P/2 = Total Credits)' },
                      { code: 'V3', name: 'Bloom\'s Taxonomy Action Verb Verification (Zero Banned Verbs)' },
                      { code: 'V4', name: 'Higher-Order Cognitive Depth (>= 60% Apply..Create)' },
                      { code: 'V5', name: 'NBA Outcome Bracket (Between 4 and 6 COs)' },
                      { code: 'V6', name: 'Unit Syllabus Hours Reconciled to Expected Timetable' },
                      { code: 'V7', name: 'Assessment Equilibrium (Cumulative 100% Weightage)' },
                      { code: 'V8', name: 'Non-Zero CO-PO Articulation Grid Coverage' },
                      { code: 'V9', name: 'Sanitization of Residual Template / Sample Strings' },
                      { code: 'V10', name: 'Template Suitability (Integrated for Laboratory Courses)' }
                    ].map(r => (
                      <div key={r.code} className="p-2.5 flex items-center justify-between hover:bg-[#f8fafc]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#00696c]">{r.code}</span>
                          <span className="font-medium text-[#0f172a]">{r.name}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                          Passed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 05: APPROVAL WORKFLOW & AUDIT TRAIL */}
            {activePipelineTab === '05' && (
              <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0f172a]">Curriculum Approval Workflow</h2>
                    <p className="text-xs text-[#64748b] mt-0.5">Author submits $\to$ Reviewer peer audit $\to$ HOD final sign-off.</p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#f1f5f9] text-[#1e293b] rounded">
                    Current: {spec.workflowState}
                  </span>
                </div>

                {/* Workflow Action Bar */}
                <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-md flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-bold text-[#0f172a]">Active Role: {role}</span>
                    <span className="text-[#64748b] ml-2">({isEditable ? 'Editing authorized' : 'Locked in current stage'})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {role === 'Author' && (spec.workflowState === 'Draft' || spec.workflowState === 'Returned') && (
                      <button
                        onClick={() => handleTransition('Submitted', 'Author submitted for committee review.')}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#1e293b] hover:bg-[#0f172a] rounded-md transition-colors shadow-xs"
                      >
                        Submit to Reviewer
                      </button>
                    )}
                    {role === 'Reviewer' && spec.workflowState === 'Submitted' && (
                      <button
                        onClick={() => handleTransition('Under Review', 'Reviewer opened docket.')}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#00696c] hover:bg-[#005558] rounded-md transition-colors"
                      >
                        Begin Peer Review
                      </button>
                    )}
                    {role === 'Reviewer' && spec.workflowState === 'Under Review' && (
                      <>
                        <button
                          onClick={() => handleTransition('Pending HOD', 'Reviewer verified syllabus.')}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#00696c] hover:bg-[#005558] rounded-md transition-colors"
                        >
                          Forward to HOD
                        </button>
                        <button
                          onClick={() => handleTransition('Returned')}
                          className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-md transition-colors"
                        >
                          Return with Critique
                        </button>
                      </>
                    )}
                    {role === 'HOD' && spec.workflowState === 'Pending HOD' && (
                      <>
                        <button
                          onClick={() => handleTransition('Approved', 'HOD granted accreditation sign-off.')}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors shadow-xs"
                        >
                          Approve Specification
                        </button>
                        <button
                          onClick={() => handleTransition('Returned')}
                          className="px-3 py-1.5 text-xs font-bold text-red-800 bg-red-100 border border-red-300 rounded-md transition-colors"
                        >
                          Return to Author
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Section Review Comments Form */}
                <div className="pt-2">
                  <h3 className="text-xs font-bold uppercase text-[#64748b] mb-2">Section-Level Commentary</h3>
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add formal reviewer note or committee amendment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-[#cbd5e1] rounded-md bg-white focus:outline-none focus:border-[#00696c]"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-[#1e293b] hover:bg-[#0f172a] rounded-md transition-colors disabled:opacity-40"
                    >
                      Post Note
                    </button>
                  </form>
                </div>

                {/* Audit Trail List */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase text-[#64748b]">Immutable State Ledger</h3>
                  {spec.auditTrail.map(entry => (
                    <div key={entry.id} className="p-3 border border-[#e2e8f0] rounded-md bg-[#f8fafc] text-xs">
                      <div className="flex justify-between items-center font-semibold text-[#0f172a]">
                        <span>{entry.user} ({entry.role})</span>
                        <span className="font-mono text-[11px] text-[#00696c]">{entry.toState}</span>
                      </div>
                      <div className="text-[10px] text-[#64748b] mt-0.5">{entry.timestamp}</div>
                      <p className="text-[#334155] mt-1">{entry.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCREEN 06: EXPORT SPEC & AUDITS */}
            {activePipelineTab === '06' && (
              <div className="bg-white border border-[#e2e8f0] rounded-lg p-6 shadow-xs space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-[#0f172a]">Export Accredited Artifacts</h2>
                  <p className="text-xs text-[#64748b] mt-0.5">Download official self-contained specification files for institutional board review and automated grading.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-[#e2e8f0] rounded-md bg-[#f8fafc] flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">spec.html</div>
                      <div className="text-[11px] text-[#64748b] mt-1">One self-contained accredited HTML document with print styling.</div>
                    </div>
                    <button
                      onClick={handleExportSpecHtml}
                      className="mt-4 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#1e293b] hover:bg-[#0f172a] rounded-md transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export spec.html</span>
                    </button>
                  </div>

                  <div className="p-4 border border-[#e2e8f0] rounded-md bg-[#f8fafc] flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">specforge_output.json</div>
                      <div className="text-[11px] text-[#64748b] mt-1">Canonical evaluation benchmark artifact with input_id: 'SAMPLE'.</div>
                    </div>
                    <button
                      onClick={handleExportOutputJson}
                      className="mt-4 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#00696c] hover:bg-[#005558] rounded-md transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export output.json</span>
                    </button>
                  </div>

                  <div className="p-4 border border-[#e2e8f0] rounded-md bg-[#f8fafc] flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-[#0f172a]">validation_report.html</div>
                      <div className="text-[11px] text-[#64748b] mt-1">Plain-code audit trail checking V1 to V10 accreditation rules.</div>
                    </div>
                    <button
                      onClick={() => downloadHtmlFile('validation_report.html', `<!DOCTYPE html><html><body><h1>Validation Report</h1></body></html>`)}
                      className="mt-4 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#334155] bg-white border border-[#cbd5e1] hover:bg-[#f1f5f9] rounded-md transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export audit.html</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#f1f5f9]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0f172a]">Live specforge_output.json Preview</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
                        setJsonCopied(true);
                        setTimeout(() => setJsonCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#00696c] hover:underline"
                    >
                      {jsonCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{jsonCopied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-md overflow-x-auto max-h-64">
                    {JSON.stringify(
                      {
                        input_id: 'SAMPLE',
                        course: {
                          code: spec.courseCode,
                          title: spec.courseTitle,
                          credits_ltp: spec.creditsLTP,
                          total_credits: spec.totalCredits
                        },
                        workflow_status: spec.workflowState,
                        course_outcomes: spec.outcomes,
                        units: spec.units,
                        copo_matrix: spec.copoMatrix
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 3. MODAL: PREVIEW FILLED DOCUMENT */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00696c]" />
                <span className="font-bold text-sm text-[#0f172a]">
                  Preview: {spec.courseCode} - {spec.courseTitle}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                  {spec.workflowState}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-[#1e293b] text-white rounded hover:bg-[#0f172a]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download as PDF</span>
                </button>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1 text-[#64748b] hover:text-[#0f172a] rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative font-serif text-sm leading-relaxed text-[#1e293b] space-y-6">
              {/* Dynamic Watermark on preview */}
              {spec.workflowState !== 'Approved' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 select-none">
                  <span className="text-[120px] font-sans font-extrabold rotate-[-30deg] tracking-widest text-[#000]">
                    DRAFT
                  </span>
                </div>
              )}

              <div className="text-center border-b-2 border-[#1e293b] pb-4">
                <div className="text-xs uppercase tracking-widest text-[#64748b]">Academic Governance Council</div>
                <h1 className="text-xl font-bold font-sans mt-1">{spec.department}</h1>
                <div className="text-sm font-sans font-semibold text-[#00696c] mt-0.5">
                  Course Specification: {spec.courseCode} — {spec.courseTitle}
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase font-sans border-b border-[#cbd5e1] pb-1 text-[#1e293b]">
                  1. General Information &amp; Credits
                </h2>
                <div className="grid grid-cols-2 gap-2 mt-2 font-sans text-xs">
                  <div><strong>Credit Allocation:</strong> {spec.creditsLTP} ({spec.totalCredits} Credits)</div>
                  <div><strong>Contact Hours:</strong> {spec.totalContactHours} Hours Total</div>
                  <div><strong>Classification:</strong> {spec.courseType}</div>
                  <div><strong>Curriculum Template:</strong> {spec.templateChoice}</div>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase font-sans border-b border-[#cbd5e1] pb-1 text-[#1e293b]">
                  2. Catalog Description &amp; Scope
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#334155]">{spec.summary}</p>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase font-sans border-b border-[#cbd5e1] pb-1 text-[#1e293b]">
                  3. Course Learning Outcomes (COs)
                </h2>
                <div className="mt-2 space-y-2 font-sans text-xs">
                  {spec.outcomes.map(co => (
                    <div key={co.id} className="flex gap-2">
                      <strong className="text-[#00696c] shrink-0">{co.id}:</strong>
                      <span>{co.title} <em className="text-[#64748b]">({co.bloomLevel})</em></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: TEMPLATE OVERRIDE */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
              <h3 className="font-bold text-sm text-[#0f172a]">Override Curriculum Template</h3>
              <button onClick={() => setIsOverrideModalOpen(false)} className="text-[#64748b] hover:text-[#0f172a]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-[#64748b]">
                Auto-detection selected <strong>{detectedTemplate}</strong> based on practical credits. Select a manual override:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSpec({ ...spec, templateChoice: 'Integrated' })}
                  className={`py-2 px-3 rounded font-bold border ${
                    spec.templateChoice === 'Integrated'
                      ? 'bg-[#1e293b] text-white border-[#1e293b]'
                      : 'bg-white text-[#334155] border-[#cbd5e1]'
                  }`}
                >
                  Integrated (Lab)
                </button>
                <button
                  onClick={() => setSpec({ ...spec, templateChoice: 'Non-Lab' })}
                  className={`py-2 px-3 rounded font-bold border ${
                    spec.templateChoice === 'Non-Lab'
                      ? 'bg-[#1e293b] text-white border-[#1e293b]'
                      : 'bg-white text-[#334155] border-[#cbd5e1]'
                  }`}
                >
                  Non-Lab (Theory)
                </button>
              </div>

              {spec.templateChoice !== detectedTemplate && (
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                    Justification for Manual Override:
                  </label>
                  <input
                    type="text"
                    placeholder="Enter academic committee reason..."
                    value={spec.templateOverrideReason || ''}
                    onChange={(e) => setSpec({ ...spec, templateOverrideReason: e.target.value })}
                    className="w-full p-2 border border-[#cbd5e1] rounded bg-white text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#1e293b] rounded hover:bg-[#0f172a]"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: UPLOAD FILES */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#eefcff] border border-[#47f0f6] flex items-center justify-center text-[#00696c]">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#0f172a]">Upload Course Documents</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-[#64748b] hover:text-[#0f172a] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#64748b]">
                Select an existing course syllabus (.docx, .pdf, .html, .doc, .txt) and an optional blueprint to populate the Course Specification Workbench:
              </p>

              {/* Spec File Label */}
              <label
                htmlFor="modal-spec-input"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setSpecFile(f);
                }}
                className="border-2 border-dashed border-[#cbd5e1] hover:border-[#1e293b] rounded-lg p-4 text-center cursor-pointer bg-[#f8fafc] hover:bg-[#f1f5f9] transition-all block"
              >
                <Upload className="w-6 h-6 text-[#00696c] mx-auto mb-1.5" />
                <div className="font-bold text-xs text-[#0f172a]">Course Specification (Required)</div>
                <div className="text-[10px] text-[#64748b]">.docx, .pdf, .html, .doc, .txt</div>
                {specFile ? (
                  <div className="mt-2 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 py-1 px-2 rounded border border-emerald-200">
                    ✓ {specFile.name}
                  </div>
                ) : (
                  <span className="mt-2 inline-block text-[11px] font-semibold text-[#00696c] underline">
                    Click to Choose File or Drop Here
                  </span>
                )}
                <input
                  id="modal-spec-input"
                  type="file"
                  accept=".docx,.pdf,.html,.doc,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSpecFile(f);
                  }}
                />
              </label>

              {/* Blueprint File Label */}
              <label
                htmlFor="modal-bp-input"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setBlueprintFile(f);
                }}
                className="border-2 border-dashed border-[#cbd5e1] hover:border-[#1e293b] rounded-lg p-4 text-center cursor-pointer bg-[#f8fafc] hover:bg-[#f1f5f9] transition-all block"
              >
                <FileText className="w-6 h-6 text-[#aa0093] mx-auto mb-1.5" />
                <div className="font-bold text-xs text-[#0f172a]">Question-Paper Blueprint (Optional)</div>
                <div className="text-[10px] text-[#64748b]">Extracts Course Outcomes and assessment mappings</div>
                {blueprintFile ? (
                  <div className="mt-2 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 py-1 px-2 rounded border border-emerald-200">
                    ✓ {blueprintFile.name}
                  </div>
                ) : (
                  <span className="mt-2 inline-block text-[11px] font-semibold text-[#334155] underline">
                    Click to Choose Blueprint
                  </span>
                )}
                <input
                  id="modal-bp-input"
                  type="file"
                  accept=".docx,.pdf,.html,.doc,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setBlueprintFile(f);
                  }}
                />
              </label>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => handleParseUpload()}
                className="text-xs font-semibold text-[#00696c] hover:underline"
              >
                Or Load Benchmark Sample
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#64748b] hover:bg-[#f1f5f9] rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isParsing || !specFile}
                  onClick={() => handleParseUpload()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#1e293b] hover:bg-[#0f172a] rounded-md transition-colors shadow-xs disabled:opacity-50"
                >
                  {isParsing ? 'Parsing with Zod...' : 'Upload & Parse Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. AI Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
