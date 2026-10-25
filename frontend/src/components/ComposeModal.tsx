import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Calendar, Clock, Gauge, Mail, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { SenderProfile, SchedulePayload } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onScheduledSuccess }) => {
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [senders, setSenders] = useState<SenderProfile[]>([]);
  const [selectedSender, setSelectedSender] = useState<string>('sales@reachinbox.test');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [rawRecipientsText, setRawRecipientsText] = useState<string>('');
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Scheduling options
  const [startTime, setStartTime] = useState<string>(() => {
    // Default to 1 minute in the future
    const d = new Date(Date.now() + 60000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delayBetweenEmails, setDelayBetweenEmails] = useState<number>(2); // seconds
  const [hourlyLimit, setHourlyLimit] = useState<number>(50); // emails per hour
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load available senders
  useEffect(() => {
    if (isOpen) {
      api.getSenders()
        .then((data) => {
          setSenders(data);
          const defaultSender = data.find((s) => s.isDefault);
          if (defaultSender) setSelectedSender(defaultSender.email);
        })
        .catch((err) => console.warn('Could not load senders:', err));
    }
  }, [isOpen]);

  // Parse text or CSV content into clean unique email list
  const extractEmails = (text: string): string[] => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = text.match(emailRegex) || [];
    // Deduplicate and trim
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  };

  // Recipient input change
  const handleRecipientsChange = (val: string) => {
    setRawRecipientsText(val);
    const emails = extractEmails(val);
    setParsedRecipients(emails);
  };

  // Handle CSV/text file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      const emails = extractEmails(content);

      if (emails.length === 0) {
        error('No valid email addresses found in the uploaded file.');
        return;
      }

      setParsedRecipients(emails);
      setRawRecipientsText(emails.join(', '));
      success(`Successfully detected ${emails.length} email addresses from ${file.name}!`);
    };

    reader.onerror = () => {
      error('Failed to read uploaded file.');
    };

    reader.readAsText(file);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedRecipients.length === 0) {
      error('Please provide at least one valid recipient email address or upload a CSV file.');
      return;
    }

    if (!subject.trim()) {
      error('Subject is required.');
      return;
    }

    if (!body.trim()) {
      error('Email body is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: SchedulePayload = {
        recipients: parsedRecipients,
        senderEmail: selectedSender,
        subject: subject.trim(),
        body: body.trim(),
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails: Math.max(0, delayBetweenEmails * 1000), // convert to ms
        hourlyLimit,
      };

      const result = await api.scheduleEmails(payload);
      success(`Successfully scheduled ${result.totalScheduled} email(s) for delivery!`);

      // Reset fields
      setSubject('');
      setBody('');
      setRawRecipientsText('');
      setParsedRecipients([]);
      setUploadedFileName(null);
      onScheduledSuccess();
      onClose();
    } catch (err) {
      error((err as Error).message || 'Failed to schedule emails.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Compose & Schedule Sequence</h3>
              <p className="text-xs text-slate-500">Configure delays, lead lists, and throttling</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleScheduleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Sender Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Sender Email
            </label>
            <select
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm"
            >
              {senders.map((s) => (
                <option key={s.email} value={s.email}>
                  {s.name} ({s.email}) {s.isDefault ? '— [Default]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Recipients Upload & Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Recipients (CSV or Manual)
              </label>

              {parsedRecipients.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3 h-3" />
                  {parsedRecipients.length} {parsedRecipients.length === 1 ? 'lead' : 'leads'} detected
                </span>
              )}
            </div>

            {/* CSV Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 rounded-xl p-3.5 text-center cursor-pointer transition mb-2 bg-slate-50/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                <UploadCloud className="w-4 h-4 text-brand-600" />
                <span className="font-semibold text-brand-600 hover:underline">
                  {uploadedFileName ? `Re-upload (${uploadedFileName})` : 'Upload leads CSV or TXT file'}
                </span>
                <span className="text-slate-400">· comma, newline, or column separated</span>
              </div>
            </div>

            {/* Textarea for Manual paste */}
            <textarea
              value={rawRecipientsText}
              onChange={(e) => handleRecipientsChange(e.target.value)}
              placeholder="Or paste leads here (e.g. john@example.com, sarah@company.org)..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm placeholder:text-slate-400"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Quick question regarding cold email workflows"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm placeholder:text-slate-400"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there,&#10;&#10;Wanted to check if you're exploring ways to scale your outreach pipeline..."
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-sm placeholder:text-slate-400 font-sans"
            />
          </div>

          {/* Scheduling & Rate Limiting Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            {/* Start Time */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Delay Between Sends */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                <span>Delay (Seconds)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={delayBetweenEmails}
                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Min pause between sends</span>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                <Gauge className="w-3.5 h-3.5 text-brand-600" />
                <span>Hourly Limit</span>
              </label>
              <input
                type="number"
                min="1"
                step="5"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Max sends/hour/sender</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scheduling Jobs...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Schedule {parsedRecipients.length > 0 ? `${parsedRecipients.length} Email(s)` : 'Emails'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
