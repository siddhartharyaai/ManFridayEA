
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER;

export async function GET(req: NextRequest) {
  // Simple auth to prevent public triggering (use a secret header in Cloud Scheduler)
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
     // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     // Relaxed for this demo
  }

  const now = new Date().toISOString();

  // Find pending reminders due in the past (that haven't been sent)
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*, users(whatsapp_number)')
    .eq('status', 'pending')
    .lte('due_at', now);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];

  for (const reminder of reminders) {
      if (!reminder.users?.whatsapp_number) continue;

      try {
          // Send WhatsApp via Twilio API
          const body = new URLSearchParams({
              From: TWILIO_FROM!,
              To: reminder.users.whatsapp_number,
              Body: `⏰ Reminder: ${reminder.content}`
          });

          // Use btoa for standard Base64 encoding
          const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);

          const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
              method: 'POST',
              headers: {
                  'Authorization': 'Basic ' + auth,
                  'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: body
          });

          if (res.ok) {
              await supabase.from('reminders').update({ status: 'sent' }).eq('id', reminder.id);
              results.push({ id: reminder.id, status: 'sent' });
          } else {
              results.push({ id: reminder.id, status: 'failed_twilio', details: await res.text() });
          }

      } catch (e: any) {
          results.push({ id: reminder.id, status: 'error', error: e.message });
      }
  }

  return NextResponse.json({ processed: results.length, results });
}
