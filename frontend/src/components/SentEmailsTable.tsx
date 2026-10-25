import React from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Search, Inbox } from 'lucide-react';
import { EmailJob } from '../types';

interface SentEmailsTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onComposeClick: () => void;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({
  emails,
  isLoading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onComposeClick,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search sent emails (Elasticsearch indexed)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Refresh list"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200 flex items-center gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading delivered emails from Ethereal SMTP...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="p-12 text-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">No sent emails recorded yet</h4>
          <p className="text-xs text-slate-500 mb-5">
            {searchQuery
              ? 'No sent records matched your search query.'
              : 'Emails will appear here once processed and dispatched via Ethereal SMTP.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onComposeClick}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Send an Email Sequence
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">Recipient Lead</th>
                <th className="py-3 px-4 sm:px-6">Sender</th>
                <th className="py-3 px-4 sm:px-6">Subject</th>
                <th className="py-3 px-4 sm:px-6">Sent Time</th>
                <th className="py-3 px-4 sm:px-6">Status</th>
                <th className="py-3 px-4 sm:px-6 text-right">Ethereal Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {emails.map((email) => (
                <tr key={email.id} className="hover:bg-slate-50/60 transition group">
                  {/* Recipient */}
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                    {email.recipientEmail}
                  </td>

                  {/* Sender */}
                  <td className="py-3.5 px-4 sm:px-6 text-slate-600 font-mono text-xs">
                    {email.senderEmail}
                  </td>

                  {/* Subject */}
                  <td className="py-3.5 px-4 sm:px-6 text-slate-700 max-w-xs truncate">
                    {email.subject}
                  </td>

                  {/* Sent Time */}
                  <td className="py-3.5 px-4 sm:px-6 text-slate-600 whitespace-nowrap">
                    {email.sentAt
                      ? format(new Date(email.sentAt), 'MMM d, yyyy h:mm:ss a')
                      : 'N/A'}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                    {email.status === 'SENT' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Sent via Ethereal
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                        title={email.lastError || 'Delivery failed'}
                      >
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Failed
                      </span>
                    )}
                  </td>

                  {/* Ethereal Link */}
                  <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                    {email.etherealPreviewUrl ? (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-200 transition"
                      >
                        <span>View Email</span>
                        <ExternalLink className="w-3 h-3" />
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
  );
};
