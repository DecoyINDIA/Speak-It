const orb = document.getElementById('orb');
const label = document.getElementById('label');

window.api.onUpdateState((state) => {
  orb.className = 'orb'; // Clear all state classes
  
  if (state === 'listening') {
    orb.classList.add('pulsing');
    label.innerText = 'Listening...';
  } else if (state === 'processing') {
    orb.classList.add('spinning');
    label.innerText = 'Processing...';
  } else if (state === 'success') {
    orb.classList.add('success');
    label.innerText = 'Done!';
  } else if (state === 'error') {
    orb.classList.add('error');
    label.innerText = 'Error!';
  }
});
