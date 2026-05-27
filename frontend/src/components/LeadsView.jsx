import React, { useState } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Plus, 
  FileUp, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  UserCheck,
  CalendarCheck,
  UserSquare2,
  X,
  Loader,
  Printer
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';

const LeadsView = ({ 
  leads, 
  callersList = [], 
  onSelectLead, 
  onRefresh, 
  onAddLead 
}) => {
  const { user, token } = useAuth();
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [callerFilter, setCallerFilter] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add Lead Modal (Admin Only)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    course: 'Basic',
    source: '',
    status: 'New',
    assigned_to: '',
    notes: '',
    follow_up_date: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [counsellorSelect, setCounsellorSelect] = useState('');
  const [counsellorManualName, setCounsellorManualName] = useState('');

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptLead, setReceiptLead] = useState(null);

  // CSV Import Modal (Admin Only)
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Filter leads based on search query and filter states
  const filteredLeads = leads.filter(lead => {
    const query = search.toLowerCase();
    const matchSearch = 
      lead.name.toLowerCase().includes(query) ||
      lead.phone.toLowerCase().includes(query) ||
      (lead.email && lead.email.toLowerCase().includes(query)) ||
      lead.course.toLowerCase().includes(query) ||
      lead.source.toLowerCase().includes(query);

    const matchStatus = statusFilter ? lead.status === statusFilter : true;
    
    // Admin only filter
    const matchCaller = callerFilter 
      ? (callerFilter === 'unassigned' ? !lead.assigned_to : lead.assigned_to?.id === callerFilter) 
      : true;

    return matchSearch && matchStatus && matchCaller;
  });

  // Pagination Math
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Delete Lead Handler (Admin Only)
  const handleDelete = async (id, name, e) => {
    e.stopPropagation(); // Avoid triggering details modal
    if (!window.confirm(`Are you sure you want to permanently delete lead: "${name}"?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/leads/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete lead file.');
      alert('Lead deleted.');
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/leads/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Export query failed.');
      
      const csvBlob = await res.blob();
      const url = window.URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_export_${new Date().toISOString().substring(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(err.message);
    }
  };

  // Single Lead Submit (Admin Only)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone || !newLead.course) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setIsCreating(true);
      // POSTing to authenticated API endpoint which handles caller-specific assignment constraints
      const res = await fetch(`${API_BASE_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLead)
      });

      if (!res.ok) throw new Error('Failed to insert lead file');
      const data = await res.json();
      alert(`Lead inserted and assigned to: ${data.assignedTo}`);
      
      setIsAddOpen(false);
      setCounsellorSelect('');
      setCounsellorManualName('');
      setNewLead({
        name: '',
        phone: '',
        email: '',
        course: 'Basic',
        source: '',
        status: 'New',
        assigned_to: '',
        notes: '',
        follow_up_date: ''
      });
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // CSV Import Submit (Admin Only)
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!csvText.trim()) {
      alert('CSV data cannot be empty.');
      return;
    }

    try {
      setIsImporting(true);
      // Parse CSV Text: Expect rows of "Name,Phone,Email,Course,Source"
      const lines = csvText.split('\n');
      const leadsList = [];

      lines.forEach((line, idx) => {
        const columns = line.split(',');
        if (columns.length >= 4) {
          // Clean quotes and spaces
          const cleanCol = (col) => col ? col.replace(/^["']|["']$/g, '').trim() : '';
          leadsList.push({
            name: cleanCol(columns[0]),
            phone: cleanCol(columns[1]),
            email: cleanCol(columns[2]),
            course: cleanCol(columns[3]),
            source: cleanCol(columns[4]) || 'CSV Batch Import'
          });
        }
      });

      if (leadsList.length === 0) {
        throw new Error('No valid leads detected. Ensure format is: Name,Phone,Email,Course,Source(optional)');
      }

      // POST to Express backend CSV import API
      const res = await fetch(`${API_BASE_URL}/admin/leads/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leadsList })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to parse batch list.');
      }

      const data = await res.json();
      alert(data.message);
      setIsImportOpen(false);
      setCsvText('');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Theme badges mapping
  const badgeClasses = {
    'New': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    'Contacted': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    'Interested': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    'Follow-up': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    'Converted': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    'Not Interested': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Actions Bar */}
      <div className="glass-panel p-5 rounded-2xl border shadow-xs flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
        
        {/* Left Side: Search and status filter */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-3xl">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl bg-white/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>

          <div className="flex gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3.5 py-2 border rounded-xl bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Converted">Converted</option>
              <option value="Not Interested">Not Interested</option>
            </select>

            {/* Caller Filter (Admin Only) */}
            {user.role === 'admin' && (
              <select
                value={callerFilter}
                onChange={(e) => { setCallerFilter(e.target.value); setCurrentPage(1); }}
                className="px-3.5 py-2 border rounded-xl bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">All Callers</option>
                <option value="unassigned">Unassigned</option>
                {callersList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Right Side: Operation triggers */}
        <div className="flex gap-2.5 sm:self-end">
          {/* Print Receipt Trigger */}
          <button
            onClick={() => {
              setReceiptLead(null);
              setIsReceiptOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-650 dark:text-slate-350 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Printer size={14} />
            Print Receipt
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              <FileUp size={14} />
              Import Batch
            </button>
          )}

          {/* Add Single Lead */}
          <button
            onClick={() => {
              setNewLead({
                name: '',
                phone: '',
                email: '',
                course: 'Basic',
                source: '',
                status: 'New',
                assigned_to: user.role === 'caller' ? user.id : '',
                notes: '',
                follow_up_date: ''
              });
              setCounsellorSelect(user.role === 'caller' ? user.id : '');
              setCounsellorManualName('');
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-blue-500/10 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Create Lead
          </button>
        </div>

      </div>

      {/* Main Leads Table */}
      <div className="glass-panel rounded-2xl border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/10 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Name / Details</th>
                <th className="py-3.5 px-4">Course Interested</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned Agent</th>
                <th className="py-3.5 px-4">Follow-Up</th>
                <th className="py-3.5 px-4">Date Added</th>
                <th className="py-3.5 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {currentLeads.map((lead) => (
                <tr 
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors cursor-pointer"
                >
                  {/* Name, phone, email */}
                  <td className="py-4.5 px-6">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block hover:text-blue-600 dark:hover:text-blue-400">{lead.name}</span>
                      <span className="text-3xs text-slate-400 dark:text-slate-500 block mt-0.5">{lead.phone} {lead.email ? `• ${lead.email}` : ''}</span>
                    </div>
                  </td>
                  
                  {/* Course & Source */}
                  <td className="py-4.5 px-4">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 block text-xs">{lead.course}</span>
                      <span className="text-4xs text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">{lead.source}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-4.5 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClasses[lead.status] || 'bg-slate-100'}`}>
                      {lead.status}
                    </span>
                  </td>

                  {/* Assigned Caller */}
                  <td className="py-4.5 px-4">
                    {lead.assigned_to ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-250 font-medium">
                        <UserCheck size={12} className="text-slate-400" />
                        {lead.assigned_to.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-450 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Follow Up date */}
                  <td className="py-4.5 px-4">
                    {lead.follow_up_date ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-250 font-medium">
                        <CalendarCheck size={12} className="text-slate-400" />
                        {new Date(lead.follow_up_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-450">—</span>
                    )}
                  </td>

                  {/* Created date */}
                  <td className="py-4.5 px-4 text-xs text-slate-400">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>

                  {/* Actions cell (Print and Delete) */}
                  <td className="py-4.5 px-6 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptLead(lead);
                          setIsReceiptOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-500/10 cursor-pointer transition-colors"
                        title="Print receipt for this student"
                      >
                        <Printer size={14} />
                      </button>

                      {user.role === 'admin' && (
                        <button
                          onClick={(e) => handleDelete(lead.id, lead.name, e)}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Delete lead file"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              ))}

              {currentLeads.length === 0 && (
                <tr>
                  <td colSpan={user.role === 'admin' ? 7 : 6} className="py-12 text-center text-slate-400 text-xs">
                    No leads found matching current query filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10">
          <span className="text-2xs text-slate-500">
            Showing <span className="font-bold text-slate-800 dark:text-slate-250">{filteredLeads.length > 0 ? indexOfFirstItem + 1 : 0}</span> to <span className="font-bold text-slate-800 dark:text-slate-250">{Math.min(indexOfLastItem, filteredLeads.length)}</span> of <span className="font-bold text-slate-800 dark:text-slate-250">{filteredLeads.length}</span> entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border rounded-lg text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold px-3 text-slate-800 dark:text-slate-250">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border rounded-lg text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* MODAL 1: ADD SINGLE LEAD FILE */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-lg rounded-3xl shadow-2xl border text-slate-700 dark:text-slate-350 p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">Create Single Lead</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-650 rounded cursor-pointer"><X size={18}/></button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={newLead.name}
                  onChange={e => setNewLead({...newLead, name: e.target.value})}
                  className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-3xs font-semibold uppercase text-slate-400">Phone *</label>
                  <input 
                    type="text" 
                    required
                    value={newLead.phone}
                    onChange={e => setNewLead({...newLead, phone: e.target.value})}
                    className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-3xs font-semibold uppercase text-slate-400">Email (Optional)</label>
                  <input 
                    type="email" 
                    value={newLead.email}
                    onChange={e => setNewLead({...newLead, email: e.target.value})}
                    className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Course Interested *</label>
                <select
                  required
                  value={newLead.course}
                  onChange={e => setNewLead({...newLead, course: e.target.value})}
                  className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs text-slate-950 dark:text-slate-350 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Basic">Basic</option>
                  <option value="Advance">Advance</option>
                  <option value="Premium">Premium</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-3xs font-semibold uppercase text-slate-400">Call Status</label>
                  <select
                    value={newLead.status}
                    onChange={e => setNewLead({...newLead, status: e.target.value})}
                    className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs text-slate-950 dark:text-slate-350 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <label className="text-3xs font-semibold uppercase text-slate-400">Counsellor</label>
                  {user.role === 'admin' ? (
                    <>
                      <select
                        value={counsellorSelect}
                        onChange={e => {
                          const val = e.target.value;
                          setCounsellorSelect(val);
                          if (val === 'Other') {
                            setNewLead({...newLead, assigned_to: ''});
                            setCounsellorManualName('');
                          } else {
                            setNewLead({...newLead, assigned_to: val});
                            setCounsellorManualName('');
                          }
                        }}
                        className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs text-slate-955 dark:text-slate-355 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">Auto-Assign (Round-robin)</option>
                        {callersList.filter(u => u.role === 'caller' && u.active).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>

                      {counsellorSelect === 'Other' && (
                        <div className="mt-2.5">
                          <input 
                            type="text" 
                            placeholder="Type counsellor name"
                            value={counsellorManualName}
                            onChange={e => {
                              const val = e.target.value;
                              setCounsellorManualName(val);
                              const match = callersList.find(c => c.role === 'caller' && c.active && c.name.toLowerCase().trim() === val.toLowerCase().trim());
                              setNewLead({...newLead, assigned_to: match ? match.id : ''});
                            }}
                            className="w-full px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs"
                          />
                          {counsellorManualName.trim() && !newLead.assigned_to && (
                            <span className="text-4xs text-rose-500 font-semibold mt-1 block">
                              No matching registered caller account.
                            </span>
                          )}
                          {counsellorManualName.trim() && newLead.assigned_to && (
                            <span className="text-4xs text-emerald-500 font-semibold mt-1 block">
                              ✓ Matches active caller account
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <input 
                      type="text" 
                      readOnly 
                      value={user.name} 
                      className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900/60 bg-slate-100/50 text-slate-500 text-xs focus:outline-none cursor-not-allowed"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-3xs font-semibold uppercase text-slate-400">Next Follow-up Date</label>
                  <input 
                    type="date" 
                    value={newLead.follow_up_date}
                    onChange={e => setNewLead({...newLead, follow_up_date: e.target.value})}
                    className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-3xs font-semibold uppercase text-slate-400">Lead Source</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Facebook Ad, Website"
                    value={newLead.source}
                    onChange={e => setNewLead({...newLead, source: e.target.value})}
                    className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Discussion Notes</label>
                <textarea
                  rows="3"
                  value={newLead.notes}
                  onChange={e => setNewLead({...newLead, notes: e.target.value})}
                  className="w-full mt-1.5 px-3.5 py-3 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500"
                  placeholder="Enter initial discussion notes..."
                ></textarea>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 border rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75"
                >
                  {isCreating ? <Loader className="animate-spin" size={12}/> : null}
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CSV BULK IMPORT DRAWER */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-panel w-full max-w-xl rounded-3xl shadow-2xl border text-slate-700 dark:text-slate-350 p-6 animate-scale-in">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Batch Import Leads</h3>
                <p className="text-4xs text-slate-400 mt-0.5">Leads will be assigned cyclic round-robin to callers.</p>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-650 rounded cursor-pointer"><X size={18}/></button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400 block mb-1.5">Paste CSV Lines (Format: Name,Phone,Email,Course,Source)</label>
                <textarea
                  required
                  rows="8"
                  placeholder="John Doe,123456789,john@email.com,Elite Business Coaching,Facebook Ad&#10;Jane Smith,987654321,jane@email.com,Executive Coaching,LinkedIn Outreach"
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full p-3 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border rounded-xl text-3xs text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">CSV Instruction:</span>
                Provide one lead per line. Fields should be separated by commas (Name, Phone, Email, Course, Source). Quotation marks around fields are supported and stripped.
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="flex-1 py-2.5 border rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-75"
                >
                  {isImporting ? <Loader className="animate-spin" size={12}/> : null}
                  Start Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      <ReceiptModal 
        isOpen={isReceiptOpen} 
        onClose={() => setIsReceiptOpen(false)} 
        lead={receiptLead} 
        leadsList={leads} 
      />

    </div>
  );
};

export default LeadsView;
