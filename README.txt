TaskStream (Team Manager)
========================

TaskStream is a full-stack task + project management app.

It includes:
- Backend: Node.js + Express REST API with MongoDB (Mongoose) and JWT auth
- Frontend: React + Vite UI (Tailwind CSS)

Repo layout
-----------
- backend/   Express API, MongoDB models, controllers, routes
- frontend/  React UI, API client, pages/components

Main features
-------------
- Authentication
  - Sign up / Sign in
  - Get current user (/me)
- Projects
  - Create/list/delete projects
  - Invite members to a project
  - Accept/decline invitations
  - Update project members
- Tasks
  - Create/list/update/delete tasks
  - Update task status
  - Reorder tasks
  - Add comments to tasks
- Team
  - View team members
- Dashboard
  - Workspace/project summary

Tech stack
----------
Backend:
- express, cors, cookie-parser
- mongoose (MongoDB)
- jsonwebtoken (JWT)
- bcryptjs (password hashing)
- zod (validation)

Frontend:
- react, react-dom
- vite
- tailwindcss

API overview
------------
Base URL: /api

Health:
- GET /api/health

Auth:
- POST /api/auth/signup
- POST /api/auth/signin
- GET  /api/auth/me (requires auth)

Dashboard:
- GET /api/dashboard/summary (requires auth)
  - Optional query: ?projectId=<id>

Projects:
- GET    /api/projects (requires auth)
- POST   /api/projects (requires auth)
- DELETE /api/projects/:id (requires auth)

Invitations:
- GET   /api/projects/invitations (requires auth)
- POST  /api/projects/:id/invitations (requires auth)
- PATCH /api/projects/invitations/:id (requires auth)  # body: { decision }

Project members:
- PATCH /api/projects/:id (requires auth)

Tasks:
- GET    /api/tasks (requires auth)
- POST   /api/tasks (requires auth)
- POST   /api/tasks/reorder (requires auth)  # body: { updates }
- PATCH  /api/tasks/:id (requires auth)
- PATCH  /api/tasks/:id/status (requires auth)  # body: { status }
- POST   /api/tasks/:id/comments (requires auth) # body: { message }
- DELETE /api/tasks/:id (requires auth)

Team:
- GET /api/team (requires auth)

Authentication
--------------
The frontend sends a Bearer token in the Authorization header.
Example:
Authorization: Bearer <token>

Backend setup (environment variables)
-------------------------------------
Create a file: backend/.env

Required:
- MONGO_URI=<your mongodb connection string>

Optional:
- PORT=3000
- CORS_ORIGIN=*                 (or a comma-separated list of allowed origins)
- JWT_SECRET=<your secret>

Note: The backend will throw an error on startup if MONGO_URI is missing.

Frontend setup (environment variables)
-------------------------------------
Create a file: frontend/.env

Optional:
- VITE_API_URL=http://localhost:3000
  - This should point to the backend server (without /api).
  - Defaults to http://localhost:3000 if not set.

How to run (development)
-----------------------
Backend:
- cd backend
- npm install
- npm run dev

Frontend:
- cd frontend
- npm install
- npm run dev

Build (frontend)
----------------
- cd frontend
- npm run build
- npm run preview

Notes / troubleshooting
-----------------------
- If requests fail in the browser due to CORS, set backend CORS_ORIGIN to your frontend dev URL.
  Example: CORS_ORIGIN=http://localhost:5173
- API base URL used by the frontend is: ${VITE_API_URL}/api


