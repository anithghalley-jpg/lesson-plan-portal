/**
 * ═══════════════════════════════════════════════
 *  Lesson Plan Review System — Shared JS Module (Phase 2)
 * ═══════════════════════════════════════════════
 *
 * SETUP: Paste your deployed Apps Script Web App URL below.
 */

const CONFIG = {
  // ▼ REPLACE this with your deployed Apps Script Web App URL ▼
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzKbqI0592hY6qtAg8hjPDYSqolxPJqTRi_JQVlUcUtOPWlW3RYFsJnvIZPTbV7ziLJ/exec',
};

/* ═══════════════════════════════
   SESSION / AUTH
═══════════════════════════════ */

const Auth = {
  SESSION_KEY: 'lps_session',

  /** @returns {{username:string, name:string, role:string, telegramId:string, email:string, domain:string}|null} */
  getSession() {
    try { return JSON.parse(sessionStorage.getItem(this.SESSION_KEY)) || null; }
    catch { return null; }
  },

  setSession(user) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  },

  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  /**
   * Redirect to login if not authenticated
   * @param {'teacher'|'hod'|null} requiredRole
   */
  requireAuth(requiredRole = null) {
    const session = this.getSession();
    if (!session) { window.location.href = 'index.html'; return null; }
    if (requiredRole && session.role.toLowerCase() !== requiredRole) {
      Toast.show(`Access denied. Required role: ${requiredRole}`, 'error');
      setTimeout(() => this.logout(), 1500);
      return null;
    }
    return session;
  },

  logout() {
    this.clearSession();
    window.location.href = 'index.html';
  },
};

/* ═══════════════════════════════
   API WRAPPER
═══════════════════════════════ */

const API = {
  async post(payload) {
    const session = Auth.getSession();
    const body = {
      ...payload,
      _auth: session ? { username: session.username, role: session.role } : null,
    };

    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: true };
  },

  async get(params = {}) {
    const session = Auth.getSession();
    const qp = new URLSearchParams({
      ...params,
      _username: session?.username || '',
      _role: session?.role || '',
    });
    const res = await fetch(`${CONFIG.SCRIPT_URL}?${qp.toString()}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  /* ── Specific endpoints ── */

  async login(username, role) {
    // Dummy login fallback for testing
    if (username === 'teacher1' && role === 'teacher') {
      return { success: true, user: { username: 'teacher1', name: 'Test Teacher', role: 'teacher', email: 'teacher@test.com', domain: 'Science' } };
    }
    if (username === 'hod1' && role === 'hod') {
      return { success: true, user: { username: 'hod1', name: 'Test HOD', role: 'hod', email: 'hod@test.com', domain: 'Science' } };
    }

    return this.get({ action: 'login', username, role });
  },

  async getDomains() {
    // Fallback for dummy
    const session = Auth.getSession();
    if (session && session.username === 'teacher1') return { success: true, domains: ['Science', 'Mathematics', 'Arts'] };

    return this.get({ action: 'getDomains' });
  },

  /** Upload array of files + domain */
  async uploadLessonPlan(filesArray, domain) {
    return this.post({
      action: 'uploadLessonPlan',
      files: filesArray, // [{filename, base64Data, mimeType}]
      domain
    });
  },

  async getSubmissions() {
    return this.get({ action: 'getSubmissions' });
  },

  async getTeacherSubmissions(teacherUsername) {
    return this.get({ action: 'getTeacherSubmissions', teacherUsername });
  },

  /** Get Teacher's Drive Folder URL */
  async getTeacherFolderUrl(teacherName) {
    return this.get({ action: 'getTeacherFolderUrl', teacherName });
  },

  /** Submit text & voice feedback (Phase 2) */
  async submitFeedback(submissionId, teacherUsername, textFeedback, base64Audio, status) {
    return this.post({
      action: 'submitFeedback',
      submissionId,
      teacherUsername,
      textFeedback,
      base64Audio,
      status // 'In Progress' or 'Approved'
    });
  },

  /** Teacher replacing a file in 'In Progress' status */
  async updateSubmission(submissionId, fileObj, teacherNote) {
    return this.post({
      action: 'updateSubmission',
      submissionId,
      file: fileObj, // {filename, base64Data, mimeType}
      teacherNote
    });
  },

  /** HOD sends email reminder to teacher */
  async sendReminderEmail(submissionId, teacherUsername) {
    return this.post({
      action: 'sendReminderEmail',
      submissionId,
      teacherUsername
    });
  }
};

/* ═══════════════════════════════
   FILE UTILITIES
═══════════════════════════════ */

const FileUtils = {
  toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },

  formatDate(isoString) {
    if (!isoString) return '—';
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(isoString));
  },
};

/* ═══════════════════════════════
   TOAST NOTIFICATIONS
═══════════════════════════════ */

const Toast = {
  container: null,
  init() {
    if (document.getElementById('toast-container')) return;
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    document.body.appendChild(this.container);
  },
  show(message, type = 'info', duration = 3500) {
    this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => el.remove(), 280);
    }, duration);
  },
};

/* ═══════════════════════════════
   NAVBAR HELPERS
═══════════════════════════════ */

function renderNavUser() {
  const session = Auth.getSession();
  if (!session) return;
  const nameEl = document.getElementById('nav-name');
  const roleEl = document.getElementById('nav-role');
  const logoutEl = document.getElementById('nav-logout');
  if (nameEl) nameEl.textContent = session.name || session.username;
  if (roleEl) {
    roleEl.textContent = session.role.toUpperCase();
    roleEl.className = `nav-badge badge-${session.role.toLowerCase()}`;
  }
  if (logoutEl) logoutEl.addEventListener('click', () => Auth.logout());
}

/* ═══════════════════════════════
   AUDIO RECORDER
═══════════════════════════════ */

class AudioRecorder {
  constructor({ onStop }) {
    this.onStop = onStop;
    this.mediaRecorder = null;
    this.chunks = [];
    this.timerInterval = null;
    this.seconds = 0;
    this.blob = null;
  }
  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.blob = null;
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = e => this.chunks.push(e.data);
    this.mediaRecorder.onstop = () => {
      this.blob = new Blob(this.chunks, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      if (this.onStop) this.onStop(this.blob);
    };
    this.mediaRecorder.start();
    this._startTimer();
  }
  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    clearInterval(this.timerInterval);
  }
  _startTimer() {
    this.seconds = 0;
    this.timerInterval = setInterval(() => this.seconds++, 1000);
  }
  get isRecording() { return this.mediaRecorder && this.mediaRecorder.state === 'recording'; }
}

document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  renderNavUser();
});
