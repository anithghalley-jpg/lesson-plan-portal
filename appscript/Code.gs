/**
 * Lesson Plan Review Portal - Apps Script Backend (Phase 2 - Email Only)
 * 
 * Includes: Multi-Domain, Multi-File Upload, Revisions, Text+Voice Feedback, 
 * Email Notifications for Uploads, Reviews, and Reminders.
 */

const CONFIG = {
  // FOLDER IDs (Create these in Drive and get the ID from the URL)
  LESSON_PLANS_FOLDER_ID: '1QFIvU9JFjDkKrTnymOwN067Pn9AVpUo0',
  VOICE_FEEDBACK_FOLDER_ID: '1jjMh1kmIbyy7xciz-uMqoIaSpYXFNZqx',
};

// ==========================================
// 1. ROUTER
// ==========================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result = {};
    
    if (data.action === 'uploadLessonPlan') {
      result = handleUploadLessonPlan(data);
    } else if (data.action === 'submitFeedback') {
      result = handleSubmitFeedback(data);
    } else if (data.action === 'updateSubmission') {
      result = handleUpdateSubmission(data);
    } else if (data.action === 'sendReminderEmail') {
      result = handleSendReminderEmail(data);
    } else {
      throw new Error("Unknown POST action");
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    let result = {};
    
    if (action === 'login') {
      result = handleLogin(e.parameter.username, e.parameter.role);
    } else if (action === 'getSubmissions') {
      result = handleGetSubmissions(e.parameter._username);
    } else if (action === 'getTeacherSubmissions') {
      result = handleGetTeacherSubmissions(e.parameter.teacherUsername);
    } else if (action === 'getDomains') {
      result = handleGetDomains();
    } else if (action === 'getTeacherFolderUrl') {
      result = handleGetTeacherFolderUrl(e.parameter.teacherName);
    } else {
      return ContentService.createTextOutput("Lesson Plan Portal API is running (Phase 2).");
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 2. HANDLERS
// ==========================================

function handleLogin(username, role) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Schema: Username | Role | Name | Email | Domain
    const [rowUsername, rowRole, rowName, rowEmail, rowDomain] = data[i];
    
    if (String(rowUsername).toLowerCase() === String(username).toLowerCase() && 
        String(rowRole).toLowerCase() === String(role).toLowerCase()) {
      return {
        success: true,
        user: { 
          username: rowUsername, 
          role: rowRole, 
          name: rowName,
          email: rowEmail,
          domain: rowDomain
        }
      };
    }
  }
  return { success: false, message: 'User not found or role mismatch' };
}

function handleGetDomains() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Domains');
  if(!sheet) return { success: true, domains: [] };
  
  const data = sheet.getDataRange().getValues();
  const domains = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) domains.push(data[i][0]);
  }
  return { success: true, domains };
}

// Handles single or multiple files
function handleUploadLessonPlan(data) {
  const { files, domain, _auth } = data;
  if (!_auth || !_auth.username) throw new Error("Unauthorized");
  
  const teacherUsername = _auth.username;
  const teacherDetails = getUserDetails(teacherUsername);
  const teacherName = teacherDetails ? teacherDetails.name : teacherUsername;
  
  // 1. Get/Create Teacher Folder in Drive
  const parentFolder = DriveApp.getFolderById(CONFIG.LESSON_PLANS_FOLDER_ID);
  let teacherFolder = getOrCreateFolder(parentFolder, teacherName);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Submissions');
  const timestamp = new Date().toISOString();
  
  const results = [];
  
  // 2. Process each file
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const blob = Utilities.newBlob(Utilities.base64Decode(f.base64Data), f.mimeType, f.filename);
    const file = teacherFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();
    const submissionId = new Date().getTime().toString() + "_" + i;
    
    sheet.appendRow([
      submissionId,      // A: ID
      timestamp,         // B: Timestamp
      teacherUsername,   // C: TeacherUsername
      teacherName,       // D: TeacherName
      f.filename,        // E: FileName
      fileUrl,           // F: DriveLink
      'Pending',         // G: Status
      '',                // H: VoiceLink
      domain,            // I: Domain
      '',                // J: TextFeedback
      ''                 // K: TeacherNote
    ]);
    
    results.push({ filename: f.filename, fileUrl, submissionId });
    
    // Notify corresponding HODs for this domain via Email
    notifyDomainHODs(domain, `New Lesson Plan Submitted`, `Hello,\n\nA new lesson plan has been submitted by ${teacherName} in the ${domain} domain.\n\nFile: ${f.filename}\n\nPlease log into the portal to review it, or view the PDF directly here: ${fileUrl}`);
  }
  
  return { success: true, files: results };
}

