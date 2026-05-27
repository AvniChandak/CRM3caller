import React, { useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  UserPlus, 
  Mail, 
  Key, 
  User, 
  ShieldCheck, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  Loader,
  Users2,
  AlertCircle,
  Trash2
} from 'lucide-react';

const UsersView = ({ users, onRefresh }) => {
  const { token } = useAuth();
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('caller');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter list to see callers only vs admins
  const callers = users.filter(u => u.role === 'caller');
  const admins = users.filter(u => u.role === 'admin');

  // Toggle active/inactive state of a caller
  const handleToggleActive = async (id, currentActiveState) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: !currentActiveState })
      });

      if (!res.ok) throw new Error('Failed to update caller status.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteCaller = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete caller account: "${name}"?\nThis will set their assigned leads to unassigned.`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete caller.');
      }
      alert('Caller account deleted successfully.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Submit new user creation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password, role })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create user account.');
      }

      alert('User account created successfully!');
      setIsAddOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('caller');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Callers capacity card */}
        <div className="glass-panel p-6 rounded-2xl border shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Registered Callers</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{callers.length}</h3>
              <span className="text-xs font-medium text-slate-400">Caller accounts</span>
            </div>
            <span className="text-3xs text-emerald-500 font-bold uppercase tracking-wider block mt-1">Manage active system callers</span>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users2 size={24} />
          </div>
        </div>

        {/* System Admins card */}
        <div className="glass-panel p-6 rounded-2xl border shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">System Admin Panel</span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{admins.length}</h3>
              <span className="text-xs font-medium text-slate-400">Admin profiles seeded</span>
            </div>
            <span className="text-3xs text-slate-400 dark:text-slate-500 block mt-1">Full database credentials & control</span>
          </div>
          <div className="p-4 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <ShieldCheck size={24} />
          </div>
        </div>

      </div>

      {/* Caller Account Controls List */}
      <div className="glass-panel rounded-2xl border shadow-xs overflow-hidden">
        
        {/* List Header Actions */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/20 dark:bg-slate-900/10">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Sales Callers</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control pipeline routing and login configurations</p>
          </div>
          
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer"
          >
            <UserPlus size={14} />
            Create Caller
          </button>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-150 dark:border-slate-850 bg-slate-50/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Delete</th>
                <th className="py-3 px-6 text-right">Login Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {callers.map((caller) => (
                <tr key={caller.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/30 transition-colors">
                  
                  {/* Caller Name */}
                  <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center text-xs">
                        {caller.name.charAt(0)}
                      </div>
                      <span>{caller.name}</span>
                    </div>
                  </td>

                  {/* Caller Email */}
                  <td className="py-4 px-4 font-mono text-xs">{caller.email}</td>

                  {/* Active Badge */}
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider border ${
                      caller.active 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    }`}>
                      {caller.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  {/* Delete Caller */}
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleDeleteCaller(caller.id, caller.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                      title="Delete Caller Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>

                  {/* Active Toggle Switch */}
                  <td className="py-4 px-6 text-right select-none">
                    <button
                      onClick={() => handleToggleActive(caller.id, caller.active)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer transition-colors"
                      title={caller.active ? 'Disable Caller Account' : 'Enable Caller Account'}
                    >
                      {caller.active ? (
                        <ToggleRight size={28} className="text-emerald-500" />
                      ) : (
                        <ToggleLeft size={28} className="text-slate-400" />
                      )}
                    </button>
                  </td>

                </tr>
              ))}

              {callers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No active sales callers seeded. Create callers to start distributing leads.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* CREATE CALLER MODAL POPUP */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl border text-slate-700 dark:text-slate-350 p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Caller</h3>
              <button 
                onClick={() => setIsAddOpen(false)} 
                className="text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Caller Full Name</label>
                <div className="relative mt-1.5">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={14} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="John Caller"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Caller Email Address</label>
                <div className="relative mt-1.5">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={14} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="caller@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Secure Password</label>
                <div className="relative mt-1.5">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key size={14} />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 border rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75"
                >
                  {isSubmitting ? <Loader className="animate-spin" size={12} /> : null}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersView;
