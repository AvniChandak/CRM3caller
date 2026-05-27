import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  BookOpen, 
  MapPin, 
  Calendar, 
  DollarSign, 
  UserSquare2,
  Clock,
  Loader,
  MessageSquarePlus,
  Send
} from 'lucide-react';

const LeadModal = ({ leadId, isOpen, onClose, onLeadUpdated, callersList = [] }) => {
  const { user, token } = useAuth();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Editable form fields
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [revenue, setRevenue] = useState(0);
  
  // Admin-only basic edits
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');
  const [source, setSource] = useState('');
  
  // New note text
  const [newNote, setNewNote] = useState('');

  // Fetch lead data and activity history
  const fetchLeadDetails = async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Lead not found');
      const data = await res.json();
      setLead(data);
      
      // Initialize form fields
      setStatus(data.status);
      setFollowUpDate(data.follow_up_date ? data.follow_up_date.substring(0, 16) : '');
      setAssignedTo(data.assigned_to?.id || '');
      setRevenue(data.revenue || 0);
      setName(data.name);
      setPhone(data.phone);
      setEmail(data.email);
      setCourse(data.course);
      setSource(data.source);
      
      // Fetch activities
      fetchActivities();
    } catch (err) {
      console.error(err);
      alert('Error fetching lead details: ' + err.message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setActivityLoading(true);
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) {
      fetchLeadDetails();
    }
  }, [isOpen, leadId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/leads/${leadId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: newNote })
      });

      if (!res.ok) throw new Error('Failed to post note');
      
      setNewNote('');
      fetchActivities(); // reload logs
      
      // Update local lead state (because API returns updated lead with appended notes)
      const data = await res.json();
      setLead(data.lead);
      if (onLeadUpdated) onLeadUpdated(data.lead);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const updates = {
        status,
        follow_up_date: followUpDate || null
      };

      if (user.role === 'admin') {
        updates.name = name;
        updates.phone = phone;
        updates.email = email;
        updates.course = course;
        updates.source = source;
        updates.revenue = Number(revenue);
        updates.assigned_to = assignedTo || null;
      }

      const res = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update lead');
      }

      const data = await res.json();
      if (onLeadUpdated) onLeadUpdated(data.lead);
      fetchActivities(); // Refresh logs
      alert('Lead details saved successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      
      {/* Modal Container */}
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden text-slate-700 dark:text-slate-300 animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              {loading ? 'Loading Lead Details...' : `Lead File: ${lead?.name || 'Details'}`}
            </h3>
            <p className="text-3xs text-slate-400 mt-0.5">ID: {leadId}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {loading || !lead ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <Loader className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          /* Scrollable Body Content */
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Core Fields Form */}
            <div className="space-y-5">
              
              {/* Form Card */}
              <div className="space-y-4">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Lead Fields</span>
                
                {/* 1. Name & Contacts */}
                {user.role === 'admin' ? (
                  <>
                    <div className="grid grid-cols-1 gap-3.5">
                      <div>
                        <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Full Name</label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="w-full mt-1.5 px-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900/60 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Phone</label>
                          <input 
                            type="text" 
                            value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                            className="w-full mt-1.5 px-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900/60 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Email</label>
                          <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full mt-1.5 px-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900/60 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 space-y-3">
                    <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
                      <User size={16} className="text-blue-500" />
                      <span className="font-bold text-sm">{lead.name}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-450">
                      <Phone size={14} />
                      <span className="select-all">{lead.phone}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-450">
                      <Mail size={14} />
                      <span className="select-all">{lead.email}</span>
                    </div>
                  </div>
                )}

                {/* 2. Course & Source details */}
                {user.role === 'admin' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Course Interested</label>
                      <input 
                        type="text" 
                        value={course} 
                        onChange={e => setCourse(e.target.value)} 
                        className="w-full mt-1.5 px-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900/60 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Lead Source</label>
                      <input 
                        type="text" 
                        value={source} 
                        onChange={e => setSource(e.target.value)} 
                        className="w-full mt-1.5 px-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900/60 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/40 p-3.5 border rounded-xl">
                    <div>
                      <span className="text-4xs font-bold uppercase tracking-wider text-slate-400 block">Course</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block">{lead.course}</span>
                    </div>
                    <div>
                      <span className="text-4xs font-bold uppercase tracking-wider text-slate-400 block">Source</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-1 block">{lead.source}</span>
                    </div>
                  </div>
                )}

                {/* 3. Pipeline Status & Follow-up Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Status Stage</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Interested">Interested</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Converted">Converted</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Follow-up Reminder</label>
                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={e => setFollowUpDate(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* 4. Admin Only: Assignment & Revenue */}
                {user.role === 'admin' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Assigned Caller</label>
                      <select
                        value={assignedTo}
                        onChange={e => setAssignedTo(e.target.value)}
                        className="w-full mt-1.5 px-3 py-2 border rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {callersList.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.active ? '' : '(Inactive)'}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-3xs font-semibold uppercase tracking-wide text-slate-400">Revenue Generated ($)</label>
                      <div className="relative mt-1.5">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <DollarSign size={14} />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          value={revenue}
                          onChange={e => setRevenue(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 border rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Action buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-70 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader className="animate-spin" size={14} /> : null}
                  Save Changes
                </button>
              </div>

            </div>

            {/* Right Column: Notes & Activity Log */}
            <div className="flex flex-col border-l border-slate-100 dark:border-slate-800 md:pl-6 space-y-5">
              
              {/* Add Note Form */}
              <div className="space-y-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">Add Callback Remarks</span>
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Type call notes/remarks here..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="flex-1 px-3 py-2.5 border rounded-xl dark:border-slate-800 dark:bg-slate-900/60 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-75 transition-all"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>

              {/* Activity log / timeline */}
              <div className="flex-1 flex flex-col min-h-[220px]">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Activity History</span>
                
                <div className="flex-1 overflow-y-auto max-h-[300px] space-y-4 pr-1">
                  {activityLoading && activities.length === 0 ? (
                    <div className="py-8 text-center"><Loader className="animate-spin mx-auto text-slate-400" size={18} /></div>
                  ) : activities.length > 0 ? (
                    activities.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 text-2xs">
                        <div className="mt-0.5 p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          <Clock size={10} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-700 dark:text-slate-300">
                            <span className="font-semibold text-slate-950 dark:text-white">{act.user_id?.name || 'System'}</span>: {act.action}
                          </p>
                          <span className="text-4xs text-slate-400 mt-0.5 block">{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-2xs">No activity logged for this lead file.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default LeadModal;