// Replaces an existing submission file with a new one
function handleUpdateSubmission(data) {
  const { submissionId, file, teacherNote, _auth } = data;
  if (!_auth || !_auth.username) throw new Error("Unauthorized");
  
  const teacherUsername = _auth.username;
  const teacherDetails = getUserDetails(teacherUsername);
  const teacherName = teacherDetails ? teacherDetails.name : teacherUsername;
  
  // Save new file
  const parentFolder = DriveApp.getFolderById(CONFIG.LESSON_PLANS_FOLDER_ID);
  let teacherFolder = getOrCreateFolder(parentFolder, teacherName);
  const blob = Utilities.newBlob(Utilities.base64Decode(file.base64Data), file.mimeType, file.filename);
  const newFile = teacherFolder.createFile(blob);
  newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileUrl = newFile.getUrl();
  
  // Update Sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Submissions');
  const dRange = sheet.getDataRange();
  const sheetData = dRange.getValues();
  
  let domain = "General";
  for (let i = 1; i < sheetData.length; i++) {
    if (String(sheetData[i][0]) === String(submissionId)) {
      domain = sheetData[i][8] || "General";
      sheet.getRange(i + 1, 5).setValue(file.filename); // Update FileName
      sheet.getRange(i + 1, 6).setValue(fileUrl);       // Update DriveLink
      sheet.getRange(i + 1, 7).setValue('Pending');     // Update Status back to Pending
      sheet.getRange(i + 1, 11).setValue(teacherNote);  // Update TeacherNote
      break;
    }
  }
  
  // Notify HOD via Email
  notifyDomainHODs(domain, `Lesson Plan Updated (Revision)`, `Hello,\n\n${teacherName} has uploaded a revised lesson plan in the ${domain} domain.\n\nFile: ${file.filename}\nTeacher Note: ${teacherNote || 'None'}\n\nPlease log into the portal to review it.`);
  
  return { success: true, fileUrl };
}

function handleGetSubmissions(hodUsername) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Submissions');
  if(!sheet) return { success: true, submissions: [] };
  
  const hodDetails = getUserDetails(hodUsername);
  const hodDomain = hodDetails && hodDetails.role.toLowerCase() === 'hod' ? hodDetails.domain : null;
  
  const data = sheet.getDataRange().getValues();
  const submissions = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDomain = row[8];
    
    // Domain filtering
    if (hodDomain && String(hodDomain).toLowerCase() !== String(rowDomain).toLowerCase() && String(hodDomain).toLowerCase() !== 'all') {
      continue;
    }
    
    submissions.push({
      id: row[0],
      timestamp: row[1],
      teacherUsername: row[2],
      teacherName: row[3],
      fileName: row[4],
      driveLink: row[5],
      status: row[6],
      voiceLink: row[7],
      domain: row[8],
      textFeedback: row[9],
      teacherNote: row[10]
    });
  }
  
  // Sort: Pending -> In Progress -> Approved
  const statusWeight = { 'Pending': 1, 'In Progress': 2, 'Approved': 3 };
  submissions.sort((a, b) => {
    const wA = statusWeight[a.status] || 4;
    const wB = statusWeight[b.status] || 4;
    if (wA !== wB) return wA - wB;
    return new Date(b.timestamp) - new Date(a.timestamp); // Newest first for ties
  });
  
  return { success: true, submissions };
}

