# Stage 1

## REST API Design: Campus Notification System

The system manages notifications for placements, events, and academic results.

### 1. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/notifications` | Create a new notification |
| GET | `/api/v1/notifications` | Get all notifications (paginated) |
| GET | `/api/v1/notifications/unread` | Get unread notifications |
| PATCH | `/api/v1/notifications/:id/read` | Mark a specific notification as read |
| DELETE | `/api/v1/notifications/:id` | Delete a notification |
| GET | `/api/v1/notifications/counts` | Get unread notification counts |

### 2. Request Body Examples

**Create Notification (`POST /api/v1/notifications`)**
```json
{
  "type": "PLACEMENT",
  "title": "Microsoft Campus Drive 2026",
  "message": "The technical interview for Microsoft is scheduled for tomorrow at 10 AM.",
  "targetStudentIds": ["1042", "1043", "1045"],
  "priority": "HIGH"
}
```

### 3. Response Examples

**Get Unread Notifications (`GET /api/v1/notifications/unread?type=PLACEMENT&page=1&limit=10`)**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_8f9a2b",
        "type": "PLACEMENT",
        "title": "Microsoft Campus Drive 2026",
        "message": "The technical interview for Microsoft is scheduled for tomorrow at 10 AM.",
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
```

### 4. Headers Structure
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
Accept: application/json
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

### 5. Status Codes
- `200 OK`: Successful GET, PATCH requests.
- `201 Created`: Successful POST request.
- `400 Bad Request`: Invalid input or validation failure.
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Insufficient permissions (e.g., student trying to create a global notification).
- `404 Not Found`: Notification does not exist.
- `500 Internal Server Error`: Generic server failure.

### 6. Notification Schema
```json
{
  "id": "String (UUID)",
  "type": "Enum (PLACEMENT, EVENT, RESULT)",
  "title": "String",
  "message": "String",
  "priority": "Enum (LOW, MEDIUM, HIGH)",
  "isRead": "Boolean",
  "studentId": "String (Indexed)",
  "createdAt": "Timestamp (Indexed)"
}
```

### 7. Real-time Notification Mechanism
**Server-Sent Events (SSE)** or **WebSockets** are used to push real-time updates to clients.
**Why WebSockets?**
For an active campus ecosystem with high concurrency, WebSockets provide a persistent, bidirectional connection. It significantly reduces the overhead of constant HTTP polling. If the requirement is strictly one-way (server to client) and lightweight, **SSE (Server-Sent Events)** over HTTP/2 is often a cleaner and more efficient architectural choice.

### 8. Authentication Flow
- Client sends login credentials to Auth Service.
- Auth Service returns a signed JWT.
- Client passes the JWT in the `Authorization` header for all requests to the Notification Service.
- Notification Service middleware verifies the token using a shared secret or public key before processing the request.


# Stage 2

## Database Model

### 1. SQL vs NoSQL
**Recommendation:** PostgreSQL.
**Why:**
Notifications have a rigid, highly structured schema (recipient, payload, status) and relationships (users, departments, roles). We need robust transactional integrity (e.g., ensuring a notification is marked read consistently) and complex querying (joining users with notifications, filtering by multiple criteria). PostgreSQL handles this exceptionally well while offering JSONB for unstructured payload data if necessary.

### 2. Schema breakdown

**`students` Table**
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `name` (VARCHAR)
- `department` (VARCHAR)

**`notifications` Table**
- `id` (UUID, Primary Key)
- `type` (VARCHAR)
- `title` (VARCHAR)
- `message` (TEXT)
- `priority` (VARCHAR)
- `created_at` (TIMESTAMP)

**`student_notifications` (Mapping/Status Table)**
- `id` (UUID, Primary Key)
- `student_id` (UUID, Foreign Key -> students.id)
- `notification_id` (UUID, Foreign Key -> notifications.id)
- `is_read` (BOOLEAN, Default: false)
- `read_at` (TIMESTAMP, Nullable)

### 3. Indexing Strategy
- **Composite Index** on `student_notifications(student_id, is_read, created_at)`: This directly supports the most common query pattern—fetching unread notifications for a specific user ordered by time.
- **Index** on `notifications(type, created_at)`: Helpful for global queries like filtering all placement notifications.

### 4. Normalization vs Denormalization
We normalized the schema by separating `notifications` (the content) from `student_notifications` (the delivery status). If a campus event broadcasts to 5,000 students, we store the content once in `notifications` and create 5,000 lightweight status rows in `student_notifications`.

### 5. Scaling & Partitioning
As historical data grows, the `student_notifications` table will become massive.
- **Table Partitioning:** We can horizontally partition the `student_notifications` table by `created_at` (e.g., monthly partitions). Old partitions can be archived or moved to cheaper storage.
- **Data Retention:** Implement a TTL (Time-To-Live) strategy to hard delete or archive notifications older than 6 months.

### 6. Caching
- Use **Redis** to cache unread notification counts per `student_id`. Counts are read frequently (on every page load) but updated less frequently relative to reads.

### 7. Sample SQL Queries
*Get all unread notifications for a student:*
```sql
SELECT n.id, n.type, n.title, n.message, n.created_at
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notification_id
WHERE sn.student_id = 'uuid-1042' AND sn.is_read = false
ORDER BY n.created_at DESC
LIMIT 20 OFFSET 0;
```


# Stage 3

## Query Optimization

### The Problematic Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Why it becomes slow at scale
Without proper indexing, the database engine must perform a **Full Table Scan**. It reads every single row in the `notifications` table, checks if `studentID` matches, checks `isRead`, sorts the matching rows in memory (using a filesort), and then returns them. At millions of rows, the disk I/O and CPU cost for sorting is catastrophic.

### The Indexing Strategy
To optimize this specific query, we need a **Composite Index**.
An index on just `studentID` helps, but the DB still has to filter `isRead` and sort by `createdAt` manually.
Indexing every column is **bad** because every `INSERT`, `UPDATE`, or `DELETE` operation requires updating all the indexes, drastically slowing down write performance and increasing disk space overhead. Over-indexing creates write bottlenecks.

### Optimized Strategy
Create a composite index covering the exact filtering and sorting path:
```sql
CREATE INDEX idx_student_unread_created
ON notifications (studentID, isRead, createdAt DESC);
```

### Finding Placement Notifications in the Last 7 Days
```sql
SELECT DISTINCT s.*
FROM students s
JOIN student_notifications sn ON s.id = sn.student_id
JOIN notifications n ON sn.notification_id = n.id
WHERE n.type = 'PLACEMENT'
  AND n.created_at >= NOW() - INTERVAL '7 days';
