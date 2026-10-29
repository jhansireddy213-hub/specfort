/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CourseSpec, Role, WorkflowState, SpecForgeOutput } from './types.ts';

export interface LlmSettings {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  model: string;
}

const SETTINGS_KEY = 'specforge_llm_settings';

export function loadSettings(): LlmSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash'
  };
}

export function saveSettings(settings: LlmSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getLlmHeaders(): Record<string, string> {
  const s = loadSettings();
  const headers: Record<string, string> = {
    'x-llm-provider': s.provider,
    'x-llm-model': s.model
  };
  if (s.apiKey) {
    headers['x-llm-key'] = s.apiKey;
    headers['x-llm-api-key'] = s.apiKey;
  }
  return headers;
}

export async function checkHealth(): Promise<{ success: boolean; data: { status: string } }> {
  const res = await fetch('/api/v1/health');
  return res.json();
}

export async function checkLlm(): Promise<{ success: boolean; data: any }> {
  const res = await fetch('/api/v1/llm-check', {
    headers: getLlmHeaders()
  });
  return res.json();
}

export async function parseCourseDocuments(
  specFile?: File,
  blueprintFile?: File
): Promise<{ success: boolean; data: CourseSpec; error?: string }> {
  const formData = new FormData();
  if (specFile) formData.append('spec', specFile);
  if (blueprintFile) formData.append('blueprint', blueprintFile);

  const res = await fetch('/api/v1/parse', {
    method: 'POST',
    headers: getLlmHeaders(),
    body: formData
  });
  return res.json();
}

export async function transitionState(
  spec: CourseSpec,
  toState: WorkflowState,
  role: Role,
  user: string,
  comment: string
): Promise<{ success: boolean; data: CourseSpec; error?: string }> {
  const res = await fetch('/api/v1/workflow/transition', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getLlmHeaders()
    },
    body: JSON.stringify({ spec, toState, role, user, comment })
  });
  return res.json();
}

export async function runGeneratePipeline(
  specFile?: File,
  blueprintFile?: File
): Promise<{ success: boolean; data: { output: SpecForgeOutput; html: string }; error?: string }> {
  const formData = new FormData();
  if (specFile) formData.append('spec', specFile);
  if (blueprintFile) formData.append('blueprint', blueprintFile);

  const res = await fetch('/api/v1/generate', {
    method: 'POST',
    headers: getLlmHeaders(),
    body: formData
  });
  return res.json();
}

export function downloadJsonFile(filename: string, data: any): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadHtmlFile(filename: string, htmlContent: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
