import React from 'react';
import { format } from 'date-fns';
import { X, Mail, Clock, Calendar, CheckCircle2, AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export const EmailDetailModal = ({ email, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !email) return null;

  const handleCopyBody = () => {
    navigator.clipboard.writeText(email.body || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email Job Details</h3>
              <p className="text-[11px] font-mono text-slate-400">ID: {email.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Recipient Lead
              </span>
              <span className="text-xs font-semibold text-slate-900 break-all">{email.recipientEmail}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Sender Profile
              </span>
              <span className="text-xs font-semibold text-slate-900 break-all">{email.senderEmail}</span>
            </div>
          </div>

          {/* Timing & Status Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-brand-50/30 border border-slate-100 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                {email.status === 'SENT' ? 'Delivered At' : 'Scheduled For'}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>
                  {format(new Date(email.sentAt || email.scheduledAt), 'MMM d, yyyy h:mm:ss a')}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 text-right">
                Status
              </span>
              {email.status === 'SENT' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Delivered
                </span>
              ) : email.status === 'RATE_LIMITED_RESCHEDULED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Rate Limited (Rescheduled)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  Queued in BullMQ
                </span>
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Subject
            </label>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-900 shadow-xs">
              {email.subject}
            </div>
          </div>

          {/* Email Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Email Message Content
              </label>
              <button
                onClick={handleCopyBody}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand-600 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Body'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans max-h-48 overflow-y-auto">
              {email.body}
            </div>
          </div>

          {/* Ethereal Preview Button if sent */}
          {email.etherealPreviewUrl && (
            <div className="pt-2">
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-brand-500/20 hover:shadow-lg transition"
              >
                <span>Open in Ethereal Email Inspector</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
