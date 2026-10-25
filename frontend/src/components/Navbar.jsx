import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Activity, MessageSquare, ExternalLink } from 'lucide-react';

export const Navbar = ({ slackStatus, onOpenSlackModal }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md shadow-brand-500/20 text-white font-bold text-lg tracking-tight">
              R
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">
                ReachInbox<span className="text-brand-600">.ai</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-brand-50 text-brand-700 rounded-full border border-brand-200">
                Scheduler
              </span>
            </div>
          </div>

          {/* BullMQ Dashboard shortcut */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-brand-200 bg-slate-50/50 hover:bg-brand-50/50 transition"
            title="Open real-time BullMQ Dashboard"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>BullMQ Live Queue</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Slack Connection Button & Status */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              slackStatus?.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#4A154B]" />
            <span className="hidden sm:inline">
              {slackStatus?.connected ? `Slack Connected (${slackStatus.channel || '#alerts'})` : 'Connect Slack'}
            </span>
            <span className="sm:hidden">
              {slackStatus?.connected ? 'Slack ON' : 'Slack'}
            </span>
            {slackStatus?.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <img
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4f75f6&color=fff`}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-500/20"
              />
              <div className="hidden lg:block text-left">
                <div className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</div>
                <div className="text-xs text-slate-500 leading-tight">{user.email}</div>
              </div>

              <button
                onClick={logout}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
