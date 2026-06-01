# Assembly Line Tracking System

SPA web app built with React + Vite + Tailwind CSS for tracking delayed cars and missing parts in an automotive assembly line.

## Features

- Dark industrial dashboard
- Local state management using React Context API
- Add delayed car form with validation
- Unique chassis number validation
- Criticality levels
- DR Item flag
- Tracking grid with filters
- Change status workflow
- Edit data and add notes
- Responsive design for production screens and tablets

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Supabase Integration

تم ربط التطبيق بـ Supabase للقراءة والكتابة في جدول `delayed_cars` بشكل مباشر.

### ماذا تحتاج

- أنشئ ملف `.env.local`
- انسخ قيم المشروع التالية من Supabase:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

تجد مثالًا في `.env.example`.

### الطريقة

- `src/lib/supabase.ts` ينشئ عميل Supabase
- `src/Context/DelayedCarsContext.tsx` يجلب البيانات من `delayed_cars`
- الإضافات والتحديثات والملاحظات تُرسل إلى Supabase عند توفر المتغيرات

### جدول Supabase المقترح

أنشئ جدولًا باسم `delayed_cars` مع الحقول التالية:

- `id` (text, primary key)
- `chassisNumber` (text)
- `model` (text)
- `stationNumber` (text)
- `missingPart` (text)
- `criticality` (text)
- `isDrItem` (boolean)
- `assignedEngineer` (text)
- `notes` (text)
- `status` (text)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `resolvedAt` (timestamp, nullable)

Example Firebase idea:

```ts
await addDoc(collection(db, 'delayed_cars'), newCar)
await updateDoc(doc(db, 'delayed_cars', id), { status })
```
