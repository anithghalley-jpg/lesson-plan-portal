# 🚀 Lesson Plan Review System — Deployment Guide

Follow these steps carefully to connect the frontend to Google Apps Script and WhatsApp.

---

## Part 1: Setup Google Drive & Sheets

1. Go to your **Google Drive**.
2. Create a main folder called `LessonPlanSystem`.
3. Inside it, create two subfolders:
   - `LessonPlans`
   - `VoiceFeedback`
4. **Important**: Copy the IDs of both folders from the URL. 
   *(e.g., in `drive.google.com/drive/folders/1A2B3C...` the ID is `1A2B3C...`)*
5. Inside the main folder, create a new **Google Sheet** named `LessonPlanDatabase`.

---

## Part 2: Setup Apps Script Backend

1. Open the Google Sheet you just created.
2. Go to **Extensions > Apps Script**.
3. A new tab will open. Delete the default code and **paste the entire contents of `appscript/Code.gs`** into it.
4. **Update the `CONFIG` object** at the top of the file:
   ```javascript
   const CONFIG = {
     LESSON_PLANS_FOLDER_ID: 'PASTE_ID_HERE',
     VOICE_FEEDBACK_FOLDER_ID: 'PASTE_ID_HERE',
   };
   ```
5. Click the 💾 **Save** icon (Ctrl+S or Cmd+S).
6. In the dropdown at the top (next to "Debug"), select **`setupSheets`** and click ▶️ **Run**.
   - Google will ask for permissions. Click "Review permissions" -> Choose your account -> "Advanced" -> "Go to Untitled project (unsafe)" -> "Allow".
   - This will automatically create the required "Users" and "Submissions" sheets with the correct headers.

---

## Part 3: Add Users to the Database

1. Go back to your Google Sheet. You should now see a `Users` tab.
2. Add the actual users who will log in.
   - For a teacher: `john.smith` | `Teacher` | `John Smith` | `john.smith@school.edu` | `Science`
   - For an HOD: `hod_principal` | `HOD` | `Dr. Principal` | `hod@school.edu` | `All` (or `Science`)

> **Note:** The frontend currently has dummy logins hardcoded for testing:
> - Username: `teacher1` (Select Teacher role)
> - Username: `hod1` (Select HOD role)

---

## Part 4: Deploy the Web App

1. In the Apps Script editor, click the blue **Deploy** button at the top right -> **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Fill out the details:
   - Description: `v1`
   - Execute as: **Me** (your email)
   - Who has access: **Anyone**
4. Click **Deploy**.
5. Copy the **Web app URL** that appears.

---

## Part 5: Connect Frontend to Backend

1. Open `/Users/dgi/Desktop/Hod/app.js` in your code editor.
2. Find `SCRIPT_URL` at the top of the file:
   ```javascript
   const CONFIG = {
     SCRIPT_URL: 'PASTE_YOUR_WEB_APP_URL_HERE',
   };
   ```
3. Paste the Web app URL you copied in Part 4.
4. Save the file.

---

## Part 6: Host on GitHub Pages

1. Initialize a Git repository in `/Users/dgi/Desktop/Hod/`:
   ```bash
   cd /Users/dgi/Desktop/Hod
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Create a new repository on GitHub (e.g., `lesson-plan-portal`).
3. Push your code:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/lesson-plan-portal.git
   git push -u origin main
   ```
4. Go to your GitHub repository -> **Settings** -> **Pages**.
5. Under "Build and deployment", set the source to **Deploy from a branch**.
6. Select the `main` branch and `/ (root)` folder, then click Save.
7. In a few minutes, your site will be live at `https://YOUR_USERNAME.github.io/lesson-plan-portal`.

---
**Done!** You can now open `index.html` locally or via GitHub Pages and test the flow using the dummy credentials `teacher1` or `hod1`.

