# Submission & Approval Workflow System

A full-stack application for managing submission and approval workflows with user roles, tracking, and notifications.

## Stack
- Frontend: React.js
- Backend: Node.js + Express.js
- Database: MongoDB
- Authentication: JWT

## Setup

### Backend
1. `cd backend`
2. `npm install`
3. Set up your `.env` file (see root .env for example)
4. `node app.js`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm start`

---

## Features ( After completion)
- Multi-role workflow (Originator, HoD, Principal, etc.)
- Submission forms with attachments
- Approval, return, and forward actions
- Dashboard views for each role
- Logs, notifications, and more 


## Further futures to impliment


- recieved 
- options for both save & submit + 5 min time frame before send
- Remarks - for each 
- Recieved & Submission backend
- admin page faclitates to enter new users.
- urgency 1 , 2 , 3 messages.
-  approval  & reject 
- multiple hod email selector ,also for avarachan sir 
- subject selection?
- sending to multiple hods or faculty from top.
- Email Notifications: For updates at each step ?
- Approve (with options: return to originator, forward to others, approve for payment) ?
-  Return to lower level with remarks ,Forward with remarks , Final approval?
- Admin (optional): Track all flows, manage users ?
- State saved in MongoDB (status, current reviewer, history log) ?
- Remarks history with timestamp ?
data base - view

completed
- Authentication: JWT (for roles like Originator, HoD, Principal, etc.) 
- received and Submisson frontend
- cant access anything without login 
- subject being shown in messages
- admin page
- File Uploads: For attaching documents

---

## Git Commands

to fastforward main

1. `git switch asbir1`
2. `git fetch origin`
3. `git merge origin/main`


