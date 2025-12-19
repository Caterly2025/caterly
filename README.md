# Caterly

Caterly is a lightweight, role-based catering and order-management platform built for small and medium restaurants.  
It enables customers to place catering orders, restaurant owners/employees to review and modify orders, and both sides to communicate clearly through notifications.

The goal is to ship a **simple MVP suitable for real restaurant pilot onboarding**, then iterate toward a full-featured catering platform.

---

## 🔧 Tech Stack

### Frontend
- **Next.js (App Router, TypeScript)**
- Deployed on **Vercel**
- Responsive UI with light / dark / system themes
- Map-based restaurant discovery using **Leaflet**

### Backend
- **Supabase**
  - PostgreSQL database
  - Supabase Auth (email/password, extensible to Google/phone)
  - Row-Level Security (RLS)
  - Realtime subscriptions (notifications)
  - Edge Functions (planned for email/SMS)

---

## 👥 User Roles

### Customer
- Browse restaurants (list or map view)
- View menus and menu items
- Create and submit catering orders
- Track order status
- Receive notifications when orders change
- Accept or reject owner-proposed changes

### Owner / Employee
- View incoming orders for assigned restaurant(s)
- Review and edit customer orders
- Send modified orders back for customer approval
- Generate invoices
- Receive notifications on new orders and customer actions

### Admin (lightweight)
- System-level visibility (not required for day-to-day operations)
- No approval required for owner signup

---

## 🔁 Order Lifecycle (Current)

1. Customer creates an order (`status = pending`)
2. Owner reviews order (`status = owner_review`)
3. Owner may modify and send back (`status = changes_requested`)
4. Customer accepts changes (`status = customer_accepted`)
5. Owner completes order and generates invoice
6. Order moves to `completed` or `cancelled`

Statuses are enforced consistently in both UI and database.

---

## 🔔 Notifications

- Stored in `user_notifications` table
- Support:
  - `title`
  - `message`
  - `event`
  - `role` (customer / owner)
  - `is_read`
- Realtime updates via Supabase subscriptions
- Displayed in:
  - Customer “My Orders” page
  - Owner dashboard

---

## 🗺️ Restaurant Discovery

- Restaurants store:
  - Name
  - Cuisine type
  - Address (street, city, state, zip)
  - Primary phone
  - Latitude / Longitude
- Customer home supports:
  - List view
  - Map view (Leaflet)
- Selecting a restaurant loads menus dynamically

---

## 🎨 UI / UX

- Green-themed modern UI inspired by CraveCart
- Responsive cards and buttons
- Clear visual affordances for clickable actions
- Animated transitions between light and dark themes
- Role-aware navigation (Customer / Owner / Admin)

---

## 🚧 Current Status

### ✅ Completed
- Authentication (email/password)
- Role separation (customer vs owner)
- Customer ordering flow
- Owner review/edit flow
- Notifications with realtime updates
- Invoices (basic)
- Restaurant map discovery
- Dark / light / system theming
- Deployed MVP on Vercel

### ⚠️ Known limitations
- Cart flow is basic (no persistent cart yet)
- Email/SMS notifications not yet enabled
- Order numbers are UUID-based (human-readable IDs planned)
- Map uses stored lat/lng (no live geocoding yet)

---

## 🎯 Next MVP Steps (High Priority)

1. **Cart & Order Editing**
   - Add/remove items before submission
   - Persist draft orders

2. **Email Notifications**
   - Order created
   - Owner requested changes
   - Customer accepted changes
   - Invoice generated

3. **Human-Readable Order Numbers**
   - Format: `RESTID_YYYYMMDD_SEQ`
   - Daily sequence starting at 100

4. **Employee Management**
   - Owner can add/remove employees
   - Employees handle orders (owner not required)

5. **Improved Status Timeline**
   - Visual timeline per order
   - Clear state transitions

---

## 🔮 Future Enhancements

- SMS notifications (Twilio)
- Google OAuth & phone auth
- Customer address book
- Delivery scheduling
- Tip & service fee handling
- Payment integration (Stripe)
- Restaurant analytics dashboard
- Multi-location restaurants
- Public restaurant profile pages

---

## 🧪 Local Development

```bash
npm install
npm run dev

```

# ignore below

<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# caterly
## caterly app

## Context diagram
![Context diagram](/diagrams/c1_context.jpg)

## Container diagram
![Container diagram](/diagrams/c2_container.jpg)

## Component diagram
![Component diagram](/diagrams/C3_Component.png)

## code diagram
![Code diagram](/diagrams/c4_code.png)
>>>>>>> 058852dac17d6a48fe179f9a7e28f720f9bb27d6



## Git commands
```
* powershell
* cd C:\mylocal\Myapps\caterly-web
* git add .
* git commit -m "notifications on invoice and other."
* git push
```


```
C:\mylocal\Myapps\caterly-web> 
git branch -M main
 git remote add origin https://github.com/Caterly2025/caterly.git
 git remote add origin https://github.com/Caterly2025/caterly.git

```


```
supabase functions secrets set SUPABASE_URL="https://ehjgtcekptmpkgqxodeb.supabase.co"  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamd0Y2VrcHRtcGtncXhvZGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjA2NzUsImV4cCI6MjA4MDA5NjY3NX0.WWoDlDuhhID_shwOyLI6iQG4clwT8HJmyqovkzTOTUg" RESEND_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoamd0Y2VrcHRtcGtncXhvZGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MjA2NzUsImV4cCI6MjA4MDA5NjY3NX0.WWoDlDuhhID_shwOyLI6iQG4clwT8HJmyqovkzTOTUg" -project-ref caterlydev  -func send-order-email

```