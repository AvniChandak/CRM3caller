import { supabase } from './supabase.js';

const SEED_USERS = [
  {
    email: 'admin@crm.com',
    password: 'AdminPassword123!',
    name: 'System Admin',
    role: 'admin'
  },
  {
    email: 'caller1@crm.com',
    password: 'CallerPassword123!',
    name: 'Caller One',
    role: 'caller'
  },
  {
    email: 'caller2@crm.com',
    password: 'CallerPassword123!',
    name: 'Caller Two',
    role: 'caller'
  },
  {
    email: 'caller3@crm.com',
    password: 'CallerPassword123!',
    name: 'Caller Three',
    role: 'caller'
  }
];

async function seed() {
  console.log('Starting seed process...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required to seed database.');
    process.exit(1);
  }

  for (const user of SEED_USERS) {
    console.log(`Checking if user exists: ${user.email}...`);

    try {
      // 1. Check if user already exists in public.users
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking user ${user.email}:`, checkError);
        continue;
      }

      if (existingUser) {
        console.log(`User already exists in database: ${user.email} (ID: ${existingUser.id})`);
        continue;
      }

      // 2. User doesn't exist, create user in Supabase Auth via Admin API
      console.log(`Creating auth user: ${user.email}...`);
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name }
      });

      if (authError) {
        // If user already exists in Supabase Auth but not in our public.users (sync issue)
        if (authError.message.includes('already registered') || authError.status === 422) {
          console.log(`User registered in Auth but missing from public.users. Attempting to resolve by querying Auth users...`);
          // Fetch user list from auth to find the ID
          const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
          if (listError) throw listError;

          const matchedUser = authUsers.users.find(u => u.email === user.email);
          if (matchedUser) {
            console.log(`Found auth user ID: ${matchedUser.id}. Syncing to public.users...`);
            const { error: syncError } = await supabase
              .from('users')
              .insert([{
                id: matchedUser.id,
                name: user.name,
                email: user.email,
                role: user.role,
                active: true
              }]);
            if (syncError) throw syncError;
            console.log(`Synced: ${user.email}`);
            continue;
          }
        }
        console.error(`Error creating auth user ${user.email}:`, authError.message);
        continue;
      }

      // 3. Insert user details into public.users table
      console.log(`User created. Syncing profile to public.users...`);
      const { error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authUser.user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: true
        }]);

      if (profileError) {
        console.error(`Error inserting profile for ${user.email}:`, profileError);
        // Rollback Auth creation
        await supabase.auth.admin.deleteUser(authUser.user.id);
        console.log(`Rolled back auth creation for: ${user.email}`);
        continue;
      }

      console.log(`SUCCESS: Created and seeded ${user.role} - ${user.name} (${user.email})`);

    } catch (err) {
      console.error(`Failed to process user ${user.email}:`, err);
    }
  }

  // 4. Seed some sample leads for demonstration
  console.log('Seeding sample leads...');
  const { data: callers, error: callersError } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'caller');

  if (callersError) {
    console.error('Error fetching callers for lead seeding:', callersError);
    process.exit(1);
  }

  const sampleLeads = [
    { name: 'John Doe', phone: '+15550199', email: 'john@example.com', course: 'Business Coaching Elite', source: 'Facebook Ad', status: 'New', notes: 'Interested in accelerating business growth.' },
    { name: 'Jane Smith', phone: '+15550188', email: 'jane@example.com', course: 'Executive Leadership Masterclass', source: 'Google Search', status: 'Contacted', notes: 'Spoke briefly, scheduled full call next week.' },
    { name: 'Michael Johnson', phone: '+15550177', email: 'michael@example.com', course: 'Startup Accelerator Program', source: 'LinkedIn Outreach', status: 'Interested', notes: 'Wants to launch in 3 months.' },
    { name: 'Sarah Williams', phone: '+15550166', email: 'sarah@example.com', course: 'Sales Team Coaching', source: 'Referral', status: 'Converted', revenue: 2500.00, notes: 'Signed contract. Enrolled in 6-month sales training.' },
    { name: 'David Brown', phone: '+15550155', email: 'david@example.com', course: 'Startup Accelerator Program', source: 'Public Website', status: 'Follow-up', notes: 'Needs follow up. Call on Thursday morning.' },
    { name: 'Emily Davis', phone: '+15550144', email: 'emily@example.com', course: 'Business Coaching Elite', source: 'YouTube Video', status: 'Not Interested', notes: 'No budget at this time.' }
  ];

  for (let i = 0; i < sampleLeads.length; i++) {
    const lead = sampleLeads[i];
    try {
      // Check if lead already exists
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('email', lead.email)
        .maybeSingle();

      if (existingLead) {
        console.log(`Lead already exists: ${lead.email}`);
        continue;
      }

      // Distribute round robin
      let assignedTo = null;
      if (callers && callers.length > 0) {
        assignedTo = callers[i % callers.length].id;
      }

      const { data: dbLead, error: leadInsError } = await supabase
        .from('leads')
        .insert([{
          ...lead,
          assigned_to: assignedTo,
          follow_up_date: lead.status === 'Follow-up' ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) : null
        }])
        .select()
        .single();

      if (leadInsError) throw leadInsError;

      // Log activity
      await supabase
        .from('activities')
        .insert([{
          lead_id: dbLead.id,
          user_id: assignedTo || dbLead.id,
          action: `Sample lead seeded and assigned to caller`
        }]);

      console.log(`SUCCESS: Seeded sample lead: ${lead.name} -> Assigned to Caller ID: ${assignedTo}`);
    } catch (err) {
      console.error(`Failed to seed lead ${lead.email}:`, err);
    }
  }

  console.log('Seed process completed successfully.');
  process.exit(0);
}

seed();
