# Campus Notifications Microservice

## Overview
This is a microservice built with Node.js and Express to manage campus notifications (Placements, Results, Events) for amrita vishwa vidhyapeetham. It pulls raw notifications from an external evaluation service, scores them based on priority and recency, and serves the most important notifications to the campus feed.

## Features
- **Notification Ordering**: Placement > Result > Event
- **Recency Decay**: Older notifications lose priority points so the feed stays relevant.
- **Custom Logger**: Simple logging module without raw `console.log`.

## Folder Structure
```
notification_app_be/
 ├── src/
 │    ├── config/           # Environment and App config
 │    ├── controllers/      # Route handlers (HTTP layer)
 │    ├── middleware/       # Express middlewares (Auth, Errors)
 │    ├── routes/           # API Route definitions
 │    ├── services/         # Business logic & external API calls
 │    ├── utils/            # Helper functions (Priority scoring)
 │    ├── app.js            # Express app setup
 │    └── server.js         # Entry point
```

## Setup & Execution

### Prerequisites
- Node.js (v16+)
- npm

### Installation
1. Install the logging middleware dependency:
   ```bash
   # From the project root, ensure logging_middleware is set up:
   cd ../logging_middleware && npm install
   ```
2. Install the backend dependencies:
   ```bash
   cd ../notification_app_be
   npm install
   # Ensure local package linkage works
   npm install ../logging_middleware
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

### Running the App
```bash
# Run in development mode (nodemon)
npm run dev

# Run in production mode
npm start
```

## API Documentation

### Get Top Priority Notifications
**Endpoint:** `GET /api/notifications/priority`

**Description:** Retrieves the top priority notifications for the logged-in student.

**Headers:**
```http
Authorization: Bearer <any-valid-token>
```

**Query Parameters:**
- `limit` (optional): Number of notifications to return. Default is 10.

**Response Example:**
```json
{
  "success": true,
  "count": 2,
  "notifications": [
    {
      "id": "1",
      "type": "PLACEMENT",
      "title": "Microsoft Campus Drive",
      "message": "Scheduled for tomorrow",
      "createdAt": "2026-05-06T10:00:00.000Z"
    },
    {
      "id": "2",
      "type": "RESULT",
      "title": "Semester 6 Results",
      "message": "Results are out",
      "createdAt": "2026-05-05T08:00:00.000Z"
    }
  ]
}
```

## Testing with Postman
1. Create a new `GET` request to `http://localhost:3000/api/notifications/priority`.
2. Add a key `Authorization` with value `Bearer sample_token_12345`.
3. Click **Send**.
4. You should receive a sorted array of notifications.
