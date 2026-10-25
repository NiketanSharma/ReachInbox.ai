import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Mail, Clock, ShieldCheck, Zap } from 'lucide-react';

export const LoginScreen = () => {
  const { loginWithGoogleCredential, loginDemoUser } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* ReachInbox Brand Logo */}
        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-md shadow-brand-500/20 text-white font-bold text-2xl mb-3">
          R
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          ReachInbox<span className="text-brand-600">.ai</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Cold Email Outreach & Job Scheduler
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm rounded-2xl border border-slate-200">
          <div className="space-y-5">
            <div className="text-center pb-1">
              <h3 className="text-base font-bold text-slate-800">Sign in to your account</h3>
              <p className="text-xs text-slate-500 mt-1">Schedule and manage multi-sender email sequences</p>
            </div>

            {/* Google OAuth Login Button */}
            <div className="flex justify-center w-full">
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

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">Or evaluator mode</span>
              </div>
            </div>

            {/* Instant Demo Sign-in */}
            <button
              onClick={() => loginDemoUser('ReachInbox Evaluator', 'evaluator@reachinbox.ai')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:border-brand-500 bg-white hover:bg-brand-50/40 text-slate-700 hover:text-brand-700 font-semibold text-xs transition shadow-2xs"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Instant Evaluator Demo Sign-In</span>
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              <span>BullMQ delayed queue with Redis persistence</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <Mail className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              <span>Multi-sender Ethereal fake SMTP testing</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
              <span>Hourly rate limiting & live Slack alerts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
