import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Mail, Clock, ShieldCheck, Zap } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogleCredential, loginDemoUser } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/30 to-indigo-50/40 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30 text-white font-extrabold text-2xl mb-4">
          R
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          ReachInbox<span className="text-brand-600">.ai</span>
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Production-grade Full-stack Email Job Scheduler
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-100">
          <div className="space-y-6">
            <div className="text-center pb-2">
              <h3 className="text-lg font-semibold text-slate-800">Sign in to your dashboard</h3>
              <p className="text-xs text-slate-500 mt-1">Manage scheduled sequences, workers, and rate limits</p>
            </div>

            {/* Google OAuth Login Button */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    loginWithGoogleCredential(credentialResponse.credential);
                  }
                }}
                onError={() => {
                  console.error('Google Sign In failed');
                }}
                useOneTap
                theme="outline"
                shape="rectangular"
                width="100%"
              />
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">Or evaluator mode</span>
              </div>
            </div>

            {/* Evaluator Demo Login */}
            <button
              onClick={() => loginDemoUser('ReachInbox Evaluator', 'evaluator@reachinbox.ai')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:border-brand-500 bg-white hover:bg-brand-50/50 text-slate-700 hover:text-brand-700 font-semibold text-sm transition shadow-sm hover:shadow"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Instant Evaluator Demo Sign-In</span>
            </button>
          </div>

          {/* Highlights feature list */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <Clock className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>Persistent BullMQ delayed jobs (Zero Cron Jobs)</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <Mail className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>Multi-sender Ethereal SMTP with preview links</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>Distributed rate limits & Slack alerts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
