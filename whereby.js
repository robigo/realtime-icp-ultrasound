(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
    $('meetingProvider').textContent = 'Jitsi / בדיקה טכנית';
    $('meetingHeading').textContent = 'צור חדר וידאו לניסיון';
    $('meetingIntro').textContent = 'באתר הציבורי אפשר ליצור קישור אישי לחדר ניסיון ב־Jitsi. ליצירת חדר Whereby נדרש השרת המקומי שמחזיק את מפתח ה־API.';
    $('createMeeting').textContent = 'צור חדר וקישור ב־Jitsi';
    $('status').textContent = 'לחיצה תפתח חדר ניסיון בדף שלנו. השירות החיצוני עשוי לבקש מהמארח להתחבר לחשבון לפני תחילת השיחה.';
    $('createMeeting').addEventListener('click', () => {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      const room = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      location.href = `session.html#room=${room}`;
    });
    return;
  }
  $('createMeeting').addEventListener('click', async () => {
    $('createMeeting').disabled = true;
    $('status').textContent = 'יוצר חדר ניסיון…';
    try {
      const response = await fetch('/api/meetings', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'יצירת החדר נכשלה.');
      $('guestUrl').value = result.roomUrl;
      $('callId').textContent = result.callId;
      $('openVision').href = `vision.html#call=${encodeURIComponent(result.callId)}`;
      $('shareGuest').href = `https://wa.me/?text=${encodeURIComponent(`קישור לשיחת וידאו לניסוי טכני: ${result.roomUrl}`)}`;
      const embed = document.createElement('whereby-embed');
      embed.setAttribute('room', result.hostRoomUrl);
      $('wherebyFrame').replaceChildren(embed);
      $('roomPanel').hidden = false;
      $('status').textContent = 'החדר נוצר. אשר גישה למצלמה ולמיקרופון בדפדפן.';
    } catch (error) {
      $('status').textContent = error.message || 'לא ניתן להתחבר לשרת המקומי.';
      $('createMeeting').disabled = false;
    }
  });
  $('copyGuest').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('guestUrl').value);
      $('copyStatus').textContent = 'הקישור הועתק.';
    } catch (_) {
      $('guestUrl').select();
      $('copyStatus').textContent = 'הקישור סומן; העתק אותו ידנית.';
    }
  });
  $('leaveMeeting').addEventListener('click', () => {
    $('wherebyFrame').replaceChildren();
    $('roomPanel').hidden = true;
    $('createMeeting').disabled = false;
    $('status').textContent = 'הווידאו נסגר בדף. החדר אצל Whereby עדיין עשוי להיות פעיל.';
  });
})();
