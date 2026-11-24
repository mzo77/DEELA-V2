# DEELA — Apple Signing & iOS Device Registration

This module is part of the existing DEELA owner dashboard (not a separate app or store).

## What works now

- Owner-only creation of Apple signing groups / licensed-provider records.
- Owner-only upload of a P12 and a mobileprovision file into a **private** Supabase Storage bucket (no downloads returned to subscribers).
- Owner assignment of existing iOS subscribers to a group with device name and UDID.
- Optional real Apple device registration through App Store Connect API, using the authorized owner's own Developer account API key.
- A device is marked `apple_registered` **only after Apple has returned a verified ID**. Errors remain visible to the owner.
- Dedicated Apple certificates section in the owner website and in the DEELA 0.9.12 Android owner app source.
- Android subscriber app catalogue and subscriptions remain separate.

## One-time Apple connection (when you obtain an eligible developer membership)

In Supabase project `rxlynynjetajtsqlhkrq`, open **Edge Functions → Secrets**. Configure the following secrets:

- `DEELA_APPLE_ISSUER_ID` — App Store Connect API issuer ID.
- `DEELA_APPLE_KEY_ID` — corresponding API key ID.
- `DEELA_APPLE_API_PRIVATE_KEY_P8` — private contents of the matching API key `.p8` file.

Never commit a `.p8`, `.p12`, certificate password or Apple account credentials to GitHub or mobile applications; never send them through chat. API access must be for the Apple Developer team to which the enrolled devices belong. This is **not** the Apple Account password.

Inside **DEELA owner → شهادات Apple**:

1. Create an Ad Hoc group with the Apple Team ID, or a licensed provider group.
2. If relevant, upload the P12 and mobileprovision via the private upload form.
3. Choose an existing iOS subscriber and enter their real UDID with permission.
4. Click **Register with Apple** only for eligible testing devices and an active iOS subscription.
5. A successful Apple registration is recorded as `apple_registered`, **not** as `installed` or `signed`.

## Important limitations

- Apple Ad Hoc is for registered test devices, not an unlimited commercial third-party IPA store. Apple maintains a limit of **100 devices per device family per membership year**.
- The device_limit field is local bookkeeping; it does not increase Apple's entitlement or quotas.
- Uploading a P12/mobileprovision stores a file **unverified** until a compatible signing engine checks it.
- Adding a UDID, including a device in a provisioning profile, signing an IPA, and confirming installation are different steps.
- No IPA resigning, distribution, automated certificate provisioning, OTA installation, nor provider API integration has been enabled by this module.
- Apple Enterprise certificates are for organizations' internal proprietary apps, **not** external subscribers.
- Redistribution of third-party IPA files requires appropriate rights and must comply with Apple's applicable rules.

Primary Apple documentation:
- https://developer.apple.com/help/account/devices/devices-overview
- https://developer.apple.com/documentation/appstoreconnectapi/post-v1-devices
- https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests
- https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/
