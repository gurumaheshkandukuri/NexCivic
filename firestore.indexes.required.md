# NexCivic Firestore Indexes Requirement

This document defines the exact composite indexes required by the application based on all queries used in the service layer up to Sprint 4B.

### Collection: `issues`
- **Fields:** `reportedByUID` (ASC), `createdAt` (DESC)
  - **Reason:** Powers the Citizen Dashboard (`subscribeUserIssues`) to show a citizen's own issues sorted by time.
- **Fields:** `assignedInspectorUID` (ASC), `createdAt` (DESC)
  - **Reason:** Powers the Field Inspector Dashboard (`subscribeRoleBasedIssues`) to show assigned cases sorted by time.
- **Fields:** `state` (ASC), `createdAt` (DESC)
  - **Reason:** Powers the Municipality HQ Dashboard (`subscribeRoleBasedIssues`) to show state-wide issues sorted by time.

### Collection: `users`
- **Fields:** `role` (ASC), `assignedState` (ASC), `assignedDistrict` (ASC)
  - **Reason:** Powers the automatic Field Inspector assignment engine inside `createIssue`.
- **Fields:** `role` (ASC), `xp` (DESC)
  - **Reason:** Powers the leaderboard or gamification queries (`getTopCitizens`).

### Collection: `notifications`
- **Fields:** `userUID` (ASC), `createdAt` (DESC)
  - **Reason:** Powers the user notification inbox (`subscribeNotifications`).
- **Fields:** `userUID` (ASC), `read` (ASC)
  - **Reason:** Powers the unread notification count badge (`subscribeUnreadCount`).

### Collection: `activity_log`
- **Fields:** `timestamp` (DESC)
  - **Reason:** Powers the activity log queries. (Single field).

### Obsolete/Removed Indexes
- `issues`: `state` (ASC), `district` (ASC)
  - **Reason:** Replaced by direct assignment to `assignedInspectorUID` for filtering issues by district for inspectors.
