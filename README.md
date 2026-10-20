This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## GST & Invoices (draft only)

Connect the Live API and open **GST & Invoices** to save versioned seller
details, product-type/HSN rules, effective dates, per-unit slabs and rates.
The simulation uses editor values, including unsaved changes; it never changes
checkout totals. No tax collection toggle is available while registration,
rates and legal invoice numbering remain unconfirmed. The linked article is
an unverified reference, not pre-approved law.

Paid orders created after middleware migration `c0d3456e7f88` have a **Download
draft PDF** action in the order drawer. PDFs preserve the seller and price
snapshots from checkout, display **Not a tax invoice**, and are fetched with
admin authorization. Older orders have no historical snapshot. No emails or
legal invoice numbers are generated. Apply the migration and install the
middleware PDF dependency before deploying this UI.

## Live Orders queue

In Live API mode, **Orders** uses the paginated middleware queue rather than the
dashboard's latest-50 preview. It defaults to **Today**, with Last 7 days,
Last 30 days, All time and an inclusive custom date range. Dates/times use
Asia/Kolkata; 7/30 days include today. Orders without a placed timestamp use
creation time. Search (reference/product), order status, payment and fulfilment
filters are applied to the full database when **Apply filters** is pressed.
The filter panel groups search/time separately from processing statuses, reveals
custom dates in a dedicated inset, and keeps Reset/Apply in its footer. A status
hint distinguishes unapplied edits from the currently displayed results.

Pages contain 20 orders, newest placed first, with no latest-50 history cap.
Paging reuses a creation-time cutoff so ordinary new arrivals do not shift the
displayed pages. Status changes can alter filtered membership; this is not a
transactional archive. The queue checks its current page and new matching
arrivals every 15 seconds while visible and online, without overlapping requests.
**Load latest orders** starts a fresh snapshot at page one without closing the
open order drawer. Relative ranges stay anchored until refresh; a new IST day
prompts a refresh. Polling failures/offline status are visible, not empty results.

Opening an order loads current full details into the existing drawer. Successful
status/shipment/refund actions reload the queue. Polling is not instant push and
only runs while Orders is mounted. Overview and Inventory still use the existing
recent-order dataset; their figures are not all-history totals. Demo mode keeps
its sample list and does not call the live queue. Deploy matching middleware first.

## Customers

Connect the Live API and choose **Customers** in Workspace (or mobile navigation).
This is a read-only directory of registered, non-staff accounts, including accounts
without a profile or orders. It does not create demo customer records. ADMIN and
OWNER accounts are excluded, even if they also have a customer role.

Search by name, email or profile phone, then use **View** for account details,
verification/sign-in dates, total order count and currently-paid order count.
Both the directory and each customer's complete order history are server-paginated
in pages of 20; history is not restricted to the dashboard's latest 50 orders.
Guest orders are not matched by email. History includes pending/refunded orders
and opens the existing order drawer with its usual operational actions. Order
totals retain their currency and do not claim lifetime spend.

**Reload** refreshes the current search/profile; **Reload profile** refreshes the
selected account and resets its history page. Errors remain visible rather than
falling back to sample people. No customer editing, account deletion, password
access or role-management actions are added. Deploy the matching middleware
customer endpoints before this UI; no new database migration is needed.

## Getting Started

### Admin workspace layout

Overview, Orders, Catalogue, Inventory, Coupons and Homepage share the
GST workspace's sage headers, rounded cards, controls and status notices.
On desktop, the sidebar and topbar stay in place while the right-hand page
content scrolls independently. Switching sections resets that content to the
top. Short viewports allow the sidebar itself to scroll so no navigation items
are lost. On mobile, the topbar menu opens keyboard-accessible navigation;
dialogs and order drawers retain their own scrolling.

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
