import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, MessageSquare, ExternalLink, Zap, ShieldCheck } from 'lucide-react';

export const Navbar = ({ slackStatus, onOpenSlackModal }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-brand-500/25 text-white font-extrabold text-lg tracking-tight">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  ReachInbox<span className="text-brand-600">.ai</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-brand-50 to-indigo-50 text-brand-700 rounded-full border border-brand-200/60 shadow-2xs">
                  Scheduler v2.0
                </span>
              </div>
            </div>
          </div>

          {/* Engine Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>BullMQ Engine: <span className="text-emerald-700 font-bold">Online</span></span>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* BullMQ Dashboard shortcut */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-brand-600 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-brand-300 bg-white hover:bg-brand-50/40 transition shadow-2xs group"
            title="Open real-time BullMQ Dashboard in a new tab"
          >
            <Activity className="w-3.5 h-3.5 text-brand-600 group-hover:scale-110 transition transform" />
            <span>BullMQ Live Queue</span>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-brand-500" />
          </a>

          {/* Slack Connection Button & Status */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border shadow-2xs ${
              slackStatus?.connected
                ? 'bg-emerald-50/80 text-emerald-800 border-emerald-300 hover:bg-emerald-100/90'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#4A154B]" />
            <span className="hidden sm:inline">
              {slackStatus?.connected ? `Slack Alert (${slackStatus.channel || '#alerts'})` : 'Connect Slack'}
            </span>
            <span className="sm:hidden">
              {slackStatus?.connected ? 'Slack ON' : 'Slack'}
            </span>
            {slackStatus?.connected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            )}
          </button>

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="relative">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4f75f6&color=fff`}
                  alt={user.name}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-brand-500/20 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                  <span>{user.name}</span>
                  <ShieldCheck className="w-3 h-3 text-brand-600" />
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">{user.email}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
