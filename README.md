````markdown name=README.md
# Predictpro — Project scaffold

This commit creates an initial scaffold for a full-stack project layout under `project/` with a small frontend and a Node/Express backend.

Structure

project/
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── admin.html
│   ├── style.css
│   ├── script.js
│   └── assets/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── config/
│   │   ├── db.js
│   │   └── email.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── payment.js
│   │   ├── referral.js
│   │   └── premium.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Admin.js
│   │   ├── Transaction.js
│   │   └── Referral.js

How to run (backend)

1. Create a .env file with at least MONGO_URI (and optional SMTP_* vars).
2. cd project/backend && npm install
3. npm run dev (requires nodemon) or npm start

Notes

- The backend contains minimal placeholder endpoints and Mongoose models. Fill in authentication, validation, and business logic as needed.
- The frontend is a static scaffold. Hook it up to backend APIs or integrate with a bundler / framework as desired.
````