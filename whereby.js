(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  $('createMeeting').addEventListener('click', async () => {
    $('createMeeting').disabled = true;
    $('status').textContent = 'יוצר חדר ניסיון…';
    try {
      const response = await fetch('/api/meetings', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'יצירת החדר נכשלה.');
      $('guestUrl').value = result.roomUrl;
      $('callId').textContent = result.callId;
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
