# NexCivic Architectural Reference

This document serves as the official architectural reference for the NexCivic platform. It outlines the data structures, role models, complaint lifecycles, and security paradigms employed across the system.

---

## 1. Role Model (RBAC)

NexCivic enforces strict Role-Based Access Control (RBAC) natively through Firebase Authentication backed by a `users` Firestore collection.

| Role | Access Level | Description |
|---|---|---|
| **Citizen** | Reporter / Public | Can create complaints, view public issues, rate resolutions, and confirm (upvote) public complaints. |
| **FieldInspector** | Field Worker | Automatically assigned to issues based on state/district. Can only view and update issues assigned to them. Responsible for uploading evidence (before/after). |
| **MunicipalityHQ** | Administrator | Has oversight over their assigned state. Can view all complaints in that state, override statuses, and manage import batches. |

---

## 2. Collection Structure

The Firestore NoSQL database is modeled as follows:

- `users`: Contains user profiles, XP, badges, and RBAC mapping.
- `issues`: The authoritative document for a complaint. Contains all sensitive PII, comments, inspector assignments, and internal timelines.
- `notifications`: Stores automated system messages for Citizens and Inspectors.
- `counters`: Maintains the regional sequence generators for Complaint ID generation.
- `issue_supports`: Tracks which Citizen has upvoted which issue to prevent duplicate votes.
- `activity_log`: Global audit trail of critical administrative actions.
- `survey_responses`: Aggregated community feedback.
- `import_batches`: Tracks bulk-imports performed by HQ.

---

## 3. Complaint ID Format

Complaint IDs are automatically generated in a single transactional write to ensure global uniqueness and sequential continuity without gaps.

**Format:** `NC-YYYY-[STATE_CODE]-[DISTRICT_CODE]-[000000]`
- Example: `NC-2026-TS-HYD-000142`

---

## 4. Complaint Lifecycle (FSM)

The lifecycle of a complaint is governed by a strict Finite State Machine inside the `issueService.ts` layer. 

1. **Submitted**: The Citizen creates a complaint. The system auto-generates the ID and assigns a Field Inspector.
2. **Assigned**: The Inspector receives the assignment notification.
3. **Accepted**: The Inspector actively acknowledges the assignment.
4. **Inspection Started**: The Inspector departs to the location.
5. **Inspection Completed**: The Inspector uploads `before` and `after` images and submits initial remarks.
6. **Awaiting HQ Review**: The Inspector recommends either a RESOLVE or REJECT outcome.
7. **Resolved / Rejected**: Municipality HQ or automated logic confirms the outcome and closes the case.

> [!IMPORTANT]  
> The backend explicitly rejects backward transitions or skipped steps (e.g. you cannot jump from Assigned to Inspection Completed).

---

## 5. Timeline Structure

Every significant mutation on a complaint automatically appends an immutable `TimelineItem` to the `timeline` array.

```typescript
type TimelineItem = {
  id: string;             // UUID
  status: string;         // The status at the time of the event
  timestamp: string;      // ISO-8601 String
  updatedByUID: string;   // Actor UID
  updatedByName: string;  // Actor Name
  updatedByRole: string;  // Actor Role
  remarks: string;        // Contextual information
}
```
*Note: Because Firestore security rules forbid `delete` on the `issues` collection, timeline history is effectively append-only and cryptographically auditable.*

---

## 6. Storage Structure & Security

Firebase Storage strictly stores visual evidence related to complaints.

**Path Format:** `issues/{complaintId}/{stage}/{filename}`
- `stage` MUST be exactly `before` or `after`.
- Files must be valid images (`image/*`).
- Maximum file size: `5MB`.

**Security Enforcement (Cross-Service Rules):**
The Storage Rules perform a `firestore.get()` call against the related `issues/{complaintId}` document to dynamically verify that `request.auth.uid == assignedInspectorUID` and that the issue is actively in the `Inspection Started` state.

---

## 7. Notification Flow

Notifications are heavily automated. A Citizen interacting with an issue creates notifications for the Inspector, and the Inspector's progression creates notifications for the Citizen.

- **Create**: Allowed globally. The service layer constructs the payload and pushes it to the recipient's UID.
- **Read/Update**: Strictly isolated. Users can only read and mark their own notifications as read.
