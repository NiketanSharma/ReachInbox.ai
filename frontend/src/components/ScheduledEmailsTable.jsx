import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Clock, AlertTriangle, Trash2, CalendarCheck, RefreshCw, Search, X, Eye, Filter } from 'lucide-react';
import { HighlightText } from './HighlightText';
import { EmailDetailModal } from './EmailDetailModal';

export const ScheduledEmailsTable = ({
  emails,
  isLoading,
  searchQuery,
  onSearchChange,
  onCancelEmail,
  onRefresh,
  onComposeClick,
}) => {
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter by status pill
  const filteredEmails = useMemo(() => {
    if (statusFilter === 'ALL') return emails;
    if (statusFilter === 'PROCESSING') return emails.filter((e) => e.status === 'PROCESSING');
    if (statusFilter === 'RATE_LIMITED') return emails.filter((e) => e.status === 'RATE_LIMITED_RESCHEDULED');
    if (statusFilter === 'SCHEDULED') return emails.filter((e) => e.status === 'SCHEDULED');
    return emails;
  }, [emails, statusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Sending Now
          </span>
        );
      case 'RATE_LIMITED_RESCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Rate Limit Rescheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            Queued in BullMQ
          </span>
        );
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden transition-all">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3.5 bg-gradient-to-r from-slate-50/50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search leads, subject, senders as you type..."
                className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {searchQuery && (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                  {filteredEmails.length} match{filteredEmails.length === 1 ? '' : 'es'}
                </span>
              )}

              <button
                onClick={onRefresh}
                title="Refresh queue"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200 bg-white flex items-center gap-1.5 text-xs font-bold shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              All ({emails.length})
            </button>
            <button
              onClick={() => setStatusFilter('SCHEDULED')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                statusFilter === 'SCHEDULED'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Queued
            </button>
            <button
              onClick={() => setStatusFilter('PROCESSING')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                statusFilter === 'PROCESSING'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Sending Now
            </button>
            <button
              onClick={() => setStatusFilter('RATE_LIMITED')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                statusFilter === 'RATE_LIMITED'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Rescheduled
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="w-9 h-9 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Searching queued emails live...</p>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CalendarCheck className="w-7 h-7 text-slate-400" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              {searchQuery ? `No matching emails for "${searchQuery}"` : 'No upcoming emails in queue'}
            </h4>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {searchQuery
                ? 'Check for spelling or clear search filters to view your queue.'
                : 'Emails scheduled for future delivery will appear here.'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => onSearchChange('')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Clear Search
              </button>
            ) : (
              <button
                onClick={onComposeClick}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 transition"
              >
                Schedule First Sequence
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Recipient Lead</th>
                  <th className="py-3 px-4 sm:px-6">Sender Account</th>
                  <th className="py-3 px-4 sm:px-6">Subject</th>
                  <th className="py-3 px-4 sm:px-6">Scheduled Dispatch Time</th>
                  <th className="py-3 px-4 sm:px-6">Status</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredEmails.map((email) => (
                  <tr
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className="hover:bg-brand-50/30 transition-colors group cursor-pointer"
                  >
                    {/* Recipient */}
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900 group-hover:text-brand-700 transition">
                      <HighlightText text={email.recipientEmail} query={searchQuery} />
                    </td>

                    {/* Sender */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-600 font-mono text-xs">
                      <HighlightText text={email.senderEmail} query={searchQuery} />
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-800 font-medium max-w-xs truncate">
                      <HighlightText text={email.subject} query={searchQuery} />
                    </td>

                    {/* Scheduled Time */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-600 whitespace-nowrap text-xs font-semibold">
                      {format(new Date(email.scheduledAt), 'MMM d, yyyy h:mm:ss a')}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      {getStatusBadge(email.status)}
                    </td>

                    {/* Action */}
                    <td
                      className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedEmail(email)}
                          title="View email details"
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onCancelEmail(email.id)}
                          title="Cancel scheduled send"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <EmailDetailModal
        email={selectedEmail}
        isOpen={!!selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />
    </>
  );
};
