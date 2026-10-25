import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Calendar, Clock, Gauge, Mail, Sparkles, CheckCircle2, UserX } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const ComposeModal = ({ isOpen, onClose, onScheduledSuccess }) => {
  const { success, error, info } = useToast();
  const fileInputRef = useRef(null);

  // Form State
  const [senders, setSenders] = useState([]);
  const [selectedSender, setSelectedSender] = useState('sales@reachinbox.test');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [rawRecipientsText, setRawRecipientsText] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState([]);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Scheduling options
  const [startTime, setStartTime] = useState(() => {
    const d = new Date(Date.now() + 60000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2); // seconds
  const [hourlyLimit, setHourlyLimit] = useState(50); // emails per hour
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load available senders
  useEffect(() => {
    if (isOpen) {
      api.getSenders()
        .then((data) => {
          setSenders(data || []);
          const defaultSender = (data || []).find((s) => s.isDefault);
          if (defaultSender) setSelectedSender(defaultSender.email);
        })
        .catch((err) => console.warn('Could not load senders:', err));
    }
  }, [isOpen]);

  // Extract clean unique emails
  const extractEmails = (text) => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const matches = text.match(emailRegex) || [];
    return Array.from(new Set(matches.map((e) => e.toLowerCase().trim())));
  };

  const handleRecipientsChange = (val) => {
    setRawRecipientsText(val);
    const emails = extractEmails(val);
    setParsedRecipients(emails);
  };

  const removeRecipient = (indexToRemove) => {
    const updated = parsedRecipients.filter((_, idx) => idx !== indexToRemove);
    setParsedRecipients(updated);
    setRawRecipientsText(updated.join(', '));
  };

  const handleFileProcess = (file) => {
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
      success(`Detected ${emails.length} leads from ${file.name}!`);
    };

    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  // 1-Click Sample Demo Auto-fill
  const fillSampleSequence = () => {
    const sampleLeads = [
      'alex.rivera@example.com',
      'sarah.c@techcorp.io',
      'david.kim@outreachflow.com',
      'emily.watson@growthpulse.co',
      'michael.chen@venturelabs.net',
    ];
    setParsedRecipients(sampleLeads);
    setRawRecipientsText(sampleLeads.join(', '));
    setSubject('Automating cold email sequences with ReachInbox.ai');
    setBody(`Hey there,\n\nI noticed your team has been scaling outreach across multiple channels. Our distributed scheduler allows you to maintain consistent email deliverability with zero missed schedules and automated hourly throttling.\n\nWould you be open to a 5-min intro this Thursday?\n\nBest,\nReachInbox Growth Team`);
    info('Sample sequence filled for instant testing!');
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();

    if (parsedRecipients.length === 0) {
      error('Please provide at least one recipient lead or upload a leads file.');
      return;
    }

    if (!subject.trim()) {
      error('Subject line is required.');
      return;
    }

    if (!body.trim()) {
      error('Email body is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        recipients: parsedRecipients,
        senderEmail: selectedSender,
        subject: subject.trim(),
        body: body.trim(),
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmails: Math.max(0, delayBetweenEmails * 1000),
        hourlyLimit,
      };

      const result = await api.scheduleEmails(payload);
      success(`Successfully scheduled ${result.totalScheduled} email(s) into BullMQ!`);

      // Reset
      setSubject('');
      setBody('');
      setRawRecipientsText('');
      setParsedRecipients([]);
      setUploadedFileName(null);
      onScheduledSuccess();
      onClose();
    } catch (err) {
      error(err.message || 'Failed to schedule emails.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200/90 overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-brand-50/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20 font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Compose Email Sequence</h3>
              <p className="text-xs text-slate-500">Configure multi-sender routing, throttling & lead lists</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fillSampleSequence}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition"
              title="Auto-fill with sample sequence"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Fill Sample Data</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleScheduleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Sender Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Sender Account (Multi-Sender Support)
            </label>
            <select
              value={selectedSender}
              onChange={(e) => setSelectedSender(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-xs"
            >
              {senders.map((s) => (
                <option key={s.email} value={s.email}>
                  {s.name} — {s.email} {s.isDefault ? '[Default Sender]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Recipients Upload Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Recipients & Leads
              </label>

              {parsedRecipients.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {parsedRecipients.length} {parsedRecipients.length === 1 ? 'lead' : 'leads'} detected
                </span>
              )}
            </div>

            {/* Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition mb-2.5 ${
                isDragging
                  ? 'border-brand-600 bg-brand-50/50 scale-[1.01]'
                  : 'border-slate-200 hover:border-brand-400 bg-slate-50/60 hover:bg-brand-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={(e) => handleFileProcess(e.target.files?.[0])}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2.5 text-xs text-slate-600">
                <UploadCloud className="w-5 h-5 text-brand-600" />
                <span className="font-bold text-brand-700 hover:underline">
                  {uploadedFileName ? `Re-upload (${uploadedFileName})` : 'Drag & drop leads CSV / TXT or browse file'}
                </span>
                <span className="text-slate-400 text-[11px]">· e.g. sample_leads.csv</span>
              </div>
            </div>

            {/* Recipients text area */}
            <textarea
              value={rawRecipientsText}
              onChange={(e) => handleRecipientsChange(e.target.value)}
              placeholder="Or type/paste emails separated by commas or newlines..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-xs placeholder:text-slate-400 font-mono"
            />

            {/* Detected Lead Chips (removable) */}
            {parsedRecipients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                {parsedRecipients.slice(0, 20).map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs group"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(idx)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {parsedRecipients.length > 20 && (
                  <span className="text-[11px] font-semibold text-slate-500 self-center pl-1">
                    +{parsedRecipients.length - 20} more leads
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scaling cold email outreach with automated sequences"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-xs placeholder:text-slate-400"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Content
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there,&#10;&#10;Wanted to connect regarding our AI-driven email scheduler workflows..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-xs placeholder:text-slate-400 font-sans leading-relaxed"
            />
          </div>

          {/* Scheduling Controls */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Start Time */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" />
                  <span>Start Time</span>
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Delay Between Sends */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  <span>Send Delay</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={delayBetweenEmails}
                    onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-xs font-bold text-slate-500">sec</span>
                </div>
              </div>

              {/* Hourly Rate Limit */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  <Gauge className="w-3.5 h-3.5 text-brand-600" />
                  <span>Hourly Limit</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="text-xs font-bold text-slate-500">/hr</span>
                </div>
              </div>
            </div>

            {/* Quick Delay Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Presets:</span>
              <button
                type="button"
                onClick={() => setDelayBetweenEmails(0)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  delayBetweenEmails === 0 ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                }`}
              >
                Instant (0s)
              </button>
              <button
                type="button"
                onClick={() => setDelayBetweenEmails(2)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  delayBetweenEmails === 2 ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                }`}
              >
                Standard (2s)
              </button>
              <button
                type="button"
                onClick={() => setDelayBetweenEmails(5)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  delayBetweenEmails === 5 ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
                }`}
              >
                Safe Throttle (5s)
              </button>
              <button
                type="button"
                onClick={() => setHourlyLimit(2)}
                className="ml-auto px-2 py-0.5 rounded text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition"
                title="Quickly test rate limiting with 2 emails/hour"
              >
                Test Limit (2/hr)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 transition transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Queueing in BullMQ...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Schedule {parsedRecipients.length > 0 ? `${parsedRecipients.length} Email(s)` : 'Sequence'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
