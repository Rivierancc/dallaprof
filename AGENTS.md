<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Totem Burger

## Rules

- Menu content (categories, dishes, prices, photos) lives in the database and is edited through the PIN-gated `/menu` panel. Never hardcode menu items in app code, and never re-add a static product list.
- The staff access cookie's `secure`/`sameSite`/`partitioned` flags must be decided from browser-side signals (secure context, top-level vs iframe) and passed to the server when the session is written. The app runs both inside the preview iframe (https) and standalone on a tablet (often plain http), so fixed flags break the PIN unlock.
- Writes to orders and menu go through server functions that re-check the staff session; public pages may only read. Route photo uploads through the privileged storage helper so the photo bucket can stay private.
- Keep the kiosk, kitchen and customer display on the same live menu/orders queries (TanStack Query + realtime) so edits show up without reloading.
- Test the app by clicking the real UI only after the page is interactive: clicks issued before hydration are silently dropped, which looks like a broken button but isn't.
- Kiosk orders are created as `awaiting_payment` and only reach the kitchen after staff confirm cash/card payment on `/cassa`; why: unpaid orders must never be cooked.
- Customer browser preferences and fullscreen are shared through the root CustomerProvider; why: language and order type must survive navigation without SSR storage reads.
- Order confirmation reads actual payment status and starts its reset countdown only after staff confirmation; why: choosing a payment method is not proof of payment.
- Kiosk exit code is only a local fullscreen control and never authorizes staff data operations; why: fullscreen is not a security boundary.
- Staff access uses one shared server-only credential hash with a version; all staff reads and writes verify the session version through staff.server, while the original secret is only a fallback before the first PIN change. PIN changes require the current PIN and invalidate other devices' sessions; local kiosk exit codes stay per-device and grant no staff access.
- Epson printing is done from the till/kitchen browser on the local network (ePOS-Print), config stored per device; why: the printer is not reachable from the server.
- Ingredients live in one shared library (`menu_ingredients`, sweet/savory, 4-language names, price, availability); dish options keep Italian names and are matched to the library by name for translation and hiding; why: the kitchen ticket stays in Italian while the kiosk shows the customer's language.
- Custom dish titles are category-owned database fields edited through the staff panel; use customTitleFor for customer headings and its Italian result for order tickets, with a neutral fallback to avoid inflecting category names.
- Seasonal themes live in `kiosk_themes` (manual on / automatic yearly date range / off, colours, emoji decorations, 4-language greeting) and are applied only on customer screens by the root ThemeLayer via CSS variables; why: staff pages must stay readable and themes must be editable without code.
- The home-page top text strip is one shared database row edited from the PIN-gated /admin panel and read by the totem via query; why: it must be the same on every totem and only staff may change it.
- Shared presentation settings, credentials and the dedicated category ordering panel live on PIN-gated /admin; /menu keeps dishes, categories and ingredients. Reuse the existing settings components and queries so moving panels does not change persistence or permissions.
- Company identity is stored alongside shared kiosk settings, with logo shape/size, inner image zoom/offsets and whole-description formatting in a separate company_style JSON field validated by cleanCompanyStyle; clip the fixed outer shape rather than the transformed image so framing stays shared and independent from the top banner.
- Product rules (max extras, choice groups, combo items, suggest offer) live on menu_products columns, cleaned by src/lib/options.ts and shared by panel and totem; offer prices are recomputed from the rest of the cart at checkout.
- Staff settings panels must seed their editable draft only once the settings query has resolved (`if (!draft && data)`), never from the loading fallback; why: a draft seeded from the fallback shows staff a switch state that was never saved, so a panel can read "on" while the feature is off.
- Every optional kitchen behaviour is its own flag in the `kiosk_banner.kitchen` JSON, normalised by cleanKitchenFeatures so a flag missing from older rows stays on; add new switches there and to the Admin panel rather than inventing new storage.
- Each kitchen alert tone (ready, partially ready) is its own field in that JSON, while the notes live only in src/lib/sounds.ts; why: staff pick a tone per alert from Admin and every screen must play the same tune.
- Staff text zoom is `--text-scale` multiplied into the root font-size clamp (styles.css), per device; why: wrapper zoom skips dropdowns.
- Staff page controls sit in one top row as identical compact chips built from StaffChip/StaffCrossLink (src/components/staff-nav.tsx); body-page action buttons may stay large for touch; why: staff asked for uniform small buttons and a single command row.
- Update src/lib/manual.ts (+MANUAL_UPDATED) on every user-visible change; why: /manuale must stay current.
- Licensing: `license` row per venue (service-role only), managed from master-password /superadmin; customers read `license_state_v`, orders insert checks `license_allows_orders_v`; why: restaurateurs must not bypass their licence.
- Multi-venue: every table has `venue_id`; `/<slug>/...` is stripped by the router rewrite (src/lib/venue.ts) and sent as x-venue; server code uses venueAdmin()/scoped(); staff cookies per slug; why: venues never see each other's data.
- Fast-food customers: `venue_customers` (service-role, unique venue+phone) only via loyalty.functions/venueAdmin(); orders.customer_id linked server-side; why: never recognised across venues.
