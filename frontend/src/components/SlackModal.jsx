import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle, Unlink, Link2, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const SlackModal = ({
  isOpen,
  onClose,
  slackStatus,
  onStatusUpdated,
}) => {
  const { success, error, info } = useToast();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('#reachinbox-alerts');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleConnectWebhook = async (e) => {
    e.preventDefault();
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      error('Please enter a valid Slack Incoming Webhook URL (starts with https://hooks.slack.com/)');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.connectSlackWebhook(webhookUrl.trim(), channelName.trim());
      success('Slack connected successfully! Alerts will be sent to your channel.');
      onStatusUpdated();
    } catch (err) {
      error(err.message || 'Failed to connect Slack webhook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    try {
      const res = await api.testSlackNotification();
      if (res.success) {
        success('Test notification delivered to your Slack channel!');
      } else {
        error(res.message || 'Slack test failed');
      }
    } catch (err) {
      error(err.message || 'Failed to test Slack connection');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectSlack();
      info('Slack workspace disconnected.');
      onStatusUpdated();
    } catch (err) {
      error(err.message || 'Failed to disconnect Slack');
    }
  };

  const handleOAuthConnect = () => {
    window.location.href = 'http://localhost:5000/api/slack/oauth/start';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4A154B]/10 text-[#4A154B] flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Slack Notifications</h3>
              <p className="text-xs text-slate-500">Live hourly rate limit alerts integration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {slackStatus?.connected ? (
            /* Connected View */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-2.5 font-bold text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Slack is Connected!</span>
                </div>
                <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">
                  Rate-limit warnings will automatically post live alert messages to{' '}
                  <span className="font-semibold">{slackStatus.channel || '#alerts'}</span> in your Slack workspace.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'Sending to Slack...' : 'Send Test Alert'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs transition"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            /* Disconnected View */
            <div className="space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect your team Slack to receive real-time notifications when a sender hits their configured hourly
                rate limit.
              </p>

              {/* Option A: Quick Incoming Webhook */}
              <form onSubmit={handleConnectWebhook} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Slack Incoming Webhook URL
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#4A154B] transition shadow-sm placeholder:text-slate-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Paste from Slack App Directory or Incoming Webhook configuration
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Alert Channel Name
                  </label>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="#reachinbox-alerts"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A154B]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A154B] hover:bg-[#3D113E] text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Connecting...' : 'Connect Webhook'}</span>
                </button>
              </form>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-slate-400 font-semibold">Or OAuth Flow</span>
                </div>
              </div>

              {/* Option B: Real OAuth button */}
              <button
                type="button"
                onClick={handleOAuthConnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:border-[#4A154B] text-slate-700 font-semibold text-xs hover:bg-slate-50 transition shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#4A154B]" />
                <span>Connect with Slack OAuth App</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
