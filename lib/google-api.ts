
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Define types for API responses
interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  refresh_token?: string;
}

/**
 * Refreshes the Google OAuth token if expired
 */
export async function getValidAccessToken(userId: number, supabase: any): Promise<string | null> {
  const { data: tokenRecord } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!tokenRecord) return null;

  const now = Date.now();
  // Buffer of 5 minutes
  if (tokenRecord.expiry_date && now < tokenRecord.expiry_date - 300000) {
    return tokenRecord.access_token;
  }

  console.log(`Token expired for user ${userId}, refreshing...`);

  // Refresh Token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: tokenRecord.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('Failed to refresh token', await response.text());
    return null;
  }

  const tokens: GoogleTokenResponse = await response.json();
  const newExpiry = Date.now() + tokens.expires_in * 1000;

  await supabase
    .from('oauth_tokens')
    .update({
      access_token: tokens.access_token,
      expiry_date: newExpiry,
    })
    .eq('id', tokenRecord.id);

  return tokens.access_token;
}

/**
 * Google API Client
 */
export const googleApi = {
  // GMAIL
  gmail: {
    listMessages: async (accessToken: string, query: string = 'is:unread') => {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!data.messages) return [];
      
      // Fetch details for each message
      const detailed = await Promise.all(data.messages.map(async (msg: any) => {
        const d = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return d.json();
      }));
      return detailed.map((m: any) => ({
        id: m.id,
        snippet: m.snippet,
        subject: m.payload.headers.find((h: any) => h.name === 'Subject')?.value,
        from: m.payload.headers.find((h: any) => h.name === 'From')?.value
      }));
    },
    sendEmail: async (accessToken: string, to: string, subject: string, body: string) => {
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        body
      ].join('\n');
      
      // Use btoa and TextEncoder for safe UTF-8 Base64 encoding without relying on Buffer
      const utf8Bytes = new TextEncoder().encode(email);
      const binaryStr = Array.from(utf8Bytes, (b) => String.fromCharCode(b)).join("");
      const encoded = btoa(binaryStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded })
      });
      return res.json();
    }
  },

  // CALENDAR
  calendar: {
    listEvents: async (accessToken: string, timeMin: string = new Date().toISOString()) => {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=10&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return res.json();
    },
    createEvent: async (accessToken: string, event: any) => {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      return res.json();
    }
  },

  // TASKS
  tasks: {
    listTaskLists: async (accessToken: string) => {
      const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
         headers: { Authorization: `Bearer ${accessToken}` }
      });
      return res.json();
    },
    addTask: async (accessToken: string, taskListId: string, title: string, due?: string) => {
       const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due })
      });
      return res.json();
    }
  }
};
