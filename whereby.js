(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
    $('status').textContent = 'בדף הבא לחץ על ״צור קישור לפגישה״. ייתכן שהמארח יתבקש להתחבר ל־Jitsi כדי להתחיל בשיחה.';
    return;
  }
  $('publicMeeting').hidden = true;
  $('createMeeting').hidden = false;
  $('meetingProvider').textContent = 'Whereby Embedded / בדיקה טכנית';
  $('meetingHeading').textContent = 'צור חדר Whereby לניסיון';
  $('meetingIntro').textContent = 'חדר Whereby נוצר באמצעות שרת מקומי ששומר את מפתח ה־API מחוץ לדפדפן.';
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