```


# Stage 4

## Handling Read-Heavy Notification Traffic

When notifications load on every page refresh, a naive DB-only approach will overwhelm the primary database with excessive read operations.

### 1. Caching Strategies (Redis)
We should not hit the SQL database for unread counts or recent notifications on every refresh.
- **Count Caching:** Store a key like `notif_count:{student_id}` in Redis. Increment it when a new notification arrives; decrement when read.
- **Feed Caching:** Cache the top 20 most recent notifications for active users in a Redis List or Sorted Set. If the user scrolls past 20 (pagination), fallback to the database.

### 2. Delivery Mechanisms
- **Polling (Bad for Scale):** Clients pinging `/api/notifications/unread` every 10 seconds creates massive HTTP overhead.
- **WebSockets / SSE (Better):** Maintains an open connection. The backend pushes updates only when an event occurs. Page refreshes just load from the Redis cache, and subsequent updates come over the socket.

### 3. Lazy Loading & Pagination
Never load all notifications. Load the first 10, and use **Cursor-Based Pagination** for infinite scrolling. Cursor pagination (e.g., `WHERE created_at < last_seen_timestamp`) is much faster than offset pagination (`OFFSET 10000`) on large datasets because it leverages indexes directly instead of counting rows.

### 4. Read Replicas
For queries that must hit the database (like complex filtering or viewing older history), route those reads to a PostgreSQL **Read Replica**. This isolates heavy read analytics/history queries from the primary instance handling write traffic (new events).


# Stage 5

## Fixing the Naive Broadcast System

### Original Pseudocode Analysis
```python
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

### Shortcomings & Reliability Issues
1. **Synchronous Blocking:** This loop runs sequentially. If `send_email` takes 1 second, notifying 5000 students takes over an hour. The HTTP request invoking this will time out.
2. **Partial Failures & No Retries:** If `push_to_app` fails for student #500, the loop might crash. The first 499 students got the notification, but the rest didn't. You have no safe way to retry without accidentally spamming the first 499 again.
3. **Database Contention:** Doing individual `save_to_db` inserts inside a loop creates excessive transactional overhead.

### Redesigned Queue-Based Architecture

We should decouple the request from the processing using a **Message Broker (RabbitMQ/Kafka/SQS)** and a **Worker Pattern**.

1. The API receives the request, writes a single job to the queue, and responds `202 Accepted` immediately.
2. Workers pull batches of student IDs and process them asynchronously.
3. Errors are pushed to a **Dead Letter Queue (DLQ)** for inspection or manual retry.
4. Database writes are done in **Bulk Inserts**.

### Scalable Pseudocode

```python
# --- API LAYER ---
function broadcast_notification(student_ids, message):
    job_payload = { "ids": student_ids, "message": message, "job_id": generate_uuid() }
    publish_to_queue("notification_broadcast_jobs", job_payload)
    return "Notification queued successfully."


# --- WORKER LAYER ---
function process_broadcast_job(job):
    # 1. Bulk insert to database first (Single Transaction)
    try:
        bulk_save_to_db(job.ids, job.message)
    except DBError:
        retry_later(job)
        return

    # 2. Queue individual delivery tasks (fan-out pattern)
    for chunk in chunk_array(job.ids, 100):
        publish_to_queue("email_delivery_queue", { "ids": chunk, "message": job.message })
        publish_to_queue("push_delivery_queue", { "ids": chunk, "message": job.message })


# --- DELIVERY WORKERS ---
function process_email_delivery(task):
    try:
        send_bulk_emails(task.ids, task.message)
    except EmailProviderError:
        if task.retries < 3:
            publish_to_queue_with_delay("email_delivery_queue", task, delay=5m)
        else:
            send_to_dead_letter_queue("email_dlq", task)
```
