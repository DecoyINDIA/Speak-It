const orb = document.getElementById('orb');
const label = document.getElementById('label');
const badge = document.getElementById('badge');
const bars = document.querySelectorAll('.bar');

window.api.onUpdateState((state, meta) => {
  orb.className = 'orb'; // Clear all state classes
  
  if (state === 'listening') {
    orb.classList.add('pulsing');
    label.innerText = 'Listening...';
    bars.forEach(b => b.classList.add('active-bar'));
    if (meta && meta.mode) {
      badge.innerText = meta.mode;
      badge.classList.add('active');
    } else {
      badge.classList.remove('active');
    }
  } else if (state === 'processing') {
    orb.classList.add('spinning');
    label.innerText = 'Processing...';
    bars.forEach(b => {
      b.classList.remove('active-bar');
      b.style.height = '4px';
    });
  } else if (state === 'success') {
    orb.classList.add('success');
    label.innerText = 'Done!';
    if (meta && meta.language) {
      badge.innerText = meta.language;
      badge.classList.add('active');
    }
  } else if (state === 'error') {
    orb.classList.add('error');
    label.innerText = 'Error!';
    bars.forEach(b => {
      b.classList.remove('active-bar');
      b.style.height = '4px';
    });
  }
});

// React to live audio volume levels from AudioWorklet
window.api.onAudioLevel((level) => {
  // level is normalized between 0.0 and 1.0
  const heights = [
    Math.max(4, Math.floor(level * 14)),
    Math.max(4, Math.floor(level * 18)),
    Math.max(4, Math.floor(level * 16)),
    Math.max(4, Math.floor(level * 12)),
    Math.max(4, Math.floor(level * 8))
  ];

  bars.forEach((bar, idx) => {
    bar.style.height = `${heights[idx]}px`;
  });
});
