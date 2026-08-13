// /api/feedback — 站内反馈表单后端（on-demand Pages Function，static 模式下用 prerender = false 走 Worker）
// 收到表单 POST 后，调用 Cloudflare Email Sending REST API 把反馈邮件发到站主邮箱
// （mengzai668899@gmail.com，发件人 feedback@palbreed.space）。
//
// 前置条件（见项目 memory）：
//   - Cloudflare Email Sending 已 onboard 域名 palbreed.space（用户 Dashboard 操作）
//   - 生产环境用 `wrangler pages secret put` 注入两个 secret：
//       CF_API_TOKEN（具备 Email Sending: Edit 权限的新 token）
//       ACCOUNT_ID
//   - 本地开发：npm run dev 时在 shell export 同名环境变量即可（import.meta.env fallback）
//
// 安全：honeypot 字段（company）非空 → 静默丢弃返回 200（不给机器人任何信号）；
// 无邮箱收集（contact 可选）；消息上限 2000 字符。
import type { APIRoute } from 'astro';

export const prerender = false;

const ALLOWED_TYPES = new Set(['idea', 'bug', 'praise', 'other']);
const MAX_MESSAGE = 2000;
const MAX_CONTACT = 160;
const DESTINATION = 'mengzai668899@gmail.com';
const SENDER = 'feedback@palbreed.space';

const TYPE_LABELS: Record<string, string> = {
  idea: 'Idea',
  bug: 'Bug',
  praise: 'Praise',
  other: 'Other',
};

function getSecrets(locals: unknown) {
  const runtime = (locals as { runtime?: { env?: Record<string, string | undefined> } }).runtime;
  const runtimeEnv = runtime?.env ?? {};
  return {
    token: runtimeEnv.CF_API_TOKEN || import.meta.env.CF_API_TOKEN || '',
    accountId: runtimeEnv.ACCOUNT_ID || import.meta.env.ACCOUNT_ID || '',
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // honeypot：机器人填了 company → 静默丢弃，返回 200 假装成功
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const type = typeof body.type === 'string' ? body.type : 'idea';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
  const page = typeof body.page === 'string' ? body.page.slice(0, 500) : '';

  if (!message) {
    return new Response(JSON.stringify({ error: 'Add a short message before sending.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (message.length > MAX_MESSAGE) {
    return new Response(JSON.stringify({ error: 'Message is too long (max 2000 characters).' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!ALLOWED_TYPES.has(type)) {
    return new Response(JSON.stringify({ error: 'Unknown feedback type.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (contact.length > MAX_CONTACT || (contact !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact))) {
    return new Response(JSON.stringify({ error: 'Enter a valid email address or leave it blank.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { token, accountId } = getSecrets(locals);
  if (!token || !accountId) {
    return new Response(
      JSON.stringify({ error: 'Feedback service is being set up. Please try again later.' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const typeLabel = TYPE_LABELS[type] ?? type;
  const subject = `[PalBreed Feedback] ${typeLabel}${page ? ' from ' + page.replace(/^https?:\/\//, '').slice(0, 80) : ''}`;

  const text = [
    `Type: ${typeLabel}`,
    page ? `Page: ${page}` : null,
    contact ? `Reply-to contact: ${contact}` : null,
    '',
    message,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1a1a2e;">',
    `<p><strong>Type:</strong> ${escapeHtml(typeLabel)}</p>`,
    page ? `<p><strong>Page:</strong> <a href="${escapeHtml(page)}">${escapeHtml(page)}</a></p>` : '',
    contact ? `<p><strong>Contact:</strong> <a href="mailto:${escapeHtml(contact)}">${escapeHtml(contact)}</a></p>` : '',
    `<hr style="border:none;border-top:1px solid #eee;margin:12px 0;">`,
    `<p style="white-space:pre-wrap;">${escapeHtml(message)}</p>`,
    '</div>',
  ].join('');

  try {
    const response = await fetch(`https://api.cloudflare.com/api/v4/accounts/${encodeURIComponent(accountId)}/email/sending/send`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: DESTINATION,
        from: SENDER,
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean; errors?: Array<{ code?: number; message?: string }>; result?: { delivered?: number; permanent_bounces?: number; queued?: number } }
      | null;

    if (!response.ok) {
      const code = payload?.errors?.[0]?.code;
      // 10001 = 无法认证（token 无 Email Sending 权限）或域名未 onboard
      if (code === 10001) {
        return new Response(
          JSON.stringify({ error: 'Feedback service is being set up. Please try again later.' }),
          { status: 503, headers: { 'content-type': 'application/json' } },
        );
      }
      console.error('email-sending-error', response.status, JSON.stringify(payload));
      return new Response(JSON.stringify({ error: 'Feedback could not be sent. Please try again.' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.error('email-sending-fetch-error', String(error));
    return new Response(JSON.stringify({ error: 'Feedback could not be sent. Please try again.' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
};
