import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { ScheduledEmailsTable } from './components/ScheduledEmailsTable';
import { SentEmailsTable } from './components/SentEmailsTable';
import { ComposeModal } from './components/ComposeModal';
import { SlackModal } from './components/SlackModal';
import { api } from './services/api';
import { useToast } from './context/ToastContext';
import { Plus, Clock, CheckCircle2, Users, Activity } from 'lucide-react';

export const App = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { error, info } = useToast();

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
  const [searchQuery, setSearchQuery] = useState('');
  const [slackStatus, setSlackStatus] = useState(null);

  // Fetch Scheduled Emails from Backend
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

  // Fetch Sent Emails from Backend
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

  // Initial data loading on authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchSlackStatus();
      fetchSenders();
      if (activeTab === 'scheduled') {
        fetchScheduled('');
      } else {
        fetchSent('');
      }
    }
  }, [isAuthenticated, activeTab, fetchScheduled, fetchSent, fetchSlackStatus, fetchSenders]);

  // Google-Search style Instant Search:
  // Fires backend query as each alphabet is typed with an ultra-responsive 120ms debounce
  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setTimeout(() => {
      if (activeTab === 'scheduled') {
        fetchScheduled(searchQuery.trim());
      } else {
        fetchSent(searchQuery.trim());
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, isAuthenticated, fetchScheduled, fetchSent]);

  // Instant In-Memory Filter:
  // Gives immediate 0ms visual feedback on each keystroke for already-loaded items
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

  // Periodic polling for status updates (only when not actively searching)
  useEffect(() => {
    if (!isAuthenticated || searchQuery.trim()) return;

    const interval = setInterval(() => {
      if (activeTab === 'scheduled') {
        fetchScheduled('');
      } else {
        fetchSent('');
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab, searchQuery, fetchScheduled, fetchSent]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Top Navigation */}
      <Navbar
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header & Compose Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Email Scheduler Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Persistent BullMQ task queue with multi-sender Ethereal SMTP & rate limiting
            </p>
          </div>

          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Queued */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduled in Queue</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalScheduled}</div>
            </div>
          </div>

          {/* Card 2: Sent */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Delivered via Ethereal</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalSent}</div>
            </div>
          </div>

          {/* Card 3: Multi-senders */}
          <div
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 cursor-default"
            title={sendersList.map((s) => `${s.name} (${s.email})`).join('\n')}
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Configured Senders</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {sendersList.length || 1} {sendersList.length === 1 ? 'Profile' : 'Profiles'}
              </div>
            </div>
          </div>

          {/* Card 4: BullMQ Worker */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Worker Status</div>
              <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Running (5 Workers)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
          <button
            onClick={() => {
              setActiveTab('scheduled');
              setSearchQuery('');
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === 'scheduled'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled Emails</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                activeTab === 'scheduled' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
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
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === 'sent'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sent Emails</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                activeTab === 'sent' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalSent}
            </span>
          </button>
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

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onScheduledSuccess={() => {
          setActiveTab('scheduled');
          fetchScheduled('');
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
