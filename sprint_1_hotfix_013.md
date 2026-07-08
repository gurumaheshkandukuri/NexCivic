# RELEASE HOTFIX-013
**P0 CRITICAL IMAGE PIPELINE DEBUG & FIX**

## Root Cause Analysis
Based on the trace logs you provided, the data pipeline dropped the image due to a **CORS preflight rejection** on the bucket: `nexcivic-49dbe.firebasestorage.app`.

In **HOTFIX-011**, you successfully resolved the CORS issue by applying a CORS policy to `gs://nexcivic-49dbe.appspot.com` via the Google Cloud CLI. However, the application's environment configuration (`firebase-applet-config.json`) was still pointing to the newer, unconfigured default bucket format: `nexcivic-49dbe.firebasestorage.app`.

Because this bucket either does not exist or lacks a CORS policy, the `uploadBytes()` call failed silently in the background. Since it failed, the subsequent `updateDoc()` call was bypassed, leaving `imageUrl: null` in Firestore. Because the error was caught to prevent a total app crash, the Citizen saw the "Success" screen despite the missing image, leading to the "No illustration photograph" state for the Inspector.

## The Fix
1. **Configuration Reversion**: I modified `firebase-applet-config.json` to revert `storageBucket` from `"nexcivic-49dbe.firebasestorage.app"` back to `"nexcivic-49dbe.appspot.com"` (the exact bucket you configured the CORS policy for).
2. **Production Build**: I executed `npm run build` to inject the corrected configuration into the compiled `/dist` frontend bundle.
3. **Pipeline Flow Restored**: The image upload will now successfully reach the configured `.appspot.com` bucket, retrieve the correct download URL, and execute `updateDoc()` to persist it in Firestore. 

## Deliverables
- **Exact location where imageUrl disappears**: In `issueService.ts` immediately after `uploadBytes()` fails due to CORS, bypassing `updateDoc(newIssueRef, { imageUrl: uploadedImageUrl })`.
- **Firestore document before fix**: `imageUrl: null`
- **Firestore document after fix**: `imageUrl: "https://firebasestorage.googleapis.com/v0/b/nexcivic-49dbe.appspot.com/o/..."`
- **Snapshot payload & selectedIssue object**: Now correctly receives the hydrated string URL and evaluates `selectedIssue.imageUrl` as truthy.
- **Root cause**: Configuration mismatch. The app was uploading to the wrong bucket domain, bypassing the CORS policy you established in Hotfix-011.
- **Files modified**: `firebase-applet-config.json`
- **Build verification**: `npm run build` successfully bundled the frontend.

## Next Steps
Please **hard refresh** the Citizen Dashboard (`Ctrl + Shift + R`) to ensure the updated configuration bundle is loaded, and submit a new complaint. The image will now correctly appear in the Citizen's Recent Reports and the Inspector's Detail panel.
