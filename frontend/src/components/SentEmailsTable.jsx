import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Search, Inbox, X, Eye, Filter } from 'lucide-react';
import { HighlightText } from './HighlightText';
import { EmailDetailModal } from './EmailDetailModal';

export const SentEmailsTable = ({
  emails,
  isLoading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onComposeClick,
}) => {
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter by status pill
  const filteredEmails = useMemo(() => {
    if (statusFilter === 'ALL') return emails;
    if (statusFilter === 'SENT') return emails.filter((e) => e.status === 'SENT');
    if (statusFilter === 'FAILED') return emails.filter((e) => e.status === 'FAILED');
    return emails;
  }, [emails, statusFilter]);

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
                placeholder="Search sent emails as you type (Google search style)..."
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

            {/* Actions */}
            <div className="flex items-center gap-2">
              {searchQuery && (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                  {filteredEmails.length} match{filteredEmails.length === 1 ? '' : 'es'}
                </span>
              )}

              <button
                onClick={onRefresh}
                title="Refresh list"
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
              All Delivered ({emails.length})
            </button>
            <button
              onClick={() => setStatusFilter('SENT')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                statusFilter === 'SENT'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Sent via Ethereal
            </button>
            <button
              onClick={() => setStatusFilter('FAILED')}
              className={`px-3 py-1 rounded-lg font-bold transition text-xs ${
                statusFilter === 'FAILED'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Failed
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="w-9 h-9 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading delivered emails from Ethereal SMTP...</p>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Inbox className="w-7 h-7 text-slate-400" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              {searchQuery ? `No delivered emails matched "${searchQuery}"` : 'No sent emails recorded yet'}
            </h4>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {searchQuery
                ? 'Check for spelling or clear search filters to view all sent emails.'
                : 'Emails dispatched via Ethereal SMTP will appear here with live web preview links.'}
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
                Send Sequence Now
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
                  <th className="py-3 px-4 sm:px-6">Delivered At</th>
                  <th className="py-3 px-4 sm:px-6">Status</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Ethereal Preview</th>
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

                    {/* Sent Time */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-600 whitespace-nowrap text-xs font-semibold">
                      {email.sentAt
                        ? format(new Date(email.sentAt), 'MMM d, yyyy h:mm:ss a')
                        : 'N/A'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                      {email.status === 'SENT' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Delivered
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs"
                          title={email.lastError || 'Delivery failed'}
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Failed
                        </span>
                      )}
                    </td>

                    {/* Ethereal Link */}
                    <td
                      className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {email.etherealPreviewUrl ? (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900 bg-brand-50 hover:bg-brand-100 px-3.5 py-1.5 rounded-xl border border-brand-200/80 transition shadow-2xs group/btn"
                        >
                          <span>Inspect Email</span>
                          <ExternalLink className="w-3 h-3 text-brand-500 group-hover/btn:translate-x-0.5 transition-transform" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No URL</span>
                      )}
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