function handleGetTeacherSubmissions(teacherUsername) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Submissions');
  if(!sheet) return { success: true, submissions: [] };
  
  const data = sheet.getDataRange().getValues();
  const submissions = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[2]).toLowerCase() === String(teacherUsername).toLowerCase()) {
      submissions.push({
        id: row[0],
        timestamp: row[1],
        teacherUsername: row[2],
        teacherName: row[3],
        fileName: row[4],
        driveLink: row[5],
        status: row[6],
        voiceLink: row[7],
        domain: row[8],
        textFeedback: row[9],
        teacherNote: row[10]
      });
    }
  }
  
  const statusWeight = { 'Pending': 1, 'In Progress': 2, 'Approved': 3 };
  submissions.sort((a, b) => {
    const wA = statusWeight[a.status] || 4;
    const wB = statusWeight[b.status] || 4;
    if (wA !== wB) return wA - wB;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  return { success: true, submissions };
}

function handleSubmitFeedback(data) {
  const { submissionId, teacherUsername, base64Audio, textFeedback, status, _auth } = data;
  if (!_auth || _auth.role !== 'hod') throw new Error("Unauthorized");
  
  const teacherDetails = getUserDetails(teacherUsername);
  const teacherName = teacherDetails ? teacherDetails.name : teacherUsername;
  const teacherEmail = teacherDetails ? teacherDetails.email : null;
  
  let audioUrl = "";
  
  // 1. Save Audio to Drive (if provided)
  if (base64Audio) {
    const parentFolder = DriveApp.getFolderById(CONFIG.VOICE_FEEDBACK_FOLDER_ID);
    let teacherFolder = getOrCreateFolder(parentFolder, teacherName);
    const filename = `VoiceFeedback_${submissionId}.webm`;
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Audio), 'audio/webm', filename);
    const file = teacherFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    audioUrl = file.getUrl();
  }
  
  // 2. Update Sheets
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Submissions');
  const dRange = sheet.getDataRange();
  const sheetData = dRange.getValues();
  
  let fileName = "";
  for (let i = 1; i < sheetData.length; i++) {
    if (String(sheetData[i][0]) === String(submissionId)) {
      fileName = sheetData[i][4];
      sheet.getRange(i + 1, 7).setValue(status);             // Update Status
      if(audioUrl) sheet.getRange(i + 1, 8).setValue(audioUrl); // Update VoiceLink if exists
      sheet.getRange(i + 1, 10).setValue(textFeedback);      // Update TextFeedback
      
      // Clear Teachers note if approved, since cycle is done
      if (status === 'Approved') sheet.getRange(i + 1, 11).setValue(''); 
      break;
    }
  }
  
  // NOTE: Email notification removed per user request. 
  // HOD must manually click "Remind" to email the teacher.
  
  return { success: true, audioUrl, status };
}

