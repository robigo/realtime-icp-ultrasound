/* Video proof of concept: public rooms are not authenticated clinical sessions. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const match = location.hash.match(/^#room=([0-9a-f]{32})$/i);
  let room = match ? match[1].toLowerCase() : null;
  let api = null;

  function idForRoom(token) {
    const id = token.slice(0, 20).toUpperCase();
    return `CALL-${id.slice(0, 5)}-${id.slice(5, 10)}-${id.slice(10, 15)}-${id.slice(15)}`;
  }

  function renderRoom() {
    $('roomPanel').hidden = false;
    $('sessionId').textContent = idForRoom(room);
    const invite = new URL('session.html?v=2', location.href);
    invite.hash = `room=${room}`;
    $('eyeCheckLink').href = `vision.html#session=${room}`;
    if (['https:', 'http:'].includes(invite.protocol) && !['localhost', '127.0.0.1'].includes(invite.hostname)) {
      $('inviteUrl').value = invite.href;
      $('whatsappInvite').href = `https://wa.me/?text=${encodeURIComponent(`קישור לפגישת וידאו: ${invite.href}`)}`;
      $('inviteHelp').textContent = 'שלח את הקישור רק למשתתף המיועד. הקישור אינו מוגן בסיסמה ואינו פג תוקף.';
    } else {
      $('inviteUrl').value = '';
      $('copyInvite').disabled = true;
      $('whatsappInvite').hidden = true;
      $('inviteHelp').textContent = 'כדי לשלוח קישור שעובד במכשיר אחר, יש לפרסם את האתר בכתובת HTTPS ציבורית. קובץ מקומי או localhost אינם קישור למשתתף מרוחק.';
    }
  }

  $('createSession').addEventListener('click', () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    room = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    location.hash = `room=${room}`;
    renderRoom();
    $('createPanel').hidden = true;
  });
  $('copyInvite').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('inviteUrl').value);
      $('copyStatus').textContent = 'הקישור הועתק.';
    } catch (_) {
      $('inviteUrl').focus();
      $('inviteUrl').select();
      $('copyStatus').textContent = 'הקישור סומן; אפשר להעתיק אותו ידנית.';
    }
  });
  $('consentVideo').addEventListener('change', () => {
    if ($('consentVideo').checked) $('videoStatus').textContent = '';
  });

  function loadJitsi() {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('לא ניתן לטעון את שירות הווידאו. בדוק חיבור לרשת או חסימת תוכן.'));
      document.head.append(script);
    });
  }

  $('joinVideo').addEventListener('click', async () => {
    if (!room || api) return;
    if (!$('consentVideo').checked) {
      $('videoStatus').textContent = 'כדי לפתוח וידאו, סמן/י תחילה את תיבת ההסכמה שמעל הכפתור.';
      $('consentVideo').focus();
      return;
    }
    $('joinVideo').disabled = true;
    $('videoStatus').textContent = 'טוען את שירות הווידאו…';
    try {
      await loadJitsi();
      const parentNode = $('videoFrame');
      parentNode.classList.add('active');
      api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: `EchoPulse${room}`,
        parentNode,
        width: '100%',
        height: '100%',
        lang: 'he',
        configOverwrite: { prejoinConfig: { enabled: true } }
      });
      $('videoStatus').textContent = 'השיחה נפתחה בתוך הדף. כניסה לשיחה בפועל תלויה באישור המצלמה ובשירות Jitsi.';
      $('leaveVideo').hidden = false;
    } catch (err) {
      api?.dispose();
      api = null;
      $('videoFrame').classList.remove('active');
      $('videoStatus').textContent = err.message || 'לא ניתן לפתוח את השיחה.';
      $('joinVideo').disabled = false;
    }
  });
  $('leaveVideo').addEventListener('click', () => {
    api?.dispose();
    api = null;
    $('videoFrame').replaceChildren();
    $('videoFrame').classList.remove('active');
    $('leaveVideo').hidden = true;
    $('joinVideo').disabled = false;
    $('videoStatus').textContent = 'השיחה נסגרה בדף זה.';
  });
  window.addEventListener('pagehide', () => api?.dispose());
  if (room) {
    renderRoom();
    $('createPanel').hidden = true;
  }
})();
