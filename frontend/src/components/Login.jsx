import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, Mail, Sun, Moon, Sparkles, Loader } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error: globalError, setError } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please fill in all fields.');
      return;
    }

    setLocalError('');
    if (setError) {
      setError(null);
    }
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setLocalError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorToDisplay = localError || globalError;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-radial from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-black overflow-hidden px-4 transition-colors duration-300">
      
      {/* Dynamic Background Circles */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-600/5 rounded-full blur-3xl animate-pulse delay-700"></div>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl glass-card text-slate-700 dark:text-slate-300 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
      </button>

      {/* Main Login Card */}
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20 mb-3 animate-bounce">
            <Sparkles size={28} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            LeadFlow <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">CRM</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Coaching & Business Lead Management System
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl shadow-xl transition-all duration-300 border">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            Sign In
          </h2>

          {errorToDisplay && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 text-sm font-medium animate-shake">
              {errorToDisplay}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 text-white font-semibold text-sm shadow-md hover:shadow-lg focus:outline-none active:scale-98 transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:pointer-events-none flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
