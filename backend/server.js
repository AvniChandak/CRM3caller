import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for Authorization headers
app.use(cors({
  origin: '*', // In production, customize this to your front-end URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// List of connected Server-Sent Events (SSE) clients for real-time dashboard updates
let sseClients = [];

// ==========================================
// REAL-TIME SYSTEM (Server-Sent Events)
// ==========================================

// SSE subscription endpoint
app.get('/api/realtime', async (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Token query parameter required for real-time updates' });
  }

  try {
    // Validate token using Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized token' });
    }

    // Get user details from our database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.active) {
      return res.status(401).json({ error: 'Active profile not found' });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const client = {
      id: profile.id,
      role: profile.role,
      res
    };

    sseClients.push(client);
    console.log(`Real-time client connected: ${profile.name} (${profile.role})`);

    // Send connection established event
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Real-time subscription established' })}\n\n`);

    // Ping client every 30 seconds to keep connection alive
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients = sseClients.filter(c => c.res !== res);
      console.log(`Real-time client disconnected: ${profile.name}`);
    });

  } catch (err) {
    console.error('SSE initialization error:', err);
    res.status(500).json({ error: 'Failed to establish real-time connection' });
  }
});

// Broadcast changes to active SSE clients depending on their roles
const broadcastUpdate = (type, data) => {
  sseClients.forEach(client => {
    try {
      if (client.role === 'admin') {
        // Admins see all changes
        client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
      } else if (client.role === 'caller') {
        // Callers only receive updates for leads assigned to them
        if (data.assigned_to === client.id) {
          // Remove revenue for caller security
          const sanitizedLead = { ...data };
          delete sanitizedLead.revenue;
          client.res.write(`data: ${JSON.stringify({ type, data: sanitizedLead })}\n\n`);
        }
      }
    } catch (err) {
      console.error('Error writing to SSE client:', err);
    }
  });
};

// ==========================================
// MIDDLEWARES
// ==========================================

// Authenticate JWT tokens issued by Supabase Auth
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Retrieve full profile from database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found in database' });
    }

    if (!profile.active) {
      return res.status(403).json({ error: 'User account is inactive. Please contact the administrator.' });
    }

    req.user = profile;
    next();
  } catch (err) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Enforce admin-only routes
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin role required' });
  }
  next();
};

// ==========================================
// ROUTES
// ==========================================

