/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Key, Cpu, Check, AlertCircle, Eye, EyeOff, X, Sparkles } from 'lucide-react';
import { loadSettings, saveSettings, checkLlm } from './api.ts';
import type { LlmSettings } from './api.ts';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [settings, setSettings] = useState<LlmSettings>({
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash'
  });
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; message?: string; success?: boolean }>({
    testing: false
  });

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
      setTestStatus({ testing: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveSettings(settings);
    onClose();
  };

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    saveSettings(settings);
    try {
      const res = await checkLlm();
      if (res.success && res.data.ready) {
        setTestStatus({
          testing: false,
          success: true,
          message: res.data.message || 'Connection verified successfully!'
        });
      } else {
        setTestStatus({
          testing: false,
          success: false,
          message: res.data?.message || 'Connection failed. Please check your API key.'
        });
      }
    } catch (err: any) {
      setTestStatus({
        testing: false,
        success: false,
        message: err.message || 'Network error reaching server.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#eefcff] border border-[#47f0f6] flex items-center justify-center text-[#00696c]">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-display text-base text-[#001f24] tracking-tight">AI Provider & Key Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#6b7a7a] hover:text-[#001f24] rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs font-body">
          {/* Security Banner */}
          <div className="p-3 bg-[#eefcff] border border-[#47f0f6] rounded flex items-start gap-2.5 text-[#001f24]">
            <Shield className="w-4 h-4 text-[#00696c] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-[#00696c]">Strict Stateless Security:</strong> Your key is stored solely in browser storage and injected as <code className="bg-white px-1 py-0.2 rounded border border-[#bac9ca] text-[#aa0093]">x-llm-*</code> request headers. It is never saved to files or disk.
            </div>
          </div>

          {/* Provider Selector */}
          <div>
            <label className="block font-label text-[11px] font-bold uppercase text-[#6b7a7a] mb-1.5">
              AI Engine Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['gemini', 'openai', 'anthropic'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const defaultModel = p === 'gemini' ? 'gemini-2.5-flash' : p === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet-20241022';
                    setSettings({ ...settings, provider: p, model: defaultModel });
                  }}
                  className={`py-2 px-3 rounded border text-xs font-semibold capitalize transition-all ${
                    settings.provider === p
                      ? 'bg-[#00696c] text-white border-[#00696c] shadow-xs'
                      : 'bg-white text-[#3b494a] border-[#e2e8f0] hover:border-[#bac9ca]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="block font-label text-[11px] font-bold uppercase text-[#6b7a7a] mb-1">
              Model Identifier
            </label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="w-full px-3 py-1.5 text-xs font-mono border border-[#e2e8f0] rounded focus:outline-none focus:border-[#00696c] bg-slate-50"
              placeholder="e.g. gemini-2.5-flash"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block font-label text-[11px] font-bold uppercase text-[#6b7a7a] mb-1">
              API Access Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                className="w-full pl-3 pr-9 py-1.5 text-xs font-mono border border-[#e2e8f0] rounded focus:outline-none focus:border-[#00696c] bg-slate-50"
                placeholder="Enter AI API Key (leave empty for rule-engine fallback)"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-2 text-[#6b7a7a] hover:text-[#001f24]"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Live Connection Test status */}
          {testStatus.message && (
            <div
              className={`p-2.5 rounded text-[11px] border flex items-center gap-2 ${
                testStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {testStatus.success ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e2e8f0] bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus.testing}
            className="px-3 py-1.5 text-xs font-semibold text-[#00696c] hover:bg-[#eefcff] border border-[#47f0f6] rounded transition-colors disabled:opacity-50"
          >
            {testStatus.testing ? 'Testing...' : 'Test Probe'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#3b494a] hover:bg-slate-200 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#00696c] hover:bg-[#005558] rounded transition-colors shadow-xs"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
