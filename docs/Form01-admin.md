# FORM/01 Admin API Reference

API reference for the FORM/01 customer, payment, inventory, fulfilment, and admin workflows.

## Admin form layout

Create/edit product, inventory, shipment, refund, preview, and sign-in dialogs
share an opaque, bounded modal panel with internal vertical scrolling.
The dialog heading and form actions remain visible while scrolling, and
mobile variant inputs stack into two columns. Escape closes a dialog, Tab
stays inside it, and closing restores focus to the launching control.
Sizes, SKU, price, and stock are entered through the Add size rows; the
unused duplicate free-text variant field has been removed.

## API base URL

```text
http://localhost:8000/api/v1
```

Production clients should configure the API base URL through an environment variable. Do not hard-code production URLs in the UI.

## Greeting and inventory analysis

The overview greeting uses `/me/profile` (display name, then first name, then
email) rather than a placeholder person. The date and time-of-day greeting use
the browser's local timezone and refresh every minute.

Inventory supports product/SKU search, out-of-stock and low-stock filters,
7/30/90-day or all-loaded-order sales windows, and sorting by least/most stock,
most/least sold, and most reserved. Sales count quantities from paid,
non-cancelled orders matched to current variant SKUs. Refunded and
partially-refunded orders are excluded rather than estimating returned units.
Stock figures are current snapshots, not historical stock movements.

The current admin orders endpoint returns the latest 50 orders. The UI explicitly
labels this scope: these rankings are not lifetime analytics or revenue, and
deleted/renamed SKUs cannot be attributed to current inventory. Reload data
refreshes both stock and orders. A full historical analytics endpoint is needed
before interpreting these figures as store-wide trends.

## Category artwork

Homepage now has a visual Carousel slides editor with headline, eyebrow,
supporting text, desktop/mobile CDN images, alt text, CTA, position, enabled
state, and image shade. Add/remove/select slides without editing JSON.
Changes merge directly into the shared draft while preserving unedited fields
and publishing schedules. Save to all clients publishes the draft.
Desktop/mobile previews sit beside the fields on wide screens and stack on
smaller screens; previews are illustrative, not pixel-identical storefronts.
Category artwork uses the same styled inputs and live image preview, but retains
its explicit Apply category image to draft step. Advanced homepage JSON remains
available in a collapsed disclosure for schedules and other section types.

Homepage also supports `category_grid` for category CDN artwork. The editable
"Manage category CDN images" form accepts product type, desktop URL, optional
mobile URL and image description. Use Add category artwork to clear the form
for another product type, then Add category image to draft. Existing entries
have Edit buttons and an Update category image in draft action; their product
type is read-only to avoid accidentally adding a duplicate instead of editing.
New entries cannot overwrite an existing type. The entry count and selected
button show which artwork is being edited.
Select an entry, then Delete category artwork to show an inline confirmation.
Confirm delete artwork removes that type's artwork from the draft only; Cancel
deletion leaves it untouched. Publish with Save to all clients. Other entries,
sections and schedules are preserved, including an empty category section when
its last entry is deleted. Products and CDN assets are not deleted; category
visibility remains product-driven and its image reverts to the normal fallback.

Apply
category image to draft safely merges into the current JSON, preserving other
sections and schedules; Save to all clients publishes through the existing
authenticated workflow. Invalid JSON blocks the merge with an explicit error.
The read-only example remains under Advanced category JSON example.
Each `content.items` entry specifies `product_type` and an `image` object with
`desktop_url`, optional `mobile_url`, and `alt`, like hero artwork. Append this
object to the existing array; do not replace the hero or other sections.
Only types with ACTIVE storefront products appear, even if sold out.
Unconfigured types use a product image or a neutral placeholder. Saving validates
image URLs and the category configuration before replacing any existing content.

## Order queue statuses

Orders and Inventory share a softly tinted filter panel with a small heading,
consistent dropdown chevrons, larger controls, and sage focus rings. Filter
controls stack on narrow screens. Native selects and existing filtering,
reset/reload actions, labels, counts, and keyboard behaviour are preserved.

The Orders list displays Payment, Order status, and Fulfilment as separate
columns. Order status comes directly from the backend, matching the order detail
panel. `CONFIRMED` and `RECEIVED` show "Received - awaiting processing" to
distinguish the incoming queue from `PROCESSING`, `PACKED`, and `SHIPPED`, even
when several orders are still `UNFULFILLED`. This is a workflow indicator, not
an unread badge or a measure of how recently an order was placed.

Checkout starts at `PENDING`; successful payment verification sets `CONFIRMED`
and payment `PAID`. Admin moves the order to `PROCESSING` when work begins.
The list scrolls horizontally on narrow screens so every status stays accessible.

