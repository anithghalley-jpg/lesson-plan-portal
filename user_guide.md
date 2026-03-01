# Lesson Plan Portal - User Guide

Welcome to the Lesson Plan Review platform! This guide explains how to use the system depending on your role.

---

## 👨‍🏫 Teacher Guide

**Goal:** Upload Lesson Plans and view feedback from your Head of Department (HOD).

### 1. Logging In
- Navigate to the portal URL.
- Enter your exact **Username** (provided by your Admin) and select the **Teacher** role.
- Click **Login**.

### 2. Uploading New Lesson Plans
- On your dashboard, locate the **Upload Lesson Plans** section.
- From the dropdown menu, select your **Subject Domain** (e.g., Science, Arts). It is critical you select the right domain so the correct HOD receives your file.
- **Drag and drop** your PDF lesson plans into the dashed box, or click the box to browse your computer. *Note: You can select multiple PDF files at once.*
- Click the **Upload & Submit** button to finalize. Your plans will appear in your "My Submissions" list below as `Pending`.

### 3. Reviewing Feedback & Revisions
- When your HOD reviews your file, the status will change to either **✅ Approved** or **🔄 In Progress**.
- **Approved:** Your lesson plan is good to go! No further action is needed.
- **In Progress:** Revisions are required. 
  - Read the textual feedback left by your HOD.
  - If they recorded a voice note, click **"Listen to Voice Feedback"**.
  - **To submit a revision:** Click the blue **"Resolve Needs"** button next to that file. 
  - A popup will appear. Upload your newly updated PDF file, type an optional note to your HOD (e.g., "I fixed the learning outcomes"), and click **Replace File**.
  - The status will revert to `Pending` for the HOD to review again.

---

## 👩‍💼 HOD Guide

**Goal:** Review lesson plans belonging to your domain, provide feedback, request revisions, and issue reminders.

### 1. Logging In
- Enter your **Username** (provided by your Admin) and select the **HOD** role.
- Click **Login**.

### 2. Dashboard Overview
- Your dashboard displays all lesson plans uploaded by Teachers assigned to your specific Domain.
- Use the **Filter Bar** to view only `Pending`, `In Progress`, or `Approved` files. You can also filter by Date.

### 3. Reviewing & Leaving Feedback
- Click anywhere on a Teacher's submission row to open the **Feedback Modal**.
- Click **Open PDF** to read their lesson plan.
- If the teacher left a revision note, it will be highlighted in green inside the modal.
- Select a **Review Status**:
  - **Approved:** The file is perfect.
  - **In Progress:** The file needs modifications.
- **Provide Feedback (Optional but recommended if In Progress):**
  - Type feedback in the text box.
  - AND/OR click the 🎙️ **Microphone icon** to record a voice message right from your browser window!
- Click **Save**. *Note: Saving this does NOT automatically email the teacher. It just updates the portal.*

### 4. Sending Reminders
- If a file has been sitting in `In Progress` for too long and the Teacher hasn't uploaded a fix, you will see a yellow 🔔 **Remind** button next to their file on your dashboard.
- Clicking **Remind** will immediately dispatch an Email to the Teacher's inbox telling them to check the portal and upload a revision.

---

## ⚙️ Administrator Guide

**Goal:** Manage users, monitor the Google Sheet database, and maintain the Apps Script hosting.

### 1. Managing Users (Google Sheets)
All user data and login credentials live in the **Google Sheet** attached to the script.
- Open your Google Sheet and select the `Users` tab.
- **To add a user**, fill out a new row with: `Username`, `Role` (Teacher or HOD), `Name`, `Email`, and `Domain`.
  - Important: HODs will *only* see files matching the `Domain` you assign to them here. To let a Principal/HOD see *everything*, set their Domain to `All`.
- Open the `Domains` tab if you need to add or remove subject categories from the Teacher upload dropdown.

### 2. The Submissions Database
- All historical records exist in the `Submissions` tab on your Google Sheet.
- You can manually delete rows here if files need to be permanently purged from the system record.
- Do **not** change the underlying column headers in this spreadsheet, as the code relies on their exact positions.

### 3. File Storage (Google Drive)
- Every PDF uploaded gets stored in the Master "Lesson Plans" folder.
- Every Voice note recorded gets stored in the Master "Voice Feedback" folder.
- The system automatically creates sub-folders in Drive for each teacher to keep things organized.

### 4. GitHub Pages (Frontend Hosting)
- The user interface (HTML/CSS/JS) lives on GitHub. If you ever need to change a typo or adjust colors, edit the files directly on GitHub and commit your changes. They will go live in a few minutes.
- If the Apps Script Web App URL ever changes (e.g., you create a brand new script), you must edit `app.js` on GitHub and paste the new `SCRIPT_URL` at the very top.
