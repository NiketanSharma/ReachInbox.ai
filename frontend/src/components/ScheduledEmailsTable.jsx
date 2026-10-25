import React from 'react';
import { format } from 'date-fns';
import { Clock, AlertTriangle, Trash2, CalendarCheck, RefreshCw, Search } from 'lucide-react';

export const ScheduledEmailsTable = ({
  emails,
  isLoading,
  searchQuery,
  onSearchChange,
  onCancelEmail,
  onRefresh,
  onComposeClick,
}) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Sending Now
          </span>
        );
      case 'RATE_LIMITED_RESCHEDULED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Rate Limit Rescheduled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Clock className="w-3 h-3 text-purple-600" />
            Scheduled
          </span>
        );
    }
  };

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
            placeholder="Search scheduled emails (Elasticsearch indexed)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            title="Refresh queue"
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
          <p className="text-xs text-slate-500">Loading queued emails from BullMQ & database...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="p-12 text-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">No scheduled emails in queue</h4>
          <p className="text-xs text-slate-500 mb-5">
            {searchQuery
              ? 'No scheduled jobs matched your search criteria.'
              : 'You have no upcoming emails waiting in the BullMQ queue.'}
          </p>
          {!searchQuery && (
            <button
              onClick={onComposeClick}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              Compose & Schedule Sequence
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
                <th className="py-3 px-4 sm:px-6">Scheduled Time</th>
                <th className="py-3 px-4 sm:px-6">Status</th>
                <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
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

                  {/* Scheduled Time */}
                  <td className="py-3.5 px-4 sm:px-6 text-slate-600 whitespace-nowrap">
                    {format(new Date(email.scheduledAt), 'MMM d, yyyy h:mm:ss a')}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                    {getStatusBadge(email.status)}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                    <button
                      onClick={() => onCancelEmail(email.id)}
                      title="Cancel this scheduled send"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