// --- PUBLIC INTEGRATION ENDPOINT ---
// Submits a lead from the public website, performs round-robin auto-assignment
app.post('/api/public/leads', async (req, res) => {
  const { name, phone, email, course, source, status, assigned_to, notes, follow_up_date } = req.body;

  if (!name || !phone || !course) {
    return res.status(400).json({ error: 'Missing required fields: name, phone, course' });
  }

  try {
    // 1. Get all active caller accounts ordered by creation date to guarantee consistent cyclic order
    const { data: callers, error: callersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'caller')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (callersError) throw callersError;

    let assignedTo = assigned_to || null;
    let assignedCallerName = 'Unassigned';

    if (assignedTo && assignedTo !== '') {
      // Find the name of the assigned counsellor
      const { data: counsellor } = await supabase
        .from('users')
        .select('name')
        .eq('id', assignedTo)
        .single();
      if (counsellor) {
        assignedCallerName = counsellor.name;
      }
    } else if (callers && callers.length > 0) {
      // 2. Query the last assigned lead to find who it went to
      const { data: lastLeads, error: lastLeadError } = await supabase
        .from('leads')
        .select('assigned_to')
        .not('assigned_to', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastLeadError) throw lastLeadError;

      let nextIndex = 0;
      if (lastLeads && lastLeads.length > 0) {
        const lastAssignedId = lastLeads[0].assigned_to;
        // Find index of the last assigned caller in active callers list
        const lastIndex = callers.findIndex(c => c.id === lastAssignedId);
        if (lastIndex !== -1) {
          nextIndex = (lastIndex + 1) % callers.length;
        }
      }

      assignedTo = callers[nextIndex].id;
      assignedCallerName = callers[nextIndex].name;
    }

    // 3. Insert lead into database
    const newLead = {
      name,
      phone,
      email,
      course,
      source: source || 'Public Website',
      status: status || 'New',
      assigned_to: assignedTo || null,
      revenue: 0,
      notes: notes || '',
      follow_up_date: follow_up_date || null
    };

    const { data: insertedLead, error: insertError } = await supabase
      .from('leads')
      .insert([newLead])
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Log activity
    // Find an admin user to attribute the auto-assignment system activity log
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);

    const systemUserId = admins && admins.length > 0 ? admins[0].id : (assignedTo || insertedLead.id);

    const activityText = req.body.assigned_to
      ? `Lead created manually and assigned to ${assignedCallerName}`
      : (assignedTo
        ? `Lead submitted via website and auto-assigned to ${assignedCallerName} (Round-robin)`
        : 'Lead submitted via website (Unassigned: no active callers)');

    await supabase
      .from('activities')
      .insert([{
        lead_id: insertedLead.id,
        user_id: systemUserId,
        action: activityText
      }]);

    // 5. Trigger SSE updates
    broadcastUpdate('LEAD_CREATED', insertedLead);

    return res.status(201).json({
      message: 'Lead created successfully',
      leadId: insertedLead.id,
      assignedTo: assignedCallerName
    });

  } catch (err) {
    console.error('Public lead submission error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// --- ADMIN: CALLER MANAGEMENT ---

// GET: List all users (Admins & Callers)
app.get('/api/admin/users', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST: Create a new caller account (strictly enforce exact 3-caller limit)
app.post('/api/admin/users', authenticateJWT, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing user details: name, email, password, role' });
  }

  if (role !== 'caller' && role !== 'admin') {
    return res.status(400).json({ error: 'Invalid role. Must be admin or caller.' });
  }

  try {

    // 1. Create user in Supabase Auth using admin panel
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // 2. Insert into the public.users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert([{
        id: authUser.user.id,
        name,
        email,
        role,
        active: true
      }])
      .select()
      .single();

    if (profileError) {
      // Rollback auth creation if public user insert fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    return res.status(201).json({ message: 'User account created successfully', user: profile });

  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PUT: Update caller account status (activate/deactivate caller or edit name)
app.put('/api/admin/users/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, active } = req.body;

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (active !== undefined) updateData.active = active;

    const { data: updatedProfile, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Optional: Sync status with Supabase Auth (e.g. ban user if deactivated, or let the session block filter handle it)
    if (active === false) {
      // You can ban the user in Supabase Auth to prevent active login sessions:
      // Note: we can just check profile.active on backend API request authentication which forces deactivation immediately!
    }

    return res.json({ message: 'User updated successfully', user: updatedProfile });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE: Delete a user account (Admin only)
app.delete('/api/admin/users/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Delete user from public.users table (FK on delete set null handles leads table)
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (profileError) throw profileError;

    // 2. Delete user from Supabase Auth via Admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.warn('Auth deletion warning:', authError.message);
    }

    return res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});


// GET: Fetch current logged in user profile details
app.get('/api/auth/me', authenticateJWT, async (req, res) => {
  return res.json(req.user);
});


// --- SHARED/ROLE-FILTERED LEADS API ---


// GET: Fetch all leads (Admins see all, Callers see only their assigned leads)
app.get('/api/leads', authenticateJWT, async (req, res) => {
  try {
    let query = supabase.from('leads').select('*, assigned_to(id, name)');

    // Enforce data filtering based on the caller's role
    if (req.user.role === 'caller') {
      query = query.eq('assigned_to', req.user.id);
    }

    const { data: leads, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Caller must never see revenue
    if (req.user.role === 'caller') {
      leads.forEach(lead => {
        delete lead.revenue;
      });
    }

    return res.json(leads);
  } catch (err) {
    console.error('Fetch leads error:', err);
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET: Export leads in CSV format (Role-Filtered)
app.get('/api/leads/export', authenticateJWT, async (req, res) => {
  try {
    let query = supabase.from('leads').select('name, phone, status, follow_up_date, notes, created_at, assigned_to(id, name)');

    if (req.user.role === 'caller') {
      query = query.eq('assigned_to', req.user.id);
    }

    const { data: leads, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Convert JSON to CSV format
    if (leads.length === 0) {
      return res.status(200).send('No data available');
    }

    const headers = "Number,Student Name,Call Status,Next Follow-up Date,Discussion Notes,Date,Counsellor";
    const rows = leads.map(lead => {
      const counsellorName = lead.assigned_to ? lead.assigned_to.name : 'Unassigned';
      const formattedDate = lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '';
      const formattedFollowUp = lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : '';

      const values = [
        lead.phone || '',
        lead.name || '',
        lead.status || '',
        formattedFollowUp,
        lead.notes || '',
        formattedDate,
        counsellorName
      ];

      return values.map(val => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
    return res.status(200).send(csvContent);

  } catch (err) {
    console.error('CSV Export error:', err);
    return res.status(500).json({ error: 'Failed to export CSV file' });
  }
});

// GET: Fetch lead details
app.get('/api/leads/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*, assigned_to(id, name)')
      .eq('id', id)
      .single();

    if (error || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Security check: Caller cannot view other callers' leads
    if (req.user.role === 'caller' && lead.assigned_to?.id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Lead not assigned to you' });
    }

    // Clean revenue for caller
    if (req.user.role === 'caller') {
      delete lead.revenue;
    }

    return res.json(lead);
  } catch (err) {
    console.error('Fetch lead detail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT: Update lead (Role permissions checked)
app.put('/api/leads/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // 1. Fetch current lead state
    const { data: currentLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Security check: Caller cannot edit other callers' leads
    if (req.user.role === 'caller' && currentLead.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Lead not assigned to you' });
    }

    const payload = {};
    const changes = [];

    // 2. Extract allowed fields depending on role
    if (req.user.role === 'admin') {
      // Admins can update everything
      const fields = ['name', 'phone', 'email', 'course', 'source', 'status', 'assigned_to', 'notes', 'revenue', 'follow_up_date'];
      fields.forEach(f => {
        if (updates[f] !== undefined) {
          payload[f] = updates[f];
          if (currentLead[f] !== updates[f]) {
            changes.push({ field: f, old: currentLead[f], new: updates[f] });
          }
        }
      });
    } else {
      // Callers can ONLY update status, notes, follow_up_date
      const fields = ['status', 'notes', 'follow_up_date'];
      fields.forEach(f => {
        if (updates[f] !== undefined) {
          payload[f] = updates[f];
          if (currentLead[f] !== updates[f]) {
            changes.push({ field: f, old: currentLead[f], new: updates[f] });
          }
        }
      });

      // Reject unauthorized field edits by callers
      if (updates.assigned_to !== undefined || updates.revenue !== undefined) {
        return res.status(403).json({ error: 'Access denied: Callers cannot change assignment or revenue.' });
      }
    }

    if (changes.length === 0) {
      return res.json({ message: 'No changes detected', lead: currentLead });
    }

    // 3. Update database
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 4. Log actions to Activities
    const activityInserts = changes.map(change => {
      let actionText = '';
      if (change.field === 'status') {
        actionText = `Status updated from "${change.old}" to "${change.new}" by ${req.user.name}`;
      } else if (change.field === 'assigned_to') {
        actionText = `Lead reassigned by ${req.user.name}`;
      } else if (change.field === 'revenue') {
        actionText = `Revenue updated from $${change.old} to $${change.new} by ${req.user.name}`;
      } else if (change.field === 'notes') {
        actionText = `Notes updated by ${req.user.name}`;
      } else if (change.field === 'follow_up_date') {
        const dateStr = change.new ? new Date(change.new).toLocaleDateString() : 'Removed';
        actionText = `Follow-up date set to ${dateStr} by ${req.user.name}`;
      } else {
        actionText = `Field "${change.field}" updated by ${req.user.name}`;
      }

      return {
        lead_id: id,
        user_id: req.user.id,
        action: actionText
      };
    });

    if (activityInserts.length > 0) {
      await supabase.from('activities').insert(activityInserts);
    }

    // 5. Broadcast changes
    broadcastUpdate('LEAD_UPDATED', updatedLead);

    return res.json({ message: 'Lead updated successfully', lead: updatedLead });

  } catch (err) {
    console.error('Update lead error:', err);
    return res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE: Delete lead (Admin only)
app.delete('/api/leads/:id', authenticateJWT, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: leadToDelete } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (leadToDelete) {
      broadcastUpdate('LEAD_DELETED', leadToDelete);
    }

    return res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Delete lead error:', err);
    return res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// GET: Fetch lead activities / notes history timeline
app.get('/api/leads/:id/activities', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    // Security check: Caller cannot view other callers' activities
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('assigned_to')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user.role === 'caller' && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: activities, error } = await supabase
      .from('activities')
      .select('*, user_id(name, role)')
      .eq('lead_id', id)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return res.json(activities);
  } catch (err) {
    console.error('Fetch activities error:', err);
    return res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// POST: Add custom note to lead (inserts to notes + records activity)
app.post('/api/leads/:id/notes', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  if (!note) {
    return res.status(400).json({ error: 'Note text is required' });
  }

  try {
    // 1. Fetch current lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Security check: Caller cannot edit other callers' leads
    if (req.user.role === 'caller' && lead.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 2. Append note to existing notes
    const updatedNotes = lead.notes
      ? `${lead.notes}\n\n[${new Date().toLocaleString()} - ${req.user.name}]: ${note}`
      : `[${new Date().toLocaleString()} - ${req.user.name}]: ${note}`;

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({ notes: updatedNotes })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Insert activity log
    await supabase
      .from('activities')
      .insert([{
        lead_id: id,
        user_id: req.user.id,
        action: `Note added by ${req.user.name}: "${note.substring(0, 50)}${note.length > 50 ? '...' : ''}"`
      }]);

    broadcastUpdate('LEAD_UPDATED', updatedLead);

    return res.json({ message: 'Note added successfully', lead: updatedLead });

  } catch (err) {
    console.error('Add note error:', err);
    return res.status(500).json({ error: 'Failed to add note' });
  }
});


// --- ADMIN: ANALYTICS ---
// Company-wide analytics (revenue, conversions per caller, charts)
app.get('/api/admin/analytics', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    // 1. Total count, conversions and sum of revenue
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, status, revenue, source, assigned_to');

    if (leadsError) throw leadsError;

    const totalLeads = leads.length;
    const totalConversions = leads.filter(l => l.status === 'Converted').length;
    const totalRevenue = leads.reduce((sum, l) => sum + Number(l.revenue || 0), 0);

    // 2. Get list of all callers
    const { data: callers, error: callersError } = await supabase
      .from('users')
      .select('id, name, active')
      .eq('role', 'caller');

    if (callersError) throw callersError;

    const callerPerformance = callers.map(caller => {
      const assigned = leads.filter(l => l.assigned_to === caller.id);
      const conversions = assigned.filter(l => l.status === 'Converted').length;
      const revenue = assigned.reduce((sum, l) => sum + Number(l.revenue || 0), 0);
      const conversionRate = assigned.length > 0 ? ((conversions / assigned.length) * 100).toFixed(1) : 0;

      return {
        id: caller.id,
        name: caller.name,
        active: caller.active,
        totalAssigned: assigned.length,
        conversions,
        conversionRate: Number(conversionRate),
        revenue
      };
    });

    // 3. Group by Source
    const sourceMap = {};
    leads.forEach(l => {
      sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
    });
    const leadsBySource = Object.keys(sourceMap).map(key => ({ source: key, count: sourceMap[key] }));

    // 4. Group by Status
    const statusMap = {};
    leads.forEach(l => {
      statusMap[l.status] = (statusMap[l.status] || 0) + 1;
    });
    const leadsByStatus = Object.keys(statusMap).map(key => ({ status: key, count: statusMap[key] }));

    // 5. Recent Activity Log (join user and lead)
    const { data: recentActivities, error: actError } = await supabase
      .from('activities')
      .select('id, action, timestamp, lead_id(name), user_id(name)')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (actError) throw actError;

    const formattedActivities = recentActivities.map(act => ({
      id: act.id,
      action: act.action,
      timestamp: act.timestamp,
      leadName: act.lead_id?.name || 'Deleted Lead',
      userName: act.user_id?.name || 'System'
    }));

    return res.json({
      totalLeads,
      totalConversions,
      totalRevenue,
      callerPerformance,
      leadsBySource,
      leadsByStatus,
      recentActivities: formattedActivities
    });

  } catch (err) {
    console.error('Fetch analytics error:', err);
    return res.status(500).json({ error: 'Failed to compute analytics' });
  }
});


// --- BULK OPERATIONS & EXPORTS ---



// POST: CSV Bulk Import (Admin Only: round-robin auto-assigns leads)
app.post('/api/admin/leads/import', authenticateJWT, requireAdmin, async (req, res) => {
  const { leadsList } = req.body; // Array of objects: [{ name, phone, email, course, source }]

  if (!leadsList || !Array.isArray(leadsList) || leadsList.length === 0) {
    return res.status(400).json({ error: 'Invalid payload: List of leads is required' });
  }

  try {
    // 1. Get all active callers
    const { data: callers, error: callersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'caller')
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (callersError) throw callersError;

    // 2. Query last assigned caller to maintain sequence
    const { data: lastLeads, error: lastLeadError } = await supabase
      .from('leads')
      .select('assigned_to')
      .not('assigned_to', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastLeadError) throw lastLeadError;

    let callerIndex = 0;
    if (callers && callers.length > 0 && lastLeads && lastLeads.length > 0) {
      const lastAssignedId = lastLeads[0].assigned_to;
      const lastIndex = callers.findIndex(c => c.id === lastAssignedId);
      if (lastIndex !== -1) {
        callerIndex = (lastIndex + 1) % callers.length;
      }
    }

    const insertedLeads = [];
    const activitiesToInsert = [];

    // 3. Process each lead and distribute round-robin
    for (const item of leadsList) {
      const { name, phone, email, course, source } = item;
      if (!name || !phone || !course) continue; // Skip incomplete items

      let assignedTo = null;
      let callerName = '';

      if (callers && callers.length > 0) {
        assignedTo = callers[callerIndex].id;
        callerName = callers[callerIndex].name;
        // Advance cycle index
        callerIndex = (callerIndex + 1) % callers.length;
      }

      const leadRecord = {
        name,
        phone,
        email,
        course,
        source: source || 'CSV Import',
        status: 'New',
        assigned_to: assignedTo,
        revenue: 0,
        notes: ''
      };

      const { data: dbLead, error: insErr } = await supabase
        .from('leads')
        .insert([leadRecord])
        .select()
        .single();

      if (insErr) {
        console.error(`Import failed for lead: ${name}`, insErr);
        continue;
      }

      insertedLeads.push(dbLead);

      const actionText = assignedTo
        ? `Lead imported and auto-assigned to ${callerName} (Round-robin)`
        : 'Lead imported (Unassigned: no active callers)';

      activitiesToInsert.push({
        lead_id: dbLead.id,
        user_id: req.user.id, // Log under current admin who imported CSV
        action: actionText
      });

      // Broadcast each import event
      broadcastUpdate('LEAD_CREATED', dbLead);
    }

    if (activitiesToInsert.length > 0) {
      await supabase.from('activities').insert(activitiesToInsert);
    }

    return res.status(201).json({
      message: `Successfully imported ${insertedLeads.length} leads out of ${leadsList.length} submitted.`,
      count: insertedLeads.length
    });

  } catch (err) {
    console.error('CSV Import error:', err);
    return res.status(500).json({ error: 'Failed to import CSV' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`CRM Backend running on port ${PORT}`);
});
