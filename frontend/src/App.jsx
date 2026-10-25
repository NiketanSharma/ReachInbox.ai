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
import { Plus, Clock, CheckCircle2 } from 'lucide-react';

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
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [slackStatus, setSlackStatus] = useState(null);

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

  // Initial data loading
  useEffect(() => {
    if (isAuthenticated) {
      fetchSlackStatus();
      if (activeTab === 'scheduled') {
        fetchScheduled('');
      } else {
        fetchSent('');
      }
    }
  }, [isAuthenticated, activeTab, fetchScheduled, fetchSent, fetchSlackStatus]);

  // Google-Search style Instant Search as each alphabet is typed
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
    if (!isAuthenticated || searchQuery.trim()) return;

    const interval = setInterval(() => {
      if (activeTab === 'scheduled') {
        fetchScheduled('');
      } else {
        fetchSent('');
      }
    }, 5000);

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
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 1️⃣ Google Login screen if unauthenticated (Matches Figma)
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // 2️⃣ Main Dashboard (Matches Figma Layout)
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Header (User info + avatar + logout) */}
      <Navbar
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {/* Figma Header Action Bar: Tabs on Left, "Compose New Email" on Right */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Section Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 sm:border-b-0 pb-2 sm:pb-0">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'scheduled'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              }`}
            >
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Scheduled Emails</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-semibold">
                {totalScheduled}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sent');
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'sent'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sent Emails</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-semibold">
                {totalSent}
              </span>
            </button>
          </div>

          {/* Primary "Compose New Email" button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-sm transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Active Tab Table */}
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
