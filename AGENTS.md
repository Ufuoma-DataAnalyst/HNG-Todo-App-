# Agent Instructions & Project Guidelines

This file serves as persistent operational guidance for AI coding agents working on this project. All AI agents must follow these instructions when generating, modifying, or testing code.

---

## 1. Project Overview & Core Requirements
- **Application:** To-Do List Web Application.
- **Mandatory Features:**
  1. Full CRUD for tasks (Create, Read, Update, Delete).
  2. Notes management (associated with tasks or standalone).
  3. At least one additional feature (e.g., categories, priority levels, due date tracking, dark mode, or search/filter).
- **Deployment:** Live deployment on Vercel/Netlify connected to the primary Git branch.

---

## 2. Mandatory Testing & Validation Rules
1. **Endpoint Test Coverage:**
   - Every API endpoint created or modified must have corresponding automated integration/unit tests.
   - Tests must cover:
     - **Success paths:** Valid payload returning expected HTTP status (200/201).
     - **Validation errors:** Missing required fields, invalid IDs, or bad data types returning proper error responses (400/404/422).
     - **Edge cases:** Empty query results, duplicate entries, or soft-deleted items.
2. **Pre-Commit / Pre-Deployment Validation:**
   - Always run the test suite locally and verify that all endpoint tests pass before declaring a task complete.
   - Validate that mock data or test database scripts reset test state properly between runs to avoid test pollution.

---

## 3. Code Style & Standards
- Keep functions modular, well-documented, and single-purpose.
- Maintain a clear, standard project layout (e.g., separate controllers, routes/services, models, and tests).
- Ensure error handlers return structured JSON responses:
  ```json
  {
    "error": true,
    "message": "Descriptive error message"
  }