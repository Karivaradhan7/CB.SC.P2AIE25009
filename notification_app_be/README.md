# Campus Notifications Microservice

This project is a backend microservice built using Node.js and Express for handling campus notifications such as placements, results, and events.

The service fetches notification data from the provided external API and returns notifications based on priority and recency.

## What it does

- Fetches notifications from external service
- Sorts notifications based on priority
- Gives higher priority to placement notifications
- Handles authentication using middleware
- Uses a reusable logging module
- Returns top notifications through REST API

Priority order used:
- Placement
- Result
- Event

More recent notifications are ranked slightly higher compared to older ones.

---

# Project Structure

```text
notification_app_be/
 ├── src/
 │    ├── config/
 │    ├── controllers/
 │    ├── middleware/
 │    ├── routes/
 │    ├── services/
 │    ├── utils/
 │    ├── app.js
 │    └── server.js
```

---

# Setup

## Install dependencies

```bash
cd notification_app_be
npm install
```

Install local logging middleware package:

```bash
npm install ../logging_middleware
```

---

# Environment Setup

Create `.env` file from example:

```bash
cp .env.example .env
```

---

# Run the Project

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server runs on:

```text
http://localhost:3000
```

---

# API

## Get Priority Notifications

Endpoint:

```http
GET /api/notifications/priority
```

Headers:

```http
Authorization: Bearer sample_token_12345
```

Optional query parameter:

```text
limit
```

Example:

```http
GET /api/notifications/priority?limit=10
```

Sample response:

```json
{
  "success": true,
  "count": 2,
  "notifications": []
}
```

---
