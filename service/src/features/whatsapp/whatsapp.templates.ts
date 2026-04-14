import type { WaTemplate } from '@prisma/client';

export type WaTemplateKey = WaTemplate;

interface RenderContext {
  locale?: 'ar' | 'en';
  clientName?: string;
  employeeName?: string;
  requestType?: string;
  plannedStart?: Date | string;
  plannedEnd?: Date | string;
  code?: string;
  address?: string;
  tools?: Array<{ name: string; qty: number }>;
  items?: Array<{ name: string; qty: number; unitPrice: number }>;
  greetingText?: string;
  broadcastText?: string;
  customText?: string;
  requestId?: string;
  companyName?: string;
}

function fmtTime(d?: Date | string): string {
  if (!d) return '';
  return new Date(d).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

const OPT_OUT_AR = '\n\nلإلغاء الاشتراك أرسل STOP';
const OPT_OUT_EN = '\n\nReply STOP to unsubscribe.';

export const renderTemplate = (template: WaTemplateKey, ctx: RenderContext = {}): string => {
  const ar = ctx.locale !== 'en';

  switch (template) {
    case 'OTP_VERIFY':
      return ar
        ? `كود التحقق: ${ctx.code}\nهذا الكود صالح لمدة 5 دقائق. لا تشاركه مع أحد.`
        : `Your verification code: ${ctx.code}\nValid for 5 minutes. Do not share.`;

    case 'EMP_OTP_VERIFY':
      return ar
        ? `كود تفعيل حسابك في ${ctx.companyName ?? 'Bloomo'}: ${ctx.code}\nصالح 5 دقائق.`
        : `Your employee verification code for ${ctx.companyName ?? 'Bloomo'}: ${ctx.code}\nValid 5 minutes.`;

    case 'ORDER_RECEIVED':
      return ar
        ? `مرحباً ${ctx.clientName ?? ''}،\nتم استلام طلبك وجاري المراجعة. سنوافيك بالتحديثات قريباً.`
        : `Hi ${ctx.clientName ?? ''},\nYour request has been received and is under review.`;

    case 'TECH_ASSIGNED':
      return ar
        ? `تم تعيين الفني ${ctx.employeeName ?? ''} لطلبك. سيتم إرسال وقت الوصول قريباً.`
        : `Technician ${ctx.employeeName ?? ''} has been assigned to your request.`;

    case 'ETA':
      return ar
        ? `الفني سيصل في الفترة من ${fmtTime(ctx.plannedStart)} إلى ${fmtTime(ctx.plannedEnd)}.`
        : `Technician ETA: ${fmtTime(ctx.plannedStart)} – ${fmtTime(ctx.plannedEnd)}.`;

    case 'COMPLETED':
      return ar
        ? `تم إنجاز طلبك بنجاح. نسعد بتقييمك للخدمة — شكراً لثقتك بنا.`
        : `Your request has been completed. Please rate our service — thanks for choosing us!`;

    case 'GREETING':
      return (ctx.greetingText ?? (ar ? 'كل سنة وأنتم بخير 🎉' : 'Seasons greetings! 🎉')) + (ar ? OPT_OUT_AR : OPT_OUT_EN);

    case 'BROADCAST':
      return (ctx.broadcastText ?? '') + (ar ? OPT_OUT_AR : OPT_OUT_EN);

    case 'CUSTOM':
      return ctx.customText ?? '';

    case 'EMP_TASK_ASSIGNED': {
      const start = ctx.plannedStart ? new Date(ctx.plannedStart).toLocaleString('ar-EG') : '-';
      return ar
        ? `مهمة جديدة من ${ctx.companyName ?? ''}:\nالعميل: ${ctx.clientName ?? ''}\nالعنوان: ${ctx.address ?? '-'}\nموعد البدء: ${start}`
        : `New task from ${ctx.companyName ?? ''}:\nClient: ${ctx.clientName ?? ''}\nAddress: ${ctx.address ?? '-'}\nStart: ${start}`;
    }

    case 'EMP_TOOL_CUSTODY': {
      const lines = (ctx.tools ?? [])
        .map((t) => (ar ? `- ${t.name} × ${t.qty}` : `- ${t.name} × ${t.qty}`))
        .join('\n');
      return ar ? `تم تعيين عهدة أدوات لك:\n${lines}` : `Tool custody assigned:\n${lines}`;
    }

    case 'EMP_INVENTORY_CUSTODY': {
      const items = ctx.items ?? [];
      const lines = items.map((i) => `- ${i.name} × ${i.qty} = ${(i.qty * i.unitPrice).toFixed(2)}`).join('\n');
      const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0).toFixed(2);
      return ar
        ? `تم تعيين عهدة قطع غيار لك:\n${lines}\nإجمالي التحصيل المطلوب: ${total}`
        : `Inventory custody assigned:\n${lines}\nTotal to collect: ${total}`;
    }

    default:
      return '';
  }
};

export const MARKETING_TEMPLATES: readonly WaTemplateKey[] = [
  'GREETING',
  'BROADCAST',
] as const;

export function isMarketing(template: WaTemplateKey): boolean {
  return (MARKETING_TEMPLATES as readonly WaTemplateKey[]).includes(template);
}
