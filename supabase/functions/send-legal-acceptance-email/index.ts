import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);

  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}');
  const serviceKey = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publishableKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!serviceKey || !publishableKey || !supabaseUrl) return json({ error: 'Supabase function configuration is incomplete' }, 500);

  const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user?.email) return json({ error: 'Unable to verify the signed-in user' }, 401);

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
  if (!resendApiKey || !fromEmail) return json({ sent: false, error: 'RESEND_API_KEY or RESEND_FROM_EMAIL is not configured' }, 503);

  const { data: documents, error: docsError } = await admin
    .from('legal_documents')
    .select('document_type, title, version')
    .eq('required', true)
    .order('document_type');
  if (docsError) return json({ sent: false, error: docsError.message }, 500);

  const acceptedAt = new Date().toISOString();
  const documentRows = (documents || []).map((document) => `<li><strong>${document.title}</strong> — version ${document.version}</li>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:auto"><h1 style="color:#1746a2">Fundza</h1><h2>Legal acceptance recorded</h2><p>We recorded your electronic acceptance of the current Fundza legal documents for <strong>${user.email}</strong>.</p><ul>${documentRows}</ul><p>Accepted at: ${acceptedAt} UTC</p><p>Your Fundza account remains subject to the current versions of these documents. If a required document changes, Fundza will ask you to review and accept the new version before continuing to use the main app.</p><p style="color:#64748b;font-size:13px">This email is a confirmation receipt. Keep it for your records.</p></div>`;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
    body: JSON.stringify({ from: fromEmail, to: [user.email], subject: 'Fundza legal acceptance confirmation', html }),
  });

  const resendData = await resendResponse.json();
  if (!resendResponse.ok) return json({ sent: false, error: resendData?.message || 'Email provider rejected the message' }, 502);

  const messageId = resendData?.id || null;
  await admin.from('legal_acceptances').update({ confirmation_email_sent_at: acceptedAt, confirmation_email_message_id: messageId }).eq('user_id', user.id).in('document_type', (documents || []).map((document) => document.document_type));

  return json({ sent: true, message_id: messageId });
});
