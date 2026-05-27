import React, { useState, useEffect } from 'react';
import { X, Printer, Receipt, DollarSign, Calendar, CreditCard } from 'lucide-react';

const ReceiptModal = ({ isOpen, onClose, lead, leadsList = [] }) => {
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Receipt States
  const [receiptNo, setReceiptNo] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');

  // Handle setting default states when a lead is passed or selected
  useEffect(() => {
    const activeLead = lead || (leadsList.length > 0 ? leadsList[0] : null);
    setSelectedLead(activeLead);

    if (activeLead) {
      const dateStr = new Date().toISOString().substring(0, 10);
      const generatedNo = `REC-KS-${Math.floor(100000 + Math.random() * 900000)}`;
      
      setReceiptNo(generatedNo);
      setDate(dateStr);
      setAmount(activeLead.revenue || '0');
      setNotes('Fees Received');
    }
  }, [lead, isOpen, leadsList]);

  // When dropdown selection changes
  const handleLeadChange = (e) => {
    const found = leadsList.find(l => l.id === e.target.value);
    if (found) {
      setSelectedLead(found);
      setAmount(found.revenue || '0');
      setNotes('Fees Received');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      
      {/* Print styles injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-area, #printable-receipt-area * {
            visibility: visible !important;
          }
          #printable-receipt-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print-btn {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden text-slate-700 dark:text-slate-350 animate-scale-in">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <Receipt className="text-blue-500" size={20} />
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Print Student Fee Receipt</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 rounded-lg p-1.5 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Input Panel */}
          <div className="space-y-4">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Receipt Parameters</span>
            
            {/* Student Selector */}
            {!lead && leadsList.length > 0 && (
              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Select Student</label>
                <select
                  value={selectedLead?.id || ''}
                  onChange={handleLeadChange}
                  className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs text-slate-950 dark:text-slate-350 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {leadsList.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.course})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Receipt No */}
              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Receipt Number</label>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={e => setReceiptNo(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Receipt Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Amount Paid */}
              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Amount Paid (INR)</label>
                <div className="relative mt-1.5">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs">₹</span>
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-3xs font-semibold uppercase text-slate-400">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs text-slate-950 dark:text-slate-350 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">Cash Payment</option>
                  <option value="Bank Transfer">Bank NEFT / IMPS</option>
                  <option value="Credit Card">Credit / Debit Card</option>
                  <option value="Other">Other Method</option>
                </select>
              </div>
            </div>

            {/* Receipt Remarks */}
            <div>
              <label className="text-3xs font-semibold uppercase text-slate-400">Receipt Remarks / Description</label>
              <textarea
                rows="3"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full mt-1.5 px-3.5 py-3.5 border rounded-xl dark:border-slate-800 dark:bg-slate-900 bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400"
                placeholder="Enter receipt notes..."
              ></textarea>
            </div>

            <button
              onClick={handlePrint}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer size={14} />
              Print Receipt
            </button>
          </div>

          {/* Right Column: Interactive Live Preview Panel */}
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40 p-5 rounded-2xl flex flex-col">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Live Receipt Preview</span>
            
            {/* Printable Receipt Card */}
            <div 
              id="printable-receipt-area" 
              className="flex-1 bg-white text-slate-900 p-6 rounded-xl border border-slate-200 shadow-sm font-sans flex flex-col justify-between min-h-[360px]"
            >
              <div>
                {/* Receipt Header */}
                <div className="flex items-center justify-between border-b pb-4 border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src="/ks_logo.png" 
                      alt="KS Logo" 
                      className="w-14 h-14 object-contain rounded-lg border border-slate-150 p-0.5 bg-white" 
                    />
                    <div>
                      <h4 className="font-extrabold text-sm tracking-tight text-slate-950 uppercase">Krishna Sapkal</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-slate-100 text-slate-700 text-5xs font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      Receipt
                    </span>
                    <p className="text-3xs font-mono font-bold mt-1 text-slate-650">{receiptNo}</p>
                  </div>
                </div>

                {/* Receipt Details Block */}
                <div className="mt-5 space-y-3.5 text-xs">
                  <div className="flex justify-between items-baseline border-b border-dashed pb-1.5 border-slate-200">
                    <span className="text-slate-400 text-2xs font-semibold">Student Name:</span>
                    <span className="font-bold text-slate-900">{selectedLead?.name || '—'}</span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-dashed pb-1.5 border-slate-200">
                    <span className="text-slate-400 text-2xs font-semibold">Contact Phone:</span>
                    <span className="font-semibold text-slate-800">{selectedLead?.phone || '—'}</span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-dashed pb-1.5 border-slate-200">
                    <span className="text-slate-400 text-2xs font-semibold">Course Enrolled:</span>
                    <span className="font-bold text-slate-800">{selectedLead?.course || '—'}</span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-dashed pb-1.5 border-slate-200">
                    <span className="text-slate-400 text-2xs font-semibold">Payment Date:</span>
                    <span className="font-semibold text-slate-800">{date ? new Date(date).toLocaleDateString() : '—'}</span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-dashed pb-1.5 border-slate-200">
                    <span className="text-slate-400 text-2xs font-semibold">Payment Mode:</span>
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-3xs">{paymentMethod}</span>
                  </div>

                  {notes && (
                    <div className="pt-1.5">
                      <span className="text-slate-400 text-5xs font-bold uppercase tracking-wider block">Remarks:</span>
                      <p className="text-3xs text-slate-600 mt-1 italic leading-relaxed border-l-2 pl-2 border-slate-200">{notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Total and Signatures */}
              <div className="mt-8 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-5xs font-bold text-slate-400 uppercase tracking-widest block">Total Fees Received</span>
                    <span className="text-xl font-black text-blue-650 tracking-tight mt-1 block">
                      ₹ {Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-center w-28 flex flex-col items-center">
                    <img 
                      src="/signature.png" 
                      alt="Krishna Signature" 
                      className="h-8 object-contain mb-1 pointer-events-none select-none" 
                    />
                    <div className="w-full border-t border-slate-200 pt-1">
                      <span className="text-5xs font-bold text-slate-450 uppercase tracking-wider block">Authorized Sign</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ReceiptModal;
