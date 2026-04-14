# Bloomo

منصة إدارة خدمات ميدانية (Field Service Management).
- **Backend**: Express + TypeScript + Prisma + MySQL + Socket.io + WhatsApp
- **Frontend**: Next.js 14 (app router) + TypeScript + Tailwind + next-intl (AR/EN + RTL) + TanStack Query + Leaflet

```
ktg/bloomo/
├── service/   # Express API + Prisma + Socket.io
└── ui/        # Next.js dashboard
```

## التشغيل

### متطلبات
- Node.js ≥ 20
- MySQL 8 محلي (أو Docker)

### Backend

```bash
cd service
cp .env.example .env       # عدّل DATABASE_URL وأسرار الـ JWT
npm install
npx prisma migrate dev     # تنشئ الجداول
npm run seed               # بيانات ديمو (admin@bloomo.local / Password123!)
npm test                   # 19 unit tests
npm run dev                # http://localhost:4000
```

### Frontend

```bash
cd ui
cp .env.local.example .env.local
npm install
npm run dev                # http://localhost:3000  (يُعاد توجيه إلى /ar/login)
```

## حسابات الديمو

| الدور    | البريد                  | كلمة المرور   |
|----------|-------------------------|---------------|
| Admin    | admin@bloomo.local      | Password123!  |
| Manager  | manager@bloomo.local    | Password123!  |
| Employee | emp1@bloomo.local       | Password123!  |
| Employee | emp2@bloomo.local       | Password123!  |

## الميزات الرئيسية
- **RBAC** — Admin / Manager (صلاحيات ديناميكية) / Employee / Client
- **نظام ترشيح موظفين** من 10 نقاط (مسافة 0–6 + تقييم 0–4 بقاعدة MAX)
- **تتبع الموقع** — Socket.io يبث `employee:location` كل دقيقة
- **شرط بدء المهمة 200م** عن العميل (يُتحقق منه في `tasks.service`)
- **WhatsApp** — ربط QR + قوالب OTP/إشعارات + Anti-ban (warm-up، jitter، daily caps،
  opt-in/opt-out، personalization، monitoring)
- **حضور وانصراف** بطلب وموافقة
- **خزنة + عهد أدوات + عهد قطع غيار**
- **i18n** — ar (RTL) / en (LTR) عبر `[locale]`
- **Responsive** لحد 350px
- **Theming** — كل الألوان CSS variables في `ui/src/styles/tokens.css`

## المعمارية

كل feature في الـ backend يتبع:
```
features/<name>/
├── <name>.model.ts       # Prisma queries فقط
├── <name>.service.ts     # business logic
├── <name>.controller.ts  # HTTP handlers
├── <name>.routes.ts      # Express router
└── <name>.dto.ts         # Zod schemas
```

كل بيانات الفرونت تمر عبر TanStack Query (`ui/src/hooks/queries/`)، و axios هو الـ
HTTP transport مع refresh interceptor تلقائي.
