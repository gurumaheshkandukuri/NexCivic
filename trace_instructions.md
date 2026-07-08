# Hotfix-013 Tracing Instructions

I have thoroughly audited the data pipeline and instrumented the exact path of the image upload process with targeted `TRACE` logs in both the UI component (`ReportIssue.tsx`) and the data layer (`issueService.ts`). 

Based on the architecture, if the image successfully reaches Firebase Storage (as verified in Hotfix-012), then the `uploadBytes` step succeeded. The failure is occurring somewhere in the subsequent promise chain (`getDownloadURL` or `updateDoc`).

To definitively pinpoint the root cause without guessing, please perform the following steps:

### Step 1: Run the Traced Pipeline
1. Open the Citizen Dashboard in your browser (`http://localhost:3000`).
2. Open the **Browser Developer Tools** (F12 or Ctrl+Shift+I) and navigate to the **Console** tab.
3. Submit a **new complaint** with an image.
4. Wait for the "Success" screen to appear.

### Step 2: Provide the Logs
Please copy and paste the console output here. You should see logs resembling the following sequence:

```
TRACE [ReportIssue]: Submitting payload ...
TRACE [issueService]: Found imageFile in payload ...
TRACE [issueService]: Uploading to storage path: ...
TRACE [issueService]: uploadBytes finished ...
TRACE [issueService]: got download URL: ...
TRACE [issueService]: Updating Firestore doc ...
TRACE [issueService]: Firestore imageUrl updated with: ...
TRACE [ReportIssue]: createIssue completed, res: ...
TRACE ERROR [issueService]: ... (if any step failed)
```

Once you provide these logs, I will immediately identify exactly which node in the pipeline is dropping the URL and issue the precise fix.
