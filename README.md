# Inventory backend

## User data isolation migration

Back up `inventory_db`, ensure it contains at least one `admin` user, and stop
the backend before applying
[`database/migrations/20261021_user_data_isolation.sql`](database/migrations/20261021_user_data_isolation.sql).
The migration assigns existing categories and products to the first admin
(lowest user ID), makes category names and product SKUs unique per user, and
adds owner foreign keys. It copies the admin's categories to existing accounts;
new registrations receive a copy of the admin's current categories as their
starting set. The migration also adds four sample products to each account
that exists when it runs, without changing that account's existing products.
It is a one-time migration; do not run it again after it succeeds.

Start the backend with the updated code only after the migration completes.
Protected API requests must include the JWT as an `Authorization: Bearer <token>`
header. Product, category, stock history, dashboard, and forecast queries are
scoped to the user ID from that verified token. Stock movements remain linked
to their product owner; the transaction `user_id` column records the user who
performed the movement.

The authenticated `GET /api/forecast/trends` endpoint defaults to a 24-month
historical demand series and six monthly projections. Pass `?view=yearly` to
get up to five recent calendar years of historical demand and three annual
projections. The selected-product endpoint supports the same parameter, for
example `GET /api/forecast/product/1?view=yearly`. Yearly projections require
stock-out history in at least three of the five displayed years.

## Top products by month

After completing the user data isolation migration above, apply
[`database/migrations/20261024_top_products_by_month.sql`](database/migrations/20261024_top_products_by_month.sql)
to create `sp_get_top_products_by_month`. The authenticated
`GET /api/analytics/top-products?month=10` endpoint accepts a calendar month
from 1 to 12; when omitted, it uses the server's current month. Both the API
and the stored procedure use MySQL's 1-based month numbering.
