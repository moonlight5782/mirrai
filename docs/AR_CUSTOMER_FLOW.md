# Customer AR flow (SDK 2.3.0)

The service-owned `hugge-md` presentation catalogue has explicit non-expiring
demo access in `db/subscription.mjs`. Manual suspension still disables it.
Other stores retain their normal subscription expiry checks; merchants cannot
select this exception as a plan. Remove it when converting HUGGE to a paid tenant.

On mobile, the widget resolves the published SKU and prepares a compact inline
launcher in the product card. The buyer taps **Посмотреть у себя** after loading;
there is no intermediate product viewer or popup. The click calls model-viewer
in the same frame and user gesture. Camera permission and system placement UI
are controlled by the device and cannot be skipped by the website.

The launcher polls catalog access every 30 seconds, fails closed on network
errors/unpublished products, compares the resolved model URL, and rejects a tap
when the last successful check is older than 35 seconds. It never enables AR
before the dimension check completes. Switching variants replaces the launcher.
Removing the widget removes its iframe and stops its polling and model work.

Desktop retains the interactive 3D viewer and adds an on-device-generated QR code
for the currently selected model; no external QR service receives product data.
The preview remains zoomable. AR uses fixed scale. Scene Viewer is enabled only
when the original GLB already matches catalog dimensions, because it ignores
scale adjustments made in the web viewer.

Safari/iOS uses Quick Look, compatible Android browsers use WebXR/Scene Viewer.
Embedded browsers (Telegram, Instagram, Facebook, X and others) differ by app,
OS and version. If AR cannot launch, the UI explains how to open the same item in
Safari/Chrome, offers copy-link, and keeps the normal 3D viewer available. The
site does not ask shoppers to manage GLB/USDZ files. It cannot guarantee camera
AR on devices without the required OS services or in restrictive WebViews.

## Validation and release limits

Behavior tests cover mobile launcher creation for iPhone, Android, iPad desktop
UA, and common embedded-app UAs; denied access; variant replacement; cleanup;
legacy SDK compatibility. These are **not** real-device camera tests.

Before claiming a specific app is supported, manually open a published product
on iPhone Safari and Android Chrome, then from Telegram/Instagram/Facebook/X.
Check permission denied, return from AR, switching colors, poor network, and a
device without AR support. Old immutable SDKs remain unchanged; installation
instructions now use 2.3.0.