Order status, payment, and fulfilment dropdown filters combine with order/product
search. "Received / awaiting processing" groups `CONFIRMED` and `RECEIVED`;
individual statuses remain selectable. Clear filters resets all three dropdowns
and search. The matching count and empty state reflect the combined filters.
Filtering is local to the loaded orders (currently the latest 50 in live mode),
not a search of the full order history. Changing an order's status immediately
re-evaluates its membership in the selected filters.

## Price units and typography

API fields ending in `_minor` use paise for INR: `12900` means INR 129, not
INR 12,900. Dashboard revenue, order totals, line items, and product previews
share the same formatter, dividing by 100 only for display and preserving paise
up to two decimal places. Product price inputs accept rupees and are converted
to paise on save; Razorpay amounts remain in paise. The refund form explicitly
accepts minor units and sends them unchanged.

The admin uses Arial, Helvetica, sans-serif, matching the storefront, with bold
headings and inherited form-control typography. The homepage JSON editor keeps
its monospace font for code readability. Unused Geist font downloads are removed.
Run `npm test` for the focused price-formatting regression tests.

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

- Public endpoints require no token.
- Customer endpoints require an authenticated user token.
- Admin endpoints require a user with the `ADMIN` or `OWNER` role.
- Razorpay webhook requests authenticate with the `X-Razorpay-Signature` header, not a bearer token.

### Getting an admin bearer token

1. Create an account through `POST /auth/register`, or use an existing account.
2. Promote the account from the middleware project:

  ```bash
  cd /Users/ziasmacm2/Documents/Work-Space/form01-mw
  source .venv/bin/activate
  python scripts/promote_admin.py your-email@example.com ADMIN
  ```

3. Log in through `POST /auth/login`:

  ```json
  {
    "email": "admin@example.com",
    "password": "your-password"
  }
  ```

4. The response contains `access_token`. The admin UI stores it in browser storage as `form01_admin_token` and sends it on every protected request:

  ```http
  Authorization: Bearer <access_token>
  ```

Newly registered accounts receive the `CUSTOMER` role until they are promoted to `ADMIN` or `OWNER`.

## Endpoint Catalog

### Public Catalogue

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/products` | Public | List active products and variant availability |
| `GET` | `/products/{slug}` | Public | Get product detail by slug |
| `GET` | `/storefront/config` | Public | Get storefront name, environment, and currency |

Product variants expose:

```json
{
  "on_hand": 10,
  "reserved": 8,
  "available": 2
}
```

`available` is calculated as `on_hand - reserved`. It is informational until checkout performs the authoritative row-locked reservation.

### Authentication

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register a customer account |
| `POST` | `/auth/login` | Public | Log in and receive a bearer token |
| `GET` | `/auth/me` | Customer/Admin | Get the authenticated user and roles |

Register request:

```json
{
  "email": "customer@example.com",
  "password": "TestPass123!"
}
```

Login request:

```json
{
  "email": "customer@example.com",
  "password": "TestPass123!"
}
```

### Customer Profile and Addresses

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/me/profile` | Customer | Get the current profile |
| `PATCH` | `/me/profile` | Customer | Update the current profile |
| `GET` | `/me/addresses` | Customer | List saved addresses |
| `POST` | `/me/addresses` | Customer | Create a shipping or billing address |
| `DELETE` | `/me/addresses/{address_id}` | Customer | Delete a saved address |

### Customer Orders

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/me/orders` | Customer | List the customer’s orders |
| `GET` | `/me/orders/{order_number}` | Customer | Get order detail, payments, and shipments |
| `POST` | `/me/orders/{order_number}/cancel-request` | Customer | Request cancellation and release active stock reservations |

### Cart and Availability

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/cart` | Customer | Get active cart, totals, and `available_quantity` |
| `POST` | `/cart/items` | Customer | Add or update a cart item |

Cart item request:

```json
{
  "variant_id": "variant-uuid",
  "quantity": 2
}
```

If the requested quantity is greater than current availability, the API returns `409 Conflict`.

Cart item response includes:

```json
{
  "variant_id": "variant-uuid",
  "quantity": 2,
  "available_quantity": 8
}
```

Adding to a cart does not reserve stock. Stock is reserved during checkout.

