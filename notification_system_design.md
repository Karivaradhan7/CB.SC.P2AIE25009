Campus Notification System

A backend system for handling campus notifications related to placements, events, and academic results.

The goal of this project was to design something that can support:

* targeted notifications,
* unread tracking,
* real-time delivery,
* and large student broadcasts without overloading the database.

⸻

API Endpoints

Method	Endpoint	Purpose
POST	/api/v1/notifications	Create a notification
GET	/api/v1/notifications	Fetch notifications with pagination
GET	/api/v1/notifications/unread	Fetch unread notifications
PATCH	/api/v1/notifications/:id/read	Mark notification as read
DELETE	/api/v1/notifications/:id	Delete a notification
GET	/api/v1/notifications/counts	Get unread notification count

⸻

Sample Request

Create Notification

POST /api/v1/notifications

{
  "type": "PLACEMENT",
  "title": "Microsoft Campus Drive 2026",
  "message": "Technical interview scheduled tomorrow at 10 AM.",
  "targetStudentIds": ["1042", "1043", "1045"],
  "priority": "HIGH"
}

⸻

Sample Response

Get Unread Notifications

GET /api/v1/notifications/unread?page=1&limit=10&type=PLACEMENT

{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_8f9a2b",
        "type": "PLACEMENT",
        "title": "Microsoft Campus Drive 2026",
        "message": "Technical interview scheduled tomorrow at 10 AM.",
        "isRead": false,
        "createdAt": "2026-05-06T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 45
    }
  }
}

⸻

Headers

Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Accept: application/json
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000

⸻

Status Codes

Code	Meaning
200	Successful request
201	Notification created
400	Validation or bad input
401	Invalid or missing JWT
403	Permission issue
404	Notification not found
500	Internal server error

⸻

Notification Model

{
  "id": "UUID",
  "type": "PLACEMENT | EVENT | RESULT",
  "title": "String",
  "message": "String",
  "priority": "LOW | MEDIUM | HIGH",
  "isRead": "Boolean",
  "studentId": "UUID",
  "createdAt": "Timestamp"
}

⸻

Real-Time Updates

For real-time delivery, WebSockets or SSE can be used.

Initially SSE looked simpler because notifications are mostly server-to-client events. But for a larger campus system with active users, WebSockets would probably scale better if bidirectional communication becomes necessary later.

Polling every few seconds was avoided because it would create unnecessary traffic when thousands of students are online.

⸻

Authentication

JWT-based authentication is used.

Basic flow:

1. User logs in through Auth Service
2. Auth Service returns JWT token
3. Client sends token in Authorization header
4. Notification service validates token before processing requests

⸻

Database Design

PostgreSQL was chosen mainly because notification data is structured and relational.

The system needs:

* joins between students and notifications,
* filtering,
* unread tracking,
* and transactional consistency.

Redis is added separately for caching frequently accessed data like unread counts.

⸻

Tables

students

Column	Type
id	UUID
email	VARCHAR
name	VARCHAR
department	VARCHAR

⸻

notifications

Column	Type
id	UUID
type	VARCHAR
title	VARCHAR
message	TEXT
priority	VARCHAR
created_at	TIMESTAMP

⸻

student_notifications

Mapping table for delivery + read status.

Column	Type
id	UUID
student_id	UUID
notification_id	UUID
is_read	BOOLEAN
read_at	TIMESTAMP

⸻

Why Separate Tables?

Instead of storing duplicate notification content for every student, the notification content is stored once.

The student_notifications table only tracks:

* who received it,
* read status,
* and timestamps.

This reduces storage overhead during large broadcasts.

⸻

Indexing

The most common query is:

* fetch unread notifications for a student
* ordered by latest first

Because of that, a composite index is useful.

CREATE INDEX idx_student_unread_created
ON student_notifications (student_id, is_read, created_at DESC);

Another index was added for filtering notifications by type.

CREATE INDEX idx_notification_type_created
ON notifications (type, created_at DESC);

Over-indexing was avoided because inserts and updates become slower when too many indexes exist.

⸻

Sample Query

Get unread notifications

SELECT n.id, n.type, n.title, n.message, n.created_at
FROM notifications n
JOIN student_notifications sn
ON n.id = sn.notification_id
WHERE sn.student_id = 'uuid-1042'
AND sn.is_read = false
ORDER BY n.created_at DESC
LIMIT 20;

⸻

Scaling Considerations

As the number of notifications grows, the student_notifications table can become very large.

Some possible optimizations:

* monthly table partitioning
* archival of old notifications
* retention cleanup jobs
* read replicas for analytics/history queries

For now, notifications older than 6 months can be archived or deleted depending on requirements.

⸻

Caching

Unread counts are requested very frequently in the UI.

Instead of querying PostgreSQL repeatedly, Redis can cache values like:

notif_count:{student_id}

Counts are:

* incremented when new notifications arrive
* decremented when marked as read

Recent notifications can also be cached for active users.

⸻

Pagination

Offset pagination works initially, but at very large offsets it becomes slower.

Cursor-based pagination would be better for production-scale systems.

Example approach:

WHERE created_at < last_seen_timestamp

This works more efficiently with indexes.

⸻

Broadcast Handling

A synchronous notification loop is risky for large broadcasts.

Example problem:

for student in students:
    send_email(student)
    save_to_db(student)
    push_notification(student)

Issues with this approach:

* slow processing
* request timeout risk
* partial failures
* retry difficulties

⸻

Improved Approach

A queue-based design is more reliable.

Flow:

1. API receives broadcast request
2. Job is pushed to queue
3. Worker processes students in batches
4. Delivery services handle emails/push notifications separately

This prevents long-running API requests.

⸻

Queue-Based Example

# API
function broadcast_notification(student_ids, message):
    publish_to_queue({
        "ids": student_ids,
        "message": message
    })
    return "Queued successfully"
# Worker
function process_job(job):
    bulk_insert_notifications(job.ids)
    for chunk in split(job.ids, 100):
        publish_email_job(chunk)
        publish_push_job(chunk)