function handleSendReminderEmail(data) {
  const { submissionId, teacherUsername, _auth } = data;
  if (!_auth || _auth.role !== 'hod') throw new Error("Unauthorized");
  
  const teacherDetails = getUserDetails(teacherUsername);
  if (!teacherDetails || !teacherDetails.email) {
    return { success: false, message: "Teacher email not found in directory." };
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Submissions');
  const dRange = sheet.getDataRange();
  const sheetData = dRange.getValues();
  
  let fileName = "your lesson plan";
  for (let i = 1; i < sheetData.length; i++) {
    if (String(sheetData[i][0]) === String(submissionId)) {
      fileName = sheetData[i][4];
      break;
    }
  }
  
  const subject = `Action Required: Lesson Plan Feedback for ${fileName}`;
  const body = `Hello ${teacherDetails.name},\n\nThis is a gentle reminder that the HOD has left feedback on your lesson plan "${fileName}". The status is currently marked as 'In Progress'.\n\nPlease log into the portal, review the feedback, and upload an updated version as soon as possible.\n\nThank you,\nHOD`;
  
  MailApp.sendEmail(teacherDetails.email, subject, body);
  return { success: true };
}

function handleGetTeacherFolderUrl(teacherName) {
  try {
    const parentFolder = DriveApp.getFolderById(CONFIG.LESSON_PLANS_FOLDER_ID);
    const safeName = String(teacherName || '').replace(/'/g, "\\'");
    const folders = parentFolder.searchFolders(`title = '${safeName}'`);
    if (folders.hasNext()) {
      return { success: true, url: folders.next().getUrl() };
    }
    return { success: false, message: "Folder not found." };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ==========================================
// 3. HELPERS
// ==========================================

function getUserDetails(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if(!sheet) return null;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(username).toLowerCase()) {
      return {
        username: data[i][0],
        role: data[i][1],
        name: data[i][2],
        email: data[i][3],
        domain: data[i][4]
      };
    }
  }
  return null;
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.searchFolders(`title = '${folderName}'`);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Searches the Users sheet for HODs corresponding to a specific domain
 * and sends them an Email notification.
 */
function notifyDomainHODs(domain, subject, body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  if(!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowRole = String(data[i][1]).toLowerCase();
    const rowEmail = data[i][3];
    const rowDomain = data[i][4];
    
    // Notify if HOD and (Domain matches OR Domain is All/Blank)
    if (rowRole === 'hod' && rowEmail) {
      if (!rowDomain || String(rowDomain).toLowerCase() === 'all' || String(rowDomain).toLowerCase() === String(domain).toLowerCase()) {
        MailApp.sendEmail(rowEmail, subject, body);
      }
    }
  }
}

// Run this function once manually from the editor to set up or update sheets
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup Users sheet
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('Users');
    usersSheet.appendRow(['Username', 'Role', 'Name', 'Email', 'Domain']);
    usersSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  } else {
    // If upgrading from original, we might need to shift columns around to remove whatsapp and telegram.
    // Rather than destructive rewrite, just ensure we have Name, Email, Domain headers in 3/4/5 columns.
    usersSheet.getRange(1, 3).setValue('Name');
    usersSheet.getRange(1, 4).setValue('Email');
    usersSheet.getRange(1, 5).setValue('Domain');
  }
  
  // Setup Submissions sheet
  let subSheet = ss.getSheetByName('Submissions');
  if (!subSheet) {
    subSheet = ss.insertSheet('Submissions');
    subSheet.appendRow(['ID', 'Timestamp', 'TeacherUsername', 'TeacherName', 'FileName', 'DriveLink', 'Status', 'VoiceLink', 'Domain', 'TextFeedback', 'TeacherNote']);
    subSheet.getRange(1, 1, 1, 11).setFontWeight('bold');
  } else {
    // Add missing columns if upgrading from Phase 1
    const headers = subSheet.getRange(1, 1, 1, subSheet.getLastColumn()).getValues()[0];
    if (headers.length < 9) subSheet.getRange(1, 9).setValue('Domain');
    if (headers.length < 10) subSheet.getRange(1, 10).setValue('TextFeedback');
    if (headers.length < 11) subSheet.getRange(1, 11).setValue('TeacherNote');
  }
  
  // Setup Domains sheet
  let domainsSheet = ss.getSheetByName('Domains');
  if (!domainsSheet) {
    domainsSheet = ss.insertSheet('Domains');
    domainsSheet.appendRow(['DomainName']);
    domainsSheet.getRange(1, 1, 1, 1).setFontWeight('bold');
    domainsSheet.appendRow(['Science']);
    domainsSheet.appendRow(['Mathematics']);
    domainsSheet.appendRow(['Arts']);
  }
}