### Checkout and Payments

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/checkout/quote` | Customer | Calculate current cart totals and availability |
| `POST` | `/checkout` | Customer | Reserve stock, create the order, and initialize payment |
| `POST` | `/payments/razorpay/verify` | Customer | Verify a successful Razorpay payment |

Checkout request:

```json
{
  "payment_provider": "razorpay",
  "idempotency_key": "client-generated-unique-key"
}
```

Checkout response includes:

```json
{
  "order_id": "order-uuid",
  "order_number": "FO-ABC123",
  "payment_status": "PENDING",
  "total_minor": 50000,
  "payment_id": "payment-uuid",
  "payment_provider": "razorpay",
  "provider_order_id": "order_RazorpayId",
  "provider_key_id": "rzp_test_key"
}
```

Payment verification request:

```json
{
  "razorpay_order_id": "order_RazorpayId",
  "razorpay_payment_id": "pay_RazorpayId",
  "razorpay_signature": "razorpay-generated-signature"
}
```

The server validates the Razorpay signature, provider order ID, charged amount, currency, and payment state before marking the payment captured.

### Admin Catalogue

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/products` | Admin | List products for administration |
| `POST` | `/admin/products` | Admin | Create a draft product |
| `POST` | `/admin/products/{product_id}/publish` | Admin | Publish a product |

Create product request:

```json
{
  "title": "FORM/01 T-Shirt",
  "slug": "form-01-t-shirt",
  "description": "Product description",
  "product_type": "apparel",
  "seo_title": "FORM/01 T-Shirt",
  "seo_description": "Product SEO description"
}

The admin create form also supports the first sellable variant and its initial inventory:

```json
{
  "title": "FORM/01 T-Shirt",
  "slug": "form-01-t-shirt",
  "description": "Product description",
  "image_url": "https://cdn.example.com/form-01-t-shirt.jpg",
  "product_type": "apparel",
  "sku": "FORM01-TEE-BLK-M",
  "price_minor": 50000,
  "currency": "INR",
  "initial_stock": 25
}
```

The admin UI accepts the human-readable rupee price and converts it to minor currency units before sending the request.
```

### Admin Orders and Fulfilment

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/orders` | Admin | List all orders |
| `GET` | `/admin/orders/{order_number}` | Admin | View order detail |
| `POST` | `/admin/orders/{order_number}/shipments` | Admin | Create a shipment |
| `POST` | `/admin/payments/{payment_id}/refund` | Admin | Refund a payment through the provider |

Shipment request:

```json
{
  "carrier": "DHL",
  "tracking_number": "TRACK123",
  "tracking_url": "https://carrier.example/track/TRACK123",
  "item_quantities": {
    "order-item-uuid": 1
  }
}
```

Refund request:

```json
{
  "amount_minor": 50000,
  "reason": "Customer request"
}
```

For Razorpay payments, the refund endpoint calls Razorpay first and stores the provider refund ID only after the provider accepts the refund.

### Admin Inventory

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/admin/inventory/adjust` | Admin | Add or remove stock for a variant |

Inventory adjustment request:

```json
{
  "variant_id": "variant-uuid",
  "quantity_delta": 50,
  "note": "Initial stock receipt"
}
```

Use a negative `quantity_delta` to remove stock. Stock cannot be reduced below the quantity currently reserved.

Inventory lifecycle:

```text
Admin adjustment
  -> on_hand changes

Checkout
  -> available stock is locked
  -> reserved increases

Payment success
  -> reserved decreases
  -> on_hand decreases
  -> SALE movement is recorded

Payment failure or cancellation
  -> reserved decreases
  -> RELEASE movement is recorded
```

### Webhooks

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/webhooks/{provider}` | Provider signature | Receive provider payment events |

Razorpay webhook URL:

```text
https://your-api.example.com/api/v1/webhooks/razorpay
```

Razorpay webhooks require:

```http
X-Razorpay-Signature: <razorpay-webhook-signature>
```

The webhook handler validates the signature, deduplicates events, validates payment order and totals, records the event, and updates payment/order state.

## Admin Workflow

```text
POST /auth/login
  -> receive bearer token

POST /admin/products
  -> create draft product

POST /admin/products/{product_id}/publish
  -> publish product

POST /admin/inventory/adjust
  -> initialize stock

GET /admin/orders
  -> review orders and payment status

POST /admin/orders/{order_number}/shipments
  -> create fulfilment record

POST /admin/payments/{payment_id}/refund
  -> process provider refund
```

## Response and Error Rules

- Successful responses may use the shared `data` envelope.
- Validation and business errors use the API error envelope.
- Stock conflicts return `409 Conflict`.
- Missing resources return `404 Not Found`.
- Invalid or missing bearer tokens return `401 Unauthorized`.
- Non-admin users accessing admin routes return `403 Forbidden`.
- Payment signature failures return `400 Bad Request` or `401 Unauthorized` depending on the flow.

## Current Limitations

- Reservation expiry for abandoned unpaid checkouts is not yet scheduled.
- Guest checkout and guest cart merge are not implemented.
- Product variant creation and editing endpoints are not yet implemented.
- Shipping rates, tax, coupons, and promotion rules are not yet implemented.
- Returns and exchanges are not yet implemented.
- Carrier tracking provider integration is not yet selected.
- Audit logging is modeled but not wired into every sensitive mutation.
- Refresh tokens and token revocation are not yet implemented.
