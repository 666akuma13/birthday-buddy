/* =============================================
   Birthday Buddy — Application Logic
   ============================================= */

(() => {
  'use strict';

  // ---- Constants ----
  const STORAGE_KEY = 'birthdayBuddy_data';
  const SETTINGS_KEY = 'birthdayBuddy_settings';
  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ---- State ----
  let birthdays = [];
  let settings = { reminderTime: '08:00' };
  let currentEditId = null;
  let searchQuery = '';

  // ---- DOM References ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const splash = $('#splash');
  const app = $('#app');
  const todayBanner = $('#today-banner');
  const todayText = $('#today-text');
  const todaySub = $('#today-sub');
  const searchInput = $('#search-input');
  const fab = $('#fab');
  const modalOverlay = $('#modal-overlay');
  const modalTitle = $('#modal-title');
  const form = $('#birthday-form');
  const editIdInput = $('#edit-id');
  const inputName = $('#input-name');
  const inputDate = $('#input-date');
  const inputRelation = $('#input-relation');
  const inputNotes = $('#input-notes');
  const inputReminder = $('#input-reminder');
  const btnDelete = $('#btn-delete');
  const modalClose = $('#modal-close');
  const settingsOverlay = $('#settings-overlay');
  const btnSettings = $('#btn-settings');
  const settingsClose = $('#settings-close');
  const notifStatus = $('#notif-status');
  const btnEnableNotif = $('#btn-enable-notif');
  const inputReminderTime = $('#input-reminder-time');
  const btnExport = $('#btn-export');
  const fileImport = $('#file-import');
  const btnClear = $('#btn-clear');
  const detailOverlay = $('#detail-overlay');
  const detailTitle = $('#detail-title');
  const detailBody = $('#detail-body');
  const detailClose = $('#detail-close');
  const detailEdit = $('#detail-edit');
  const toastEl = $('#toast');
  const upcomingList = $('#upcoming-list');
  const allList = $('#all-list');
  const emptyUpcoming = $('#empty-upcoming');
  const emptyAll = $('#empty-all');
  const monthsGrid = $('#months-grid');

  // ---- Utilities ----
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getToday() {
    const d = new Date();
    return { month: d.getMonth(), day: d.getDate(), year: d.getFullYear() };
  }

  function daysUntilBirthday(month, day) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let next = new Date(today.getFullYear(), month, day);
    next.setHours(0, 0, 0, 0);
    if (next < today) {
      next = new Date(today.getFullYear() + 1, month, day);
    }
    return Math.round((next - today) / (1000 * 60 * 60 * 24));
  }

  function calculateAge(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const today = getToday();
    let age = today.year - year;
    if (today.month < month - 1 || (today.month === month - 1 && today.day < day)) {
      age--;
    }
    return age;
  }

  function getNextAge(dateStr) {
    return calculateAge(dateStr) + 1;
  }

  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${day} ${MONTHS[month - 1]} ${year}`;
  }

  function formatDateShort(dateStr) {
    const [, month, day] = dateStr.split('-').map(Number);
    return `${day} ${MONTH_SHORT[month - 1]}`;
  }

  function getInitials(name) {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function getZodiacSign(month, day) {
    const signs = [
      { sign: '♑ Capricorn', end: [1, 19] },
      { sign: '♒ Aquarius', end: [2, 18] },
      { sign: '♓ Pisces', end: [3, 20] },
      { sign: '♈ Aries', end: [4, 19] },
      { sign: '♉ Taurus', end: [5, 20] },
      { sign: '♊ Gemini', end: [6, 20] },
      { sign: '♋ Cancer', end: [7, 22] },
      { sign: '♌ Leo', end: [8, 22] },
      { sign: '♍ Virgo', end: [9, 22] },
      { sign: '♎ Libra', end: [10, 22] },
      { sign: '♏ Scorpio', end: [11, 21] },
      { sign: '♐ Sagittarius', end: [12, 21] },
      { sign: '♑ Capricorn', end: [12, 31] }
    ];
    for (const s of signs) {
      if (month < s.end[0] || (month === s.end[0] && day <= s.end[1])) {
        return s.sign;
      }
    }
    return '♑ Capricorn';
  }

  function getDayOfWeek(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const today = new Date();
    let nextYear = today.getFullYear();
    const next = new Date(nextYear, month - 1, day);
    if (next < today) next.setFullYear(nextYear + 1);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[next.getDay()];
  }

  // ---- Storage ----
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      birthdays = raw ? JSON.parse(raw) : [];
    } catch {
      birthdays = [];
    }
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) settings = { ...settings, ...JSON.parse(raw) };
    } catch { /* keep defaults */ }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(birthdays));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ---- Toast ----
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      setTimeout(() => toastEl.classList.add('hidden'), 300);
    }, 2500);
  }

  // ---- Rendering ----
  function renderAll() {
    renderTodayBanner();
    renderUpcoming();
    renderAllList();
    renderMonths();
  }

  function renderTodayBanner() {
    const today = getToday();
    const todayBirthdays = birthdays.filter(b => {
      const [, m, d] = b.date.split('-').map(Number);
      return m - 1 === today.month && d === today.day;
    });

    if (todayBirthdays.length === 0) {
      todayBanner.classList.add('hidden');
      return;
    }

    todayBanner.classList.remove('hidden');
    const names = todayBirthdays.map(b => b.name);
    if (names.length === 1) {
      todayText.textContent = `🎂 It's ${names[0]}'s Birthday!`;
      const age = getNextAge(todayBirthdays[0].date);
      todaySub.textContent = `Turning ${age} today! Don't forget to wish them! 🎁`;
    } else {
      todayText.textContent = `🎂 ${names.join(' & ')} have birthdays today!`;
      todaySub.textContent = `Don't forget to wish them! 🎁`;
    }
  }

  function getFilteredBirthdays() {
    if (!searchQuery) return birthdays;
    const q = searchQuery.toLowerCase();
    return birthdays.filter(b =>
      b.name.toLowerCase().includes(q) ||
      (b.relation && b.relation.toLowerCase().includes(q)) ||
      (b.notes && b.notes.toLowerCase().includes(q))
    );
  }

  function createCardHTML(b) {
    const [, m, d] = b.date.split('-').map(Number);
    const days = daysUntilBirthday(m - 1, d);
    const isToday = days === 0;
    const age = calculateAge(b.date);

    let countdownHTML;
    if (isToday) {
      countdownHTML = `<span class="countdown-today">🎉 TODAY!</span>`;
    } else {
      countdownHTML = `
        <div class="countdown-days">${days}</div>
        <div class="countdown-label">day${days !== 1 ? 's' : ''} left</div>
      `;
    }

    return `
      <div class="birthday-card ${isToday ? 'today' : ''}" data-id="${b.id}">
        <div class="card-avatar">${getInitials(b.name)}</div>
        <div class="card-info">
          <div class="card-name">${escapeHtml(b.name)}</div>
          <div class="card-date">${formatDateShort(b.date)} · Age ${age}</div>
          ${b.relation ? `<div class="card-relation">${escapeHtml(b.relation)}</div>` : ''}
        </div>
        <div class="card-countdown">${countdownHTML}</div>
      </div>
    `;
  }

  function renderUpcoming() {
    const filtered = getFilteredBirthdays();
    const sorted = [...filtered].sort((a, b) => {
      const [, am, ad] = a.date.split('-').map(Number);
      const [, bm, bd] = b.date.split('-').map(Number);
      return daysUntilBirthday(am - 1, ad) - daysUntilBirthday(bm - 1, bd);
    });

    // Group: Today, This Week, This Month, Later
    const today = [];
    const thisWeek = [];
    const thisMonth = [];
    const later = [];

    sorted.forEach(b => {
      const [, m, d] = b.date.split('-').map(Number);
      const days = daysUntilBirthday(m - 1, d);
      if (days === 0) today.push(b);
      else if (days <= 7) thisWeek.push(b);
      else if (days <= 30) thisMonth.push(b);
      else later.push(b);
    });

    let html = '';
    if (today.length) {
      html += `<div class="section-header">🎂 Today</div>`;
      html += today.map(createCardHTML).join('');
    }
    if (thisWeek.length) {
      html += `<div class="section-header">📅 This Week</div>`;
      html += thisWeek.map(createCardHTML).join('');
    }
    if (thisMonth.length) {
      html += `<div class="section-header">🗓️ This Month</div>`;
      html += thisMonth.map(createCardHTML).join('');
    }
    if (later.length) {
      html += `<div class="section-header">⏳ Later</div>`;
      html += later.map(createCardHTML).join('');
    }

    if (sorted.length === 0) {
      upcomingList.innerHTML = '';
      emptyUpcoming.classList.remove('hidden');
    } else {
      upcomingList.innerHTML = html;
      emptyUpcoming.classList.add('hidden');
    }
  }

  function renderAllList() {
    const filtered = getFilteredBirthdays();
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    if (sorted.length === 0) {
      allList.innerHTML = '';
      emptyAll.classList.remove('hidden');
    } else {
      allList.innerHTML = sorted.map(createCardHTML).join('');
      emptyAll.classList.add('hidden');
    }
  }

  function renderMonths() {
    const today = getToday();
    const counts = new Array(12).fill(0);
    birthdays.forEach(b => {
      const m = parseInt(b.date.split('-')[1], 10) - 1;
      counts[m]++;
    });

    monthsGrid.innerHTML = counts.map((count, i) => `
      <div class="month-card ${i === today.month ? 'current' : ''}">
        <div class="month-name">${MONTH_SHORT[i]}</div>
        <div class="month-count">${count}</div>
        <div class="month-label">birthday${count !== 1 ? 's' : ''}</div>
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Tabs ----
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-panel').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
      });
      tab.classList.add('active');
      const panel = $(`#tab-${tab.dataset.tab}`);
      panel.classList.remove('hidden');
      panel.classList.add('active');
    });
  });

  // ---- Search ----
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderUpcoming();
    renderAllList();
  });

  // ---- FAB / Add ----
  fab.addEventListener('click', () => openAddModal());

  function openAddModal() {
    currentEditId = null;
    modalTitle.textContent = 'Add Birthday';
    form.reset();
    editIdInput.value = '';
    btnDelete.classList.add('hidden');
    inputReminder.value = '1';
    modalOverlay.classList.remove('hidden');
    setTimeout(() => inputName.focus(), 300);
  }

  function openEditModal(id) {
    const b = birthdays.find(x => x.id === id);
    if (!b) return;
    currentEditId = id;
    modalTitle.textContent = 'Edit Birthday';
    editIdInput.value = id;
    inputName.value = b.name;
    inputDate.value = b.date;
    inputRelation.value = b.relation || '';
    inputNotes.value = b.notes || '';
    inputReminder.value = b.reminderDays != null ? b.reminderDays.toString() : '1';
    btnDelete.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
  }

  modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
  });

  // ---- Form Submit ----
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = inputName.value.trim();
    const date = inputDate.value;
    const relation = inputRelation.value;
    const notes = inputNotes.value.trim();
    const reminderDays = parseInt(inputReminder.value, 10);

    if (!name || !date) return;

    if (currentEditId) {
      const idx = birthdays.findIndex(b => b.id === currentEditId);
      if (idx !== -1) {
        birthdays[idx] = { ...birthdays[idx], name, date, relation, notes, reminderDays };
        showToast('✅ Birthday updated!');
      }
    } else {
      birthdays.push({ id: generateId(), name, date, relation, notes, reminderDays });
      showToast('🎂 Birthday added!');
    }

    saveData();
    renderAll();
    modalOverlay.classList.add('hidden');
    scheduleNotifications();
  });

  // ---- Delete ----
  btnDelete.addEventListener('click', () => {
    if (!currentEditId) return;
    if (confirm('Delete this birthday?')) {
      birthdays = birthdays.filter(b => b.id !== currentEditId);
      saveData();
      renderAll();
      modalOverlay.classList.add('hidden');
      showToast('🗑️ Birthday deleted');
      scheduleNotifications();
    }
  });

  // ---- Detail View ----
  function openDetail(id) {
    const b = birthdays.find(x => x.id === id);
    if (!b) return;

    const [year, month, day] = b.date.split('-').map(Number);
    const age = calculateAge(b.date);
    const nextAge = getNextAge(b.date);
    const days = daysUntilBirthday(month - 1, day);
    const zodiac = getZodiacSign(month, day);
    const dayOfWeek = getDayOfWeek(b.date);

    detailTitle.textContent = b.name;
    detailBody.innerHTML = `
      <div class="detail-avatar">${getInitials(b.name)}</div>
      <div class="detail-name">${escapeHtml(b.name)}</div>
      <div class="detail-info">
        <div class="detail-row">
          <span class="label">📅 Birthday</span>
          <span class="value">${formatDate(b.date)}</span>
        </div>
        <div class="detail-row">
          <span class="label">🎂 Current Age</span>
          <span class="value">${age} years</span>
        </div>
        <div class="detail-row">
          <span class="label">🎁 Turning</span>
          <span class="value">${nextAge} in ${days === 0 ? 'today!' : days + ' days'}</span>
        </div>
        <div class="detail-row">
          <span class="label">📆 Falls on</span>
          <span class="value">${dayOfWeek}</span>
        </div>
        <div class="detail-row">
          <span class="label">⭐ Zodiac</span>
          <span class="value">${zodiac}</span>
        </div>
        ${b.relation ? `
        <div class="detail-row">
          <span class="label">👥 Relationship</span>
          <span class="value">${escapeHtml(b.relation)}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="label">🔔 Reminder</span>
          <span class="value">${b.reminderDays === 0 ? 'On the day' : b.reminderDays + ' day(s) before'}</span>
        </div>
        ${b.notes ? `<div class="detail-notes">📝 ${escapeHtml(b.notes)}</div>` : ''}
      </div>
    `;

    detailEdit.onclick = () => {
      detailOverlay.classList.add('hidden');
      openEditModal(id);
    };

    detailOverlay.classList.remove('hidden');
  }

  detailClose.addEventListener('click', () => detailOverlay.classList.add('hidden'));
  detailOverlay.addEventListener('click', (e) => {
    if (e.target === detailOverlay) detailOverlay.classList.add('hidden');
  });

  // Card click delegation
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.birthday-card');
    if (card) {
      openDetail(card.dataset.id);
    }
  });

  // ---- Settings ----
  btnSettings.addEventListener('click', () => {
    updateNotifUI();
    inputReminderTime.value = settings.reminderTime || '08:00';
    settingsOverlay.classList.remove('hidden');
  });

  settingsClose.addEventListener('click', () => settingsOverlay.classList.add('hidden'));
  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden');
  });

  // Notifications
  function updateNotifUI() {
    if (!('Notification' in window)) {
      notifStatus.textContent = 'Not supported on this browser';
      btnEnableNotif.textContent = 'N/A';
      btnEnableNotif.disabled = true;
      return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') {
      notifStatus.textContent = '✅ Notifications enabled';
      btnEnableNotif.textContent = 'Enabled';
      btnEnableNotif.disabled = true;
    } else if (perm === 'denied') {
      notifStatus.textContent = '❌ Blocked — enable in browser settings';
      btnEnableNotif.textContent = 'Blocked';
      btnEnableNotif.disabled = true;
    } else {
      notifStatus.textContent = 'Click to enable reminders';
      btnEnableNotif.textContent = 'Enable';
      btnEnableNotif.disabled = false;
    }
  }

  btnEnableNotif.addEventListener('click', async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    updateNotifUI();
    if (perm === 'granted') {
      showToast('🔔 Notifications enabled!');
      scheduleNotifications();
    }
  });

  // Reminder Time
  inputReminderTime.addEventListener('change', () => {
    settings.reminderTime = inputReminderTime.value;
    saveSettings();
    scheduleNotifications();
    showToast('⏰ Reminder time updated');
  });

  // Export
  btnExport.addEventListener('click', () => {
    const data = JSON.stringify(birthdays, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'birthday-buddy-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Data exported!');
  });

  // Import
  fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid');
        let added = 0;
        imported.forEach(b => {
          if (b.name && b.date) {
            if (!b.id) b.id = generateId();
            // Avoid duplicates by id
            if (!birthdays.find(x => x.id === b.id)) {
              birthdays.push(b);
              added++;
            }
          }
        });
        saveData();
        renderAll();
        showToast(`📥 Imported ${added} birthday(s)!`);
      } catch {
        showToast('❌ Invalid file format');
      }
      fileImport.value = '';
    };
    reader.readAsText(file);
  });

  // Clear all
  btnClear.addEventListener('click', () => {
    if (confirm('Delete ALL saved birthdays? This cannot be undone!')) {
      birthdays = [];
      saveData();
      renderAll();
      showToast('🗑️ All data cleared');
    }
  });

  // ---- Notifications / Scheduling ----
  let notifCheckInterval = null;

  function scheduleNotifications() {
    // Clear any existing interval
    if (notifCheckInterval) clearInterval(notifCheckInterval);

    // Check every 60 seconds
    notifCheckInterval = setInterval(checkAndNotify, 60 * 1000);

    // Also check immediately
    checkAndNotify();
  }

  function checkAndNotify() {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [reminderHour, reminderMin] = (settings.reminderTime || '08:00').split(':').map(Number);

    // Only fire notifications around the reminder time (within 2-minute window)
    const diffMin = (now.getHours() * 60 + now.getMinutes()) - (reminderHour * 60 + reminderMin);
    if (diffMin < 0 || diffMin > 2) return;

    // Check what was already notified today
    const notifiedKey = `birthdayBuddy_notified_${todayStr}`;
    let notified = [];
    try { notified = JSON.parse(localStorage.getItem(notifiedKey)) || []; } catch { /* ignore */ }

    birthdays.forEach(b => {
      if (notified.includes(b.id)) return;

      const [, m, d] = b.date.split('-').map(Number);
      const days = daysUntilBirthday(m - 1, d);
      const reminderDays = b.reminderDays != null ? b.reminderDays : 1;

      let shouldNotify = false;
      let message = '';

      if (days === 0) {
        shouldNotify = true;
        const age = getNextAge(b.date);
        message = `🎂 Today is ${b.name}'s birthday! They're turning ${age}! 🎉`;
      } else if (days === reminderDays) {
        shouldNotify = true;
        message = `📅 ${b.name}'s birthday is in ${days} day${days > 1 ? 's' : ''}! Don't forget to prepare! 🎁`;
      }

      if (shouldNotify) {
        new Notification('Birthday Buddy 🎂', {
          body: message,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          tag: `birthday-${b.id}-${todayStr}`,
          requireInteraction: true,
        });
        notified.push(b.id);
      }
    });

    localStorage.setItem(notifiedKey, JSON.stringify(notified));
  }

  // ---- Service Worker ----
  async function registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('service-worker.js');
        console.log('SW registered:', reg.scope);
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    }
  }

  // ---- Splash & Init ----
  function init() {
    loadData();

    // Splash animation
    setTimeout(() => {
      splash.classList.add('fade-out');
      app.classList.remove('hidden');
      setTimeout(() => splash.remove(), 600);
    }, 1200);

    renderAll();
    registerSW();
    scheduleNotifications();

    // Daily midnight refresh
    const msUntilMidnight = (() => {
      const now = new Date();
      const mid = new Date(now);
      mid.setHours(24, 0, 0, 0);
      return mid - now;
    })();
    setTimeout(() => {
      renderAll();
      checkAndNotify();
      // Then every 24 hours
      setInterval(() => {
        renderAll();
        checkAndNotify();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  // ---- Keyboard shortcuts ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modalOverlay.classList.add('hidden');
      settingsOverlay.classList.add('hidden');
      detailOverlay.classList.add('hidden');
    }
  });

  // ---- Start ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
