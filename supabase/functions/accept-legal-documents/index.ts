import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
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

  const body = await req.json().catch(() => ({}));
  const userAgent = typeof body?.user_agent === 'string' ? body.user_agent.slice(0, 2000) : null;
  const { data: documents, error: docsError } = await admin.from('legal_documents').select('document_type, title, version').eq('required', true).order('document_type');
  if (docsError) return json({ error: docsError.message }, 500);

  const acceptedAt = new Date().toISOString();
  const rows = (documents || []).map((document) => ({
    user_id: user.id,
    document_type: document.document_type,
    document_version: document.version,
    acceptance_method: 'web',
    signature_statement: 'I confirm that I have read, understood and agree to the current Fundza legal documents.',
    user_agent: userAgent,
    accepted_at: acceptedAt,
  }));

  if (rows.length) {
    const { error: insertError } = await admin.from('legal_acceptances').upsert(rows, { onConflict: 'user_id,document_type,document_version', ignoreDuplicates: true });
    if (insertError) return json({ error: insertError.message }, 500);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
  if (!resendApiKey || !fromEmail) return json({ accepted: true, email_sent: false, email_error: 'RESEND_API_KEY or RESEND_FROM_EMAIL is not configured' });

  const documentRows = (documents || []).map((document) => `<li><strong>${document.title}</strong> — version ${document.version}</li>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:auto"><h1 style="color:#1746a2">Fundza</h1><h2>Legal acceptance recorded</h2><p>We recorded your electronic acceptance of the current Fundza legal documents for <strong>${user.email}</strong>.</p><ul>${documentRows}</ul><p>Accepted at: ${acceptedAt} UTC</p><p>If a required document changes, Fundza will ask you to review and accept the new version before continuing to use the main app.</p><p style="color:#64748b;font-size:13px">This email is a confirmation receipt. Keep it for your records.</p></div>`;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` }, body: JSON.stringify({ from: fromEmail, to: [user.email], subject: 'Fundza legal acceptance confirmation', html }) });
  const result = await response.json();
  if (!response.ok) return json({ accepted: true, email_sent: false, email_error: result?.message || 'Email provider rejected the message' });

  const messageId = result?.id || null;
  await admin.from('legal_acceptances').update({ confirmation_email_sent_at: acceptedAt, confirmation_email_message_id: messageId }).eq('user_id', user.id).eq('accepted_at', acceptedAt);
  return json({ accepted: true, email_sent: true, message_id: messageId });
});
