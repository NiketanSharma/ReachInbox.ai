import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { ScheduledEmailsTable } from './components/ScheduledEmailsTable';
import { SentEmailsTable } from './components/SentEmailsTable';
import { ComposeModal } from './components/ComposeModal';
import { SlackModal } from './components/SlackModal';
import { api } from './services/api';
import { useToast } from './context/ToastContext';
import { Plus, Clock, CheckCircle2, Users, Activity, Zap, RefreshCw, RotateCcw } from 'lucide-react';

export const App = () => {
  const { success, error, info } = useToast();

  // Active Tab: 'scheduled' | 'sent'
  const [activeTab, setActiveTab] = useState('scheduled');

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);

  // Email Data
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [sentEmails, setSentEmails] = useState([]);
  const [sendersList, setSendersList] = useState([]);
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isQuickSending, setIsQuickSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [slackStatus, setSlackStatus] = useState(null);

  // Rate limit tracking for default sender
  const [rateLimitInfo, setRateLimitInfo] = useState({ currentCount: 0, limit: 50, remaining: 50 });

  // Fetch Scheduled Emails
  const fetchScheduled = useCallback(async (query = '') => {
    try {
      if (!query) setIsLoadingList(true);
      const data = await api.getScheduledEmails({ search: query });
      setScheduledEmails(data.emails || []);
      if (!query) {
        setTotalScheduled(data.total || (data.emails ? data.emails.length : 0));
      }
    } catch (err) {
      console.warn('Could not load scheduled emails:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Fetch Sent Emails
  const fetchSent = useCallback(async (query = '') => {
    try {
      if (!query) setIsLoadingList(true);
      const data = await api.getSentEmails({ search: query });
      setSentEmails(data.emails || []);
      if (!query) {
        setTotalSent(data.total || (data.emails ? data.emails.length : 0));
      }
    } catch (err) {
      console.warn('Could not load sent emails:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Fetch Slack status
  const fetchSlackStatus = useCallback(async () => {
    try {
      const status = await api.getSlackStatus();
      setSlackStatus(status);
    } catch (err) {
      console.warn('Could not load Slack status:', err);
    }
  }, []);

  // Fetch available senders dynamically
  const fetchSenders = useCallback(async () => {
    try {
      const senders = await api.getSenders();
      setSendersList(senders || []);
    } catch (err) {
      console.warn('Could not load senders list:', err);
    }
  }, []);

  // Fetch Rate limit status
  const fetchRateLimitStatus = useCallback(async () => {
    try {
      const res = await api.getRateLimitStatus('sales@reachinbox.test');
      if (res) {
        setRateLimitInfo({
          currentCount: res.currentCount || 0,
          limit: res.limit || 50,
          remaining: res.remaining || 50,
        });
      }
    } catch (err) {
      console.warn('Could not fetch rate limit info:', err);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchSlackStatus();
    fetchSenders();
    fetchRateLimitStatus();
    if (activeTab === 'scheduled') {
      fetchScheduled('');
    } else {
      fetchSent('');
    }
  }, [activeTab, fetchScheduled, fetchSent, fetchSlackStatus, fetchSenders, fetchRateLimitStatus]);

  // Google-Search style Instant Search as each alphabet is typed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'scheduled') {
        fetchScheduled(searchQuery.trim());
      } else {
        fetchSent(searchQuery.trim());
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, fetchScheduled, fetchSent]);

  // Instant 0ms In-Memory Filter on Keystroke
  const displayedScheduledEmails = useMemo(() => {
    if (!searchQuery.trim()) return scheduledEmails;
    const q = searchQuery.toLowerCase().trim();
    return scheduledEmails.filter((item) =>
      (item.recipientEmail && item.recipientEmail.toLowerCase().includes(q)) ||
      (item.senderEmail && item.senderEmail.toLowerCase().includes(q)) ||
      (item.subject && item.subject.toLowerCase().includes(q)) ||
      (item.body && item.body.toLowerCase().includes(q))
    );
  }, [scheduledEmails, searchQuery]);

  const displayedSentEmails = useMemo(() => {
    if (!searchQuery.trim()) return sentEmails;
    const q = searchQuery.toLowerCase().trim();
    return sentEmails.filter((item) =>
      (item.recipientEmail && item.recipientEmail.toLowerCase().includes(q)) ||
      (item.senderEmail && item.senderEmail.toLowerCase().includes(q)) ||
      (item.subject && item.subject.toLowerCase().includes(q)) ||
      (item.body && item.body.toLowerCase().includes(q))
    );
  }, [sentEmails, searchQuery]);

  // Periodic polling for status updates (every 5s when not searching)
  useEffect(() => {
    if (searchQuery.trim()) return;

    const interval = setInterval(() => {
      if (activeTab === 'scheduled') {
        fetchScheduled('');
      } else {
        fetchSent('');
      }
      fetchRateLimitStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, searchQuery, fetchScheduled, fetchSent, fetchRateLimitStatus]);

  // 1-Click Fast Instant Test Email Dispatch
  const handleQuickSend = async () => {
    setIsQuickSending(true);
    try {
      const randomLead = `lead_${Math.floor(Math.random() * 1000)}@techcorp.io`;
      await api.scheduleEmails({
        recipients: [randomLead],
        senderEmail: 'sales@reachinbox.test',
        subject: `Live Test Sequence #${Math.floor(Math.random() * 900 + 100)}`,
        body: 'Testing live Ethereal SMTP delivery and BullMQ queue processing via ReachInbox scheduler.',
        startTime: new Date().toISOString(),
        delayBetweenEmails: 0,
        hourlyLimit: 50,
      });
      success(`Dispatched instant test email to ${randomLead}!`);
      fetchScheduled('');
      fetchSent('');
      fetchRateLimitStatus();
    } catch (err) {
      error(err.message || 'Failed to dispatch quick test email');
    } finally {
      setIsQuickSending(false);
    }
  };

  // Reset Rate Limit (for live evaluation testing)
  const handleResetRateLimit = async () => {
    try {
      await api.resetRateLimit('sales@reachinbox.test');
      success('Hourly rate limit counter reset for sales@reachinbox.test');
      fetchRateLimitStatus();
    } catch (err) {
      error(err.message || 'Failed to reset rate limit');
    }
  };

  // Cancel Scheduled Email
  const handleCancelEmail = async (id) => {
    try {
      await api.cancelScheduledEmail(id);
      info('Scheduled job cancelled');
      fetchScheduled(searchQuery);
    } catch (err) {
      error(err.message || 'Failed to cancel email job');
    }
  };

  // Rate limit percentage
  const rateLimitPercent = Math.min(
    100,
    Math.round(((rateLimitInfo.currentCount || 0) / (rateLimitInfo.limit || 50)) * 100)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Persistent Scheduler
              </span>
              <span className="text-xs text-slate-400 font-medium">· Redis + BullMQ (Zero Cron)</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Email Sequence Dispatcher
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Automate multi-sender sequences with provider throttling, distributed hourly rate limiting, and real-time Elasticsearch search.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickSend}
              disabled={isQuickSending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs shadow-2xs hover:border-slate-300 transition active:scale-95 disabled:opacity-50"
              title="Dispatches 1 test email instantly"
            >
              <Zap className={`w-3.5 h-3.5 text-amber-500 ${isQuickSending ? 'animate-bounce' : ''}`} />
              <span>{isQuickSending ? 'Sending...' : '1-Click Quick Test'}</span>
            </button>

            <button
              onClick={() => setIsComposeOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600 hover:from-brand-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Compose New Email</span>
            </button>
          </div>
        </div>

        {/* Interactive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Queued in BullMQ */}
          <div
            onClick={() => setActiveTab('scheduled')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer transform hover:-translate-y-0.5 ${
              activeTab === 'scheduled'
                ? 'bg-white border-brand-500/80 shadow-md shadow-brand-500/10'
                : 'bg-white/80 hover:bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scheduled in Queue</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{totalScheduled}</div>
            <div className="text-[11px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
              <span>● Waiting for dispatch time</span>
            </div>
          </div>

          {/* Card 2: Delivered via Ethereal */}
          <div
            onClick={() => setActiveTab('sent')}
            className={`p-5 rounded-3xl border transition-all cursor-pointer transform hover:-translate-y-0.5 ${
              activeTab === 'sent'
                ? 'bg-white border-emerald-500/80 shadow-md shadow-emerald-500/10'
                : 'bg-white/80 hover:bg-white border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Delivered via Ethereal</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">{totalSent}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span>✓ Verified Ethereal SMTP</span>
            </div>
          </div>

          {/* Card 3: Configured Senders */}
          <div
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition transform hover:-translate-y-0.5"
            title={sendersList.map((s) => `${s.name} (${s.email})`).join('\n')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Configured Senders</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {sendersList.length || 1}
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1 truncate">
              {sendersList[0]?.email || 'sales@reachinbox.test'}
            </div>
          </div>

          {/* Card 4: Worker Engine */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition transform hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">BullMQ Worker</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Activity className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>5 Concurrency</span>
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1">
              Delayed Sorted Set Listener
            </div>
          </div>
        </div>

        {/* Live Hourly Rate Limit Banner */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Sender Hourly Throttling Health:</span>
                <span className="font-mono text-slate-500 font-medium">sales@reachinbox.test</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Sent <strong className="text-slate-800">{rateLimitInfo.currentCount}</strong> of <strong className="text-slate-800">{rateLimitInfo.limit}</strong> max allowed emails in active 1-hour window.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:w-64">
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                <span>Usage</span>
                <span>{rateLimitPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    rateLimitPercent > 80 ? 'bg-rose-500' : rateLimitPercent > 50 ? 'bg-amber-500' : 'bg-brand-500'
                  }`}
                  style={{ width: `${rateLimitPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleResetRateLimit}
              title="Reset hourly counter for demo testing"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition -mb-px ${
                activeTab === 'scheduled'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails</span>
              <span
                className={`px-2.5 py-0.5 text-xs rounded-full font-bold ${
                  activeTab === 'scheduled'
                    ? 'bg-brand-50 text-brand-700 border border-brand-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalScheduled}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sent');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition -mb-px ${
                activeTab === 'sent'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Delivered Emails</span>
              <span
                className={`px-2.5 py-0.5 text-xs rounded-full font-bold ${
                  activeTab === 'sent'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalSent}
              </span>
            </button>
          </div>
        </div>

        {/* Active Tab View */}
        {activeTab === 'scheduled' ? (
          <ScheduledEmailsTable
            emails={displayedScheduledEmails}
            isLoading={isLoadingList}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCancelEmail={handleCancelEmail}
            onRefresh={() => fetchScheduled(searchQuery)}
            onComposeClick={() => setIsComposeOpen(true)}
          />
        ) : (
          <SentEmailsTable
            emails={displayedSentEmails}
            isLoading={isLoadingList}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => fetchSent(searchQuery)}
            onComposeClick={() => setIsComposeOpen(true)}
          />
        )}
      </main>

      {/* Compose Sequence Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduledSuccess={() => {
          setActiveTab('scheduled');
          fetchScheduled('');
          fetchRateLimitStatus();
        }}
      />

      {/* Slack Connect Modal */}
      <SlackModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        slackStatus={slackStatus}
        onStatusUpdated={fetchSlackStatus}
      />
    </div>
  );
};
