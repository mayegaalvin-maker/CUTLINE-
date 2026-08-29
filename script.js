const player = document.querySelector('#videoPlayer');
const frame = document.querySelector('#videoFrame');
const placeholder = document.querySelector('#videoPlaceholder');
const upload = document.querySelector('#videoUpload');
const playBtn = document.querySelector('#playBtn');
const playCenter = document.querySelector('#playCenter');
const selection = document.querySelector('#selection');
const playhead = document.querySelector('#playhead');
const timeReadout = document.querySelector('#timeReadout');
const durationChip = document.querySelector('#durationChip');
const toast = document.querySelector('#toast');
const track = document.querySelector('#timelineTrack');
const upgradeModal = document.querySelector('#upgradeModal');
const loginModal = document.querySelector('#loginModal');
const paymentForm = document.querySelector('#paymentForm');
const checkoutSuccess = document.querySelector('#checkoutSuccess');
const checkoutPrice = document.querySelector('#checkoutPrice');
const loginForm = document.querySelector('#loginForm');
const loginBtn = document.querySelector('#loginBtn');
const profileBtn = document.querySelector('#profileBtn');
const toggleAccountMode = document.querySelector('#toggleAccountMode');
// Hosted Fincra checkout link for card payments only.
const FINCRA_CHECKOUT_URL = 'https://checkout-sandbox.dev.fincra.com/payment-link/7465f526d592a38281259';
const SUBSCRIPTION_PRICE = '$10 / month';
const FREE_VIDEO_LIMIT = 3;
const usageKey = `cutline-uploads-${new Date().toISOString().slice(0, 10)}`;
const accountKey = 'cutline-account';
let dailyUploads = Number(localStorage.getItem(usageKey) || 0);
let clipStart = 14;
let clipEnd = 32;
let draggingHandle = null;
let toastTimer;

const formatTime = (seconds, precise = false) => {
  const safeSeconds = Math.max(0, seconds || 0);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toFixed(precise ? 2 : 0).padStart(precise ? 5 : 2, '0');
  return `${minutes}:${remainder}`;
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function updateFreeCounter() {
  const remaining = Math.max(0, FREE_VIDEO_LIMIT - dailyUploads);
  document.querySelector('#freeCounter').innerHTML = `<b>${remaining}</b> free video${remaining === 1 ? '' : 's'} today`;
}

function setClip(start, end) {
  clipStart = Math.max(0, Math.min(start, end - 1));
  clipEnd = Math.max(clipStart + 1, end);
  const sourceDuration = player.duration || 92.8;
  selection.style.left = `${(clipStart / sourceDuration) * 100}%`;
  selection.style.width = `${((clipEnd - clipStart) / sourceDuration) * 100}%`;
  playhead.style.left = `${(clipStart / sourceDuration) * 100 + 2}%`;
  timeReadout.textContent = `${formatTime(clipStart, true)} / ${formatTime(clipEnd, true)}`;
  durationChip.textContent = `${formatTime(clipEnd - clipStart, true)} clip`;
  if (player.src && player.currentTime < clipStart) player.currentTime = clipStart;
}

function selectMoment(start, end, source) {
  document.querySelectorAll('.signal-card').forEach(card => card.classList.toggle('active', card === source));
  document.querySelectorAll('.clip-item').forEach(item => item.classList.toggle('selected', item.dataset.start === String(start)));
  setClip(start, end);
}

function togglePlay() {
  if (!player.src) { showToast('Upload a video to start playing'); return; }
  if (player.paused) player.play(); else player.pause();
}

upload.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  if (dailyUploads >= FREE_VIDEO_LIMIT) {
    upload.value = '';
    upgradeModal.hidden = false;
    document.querySelector('#checkoutEmail').focus();
    showToast('You have used all 3 free videos today');
    return;
  }
  dailyUploads += 1;
  localStorage.setItem(usageKey, dailyUploads);
  updateFreeCounter();
  player.src = URL.createObjectURL(file);
  frame.classList.add('loaded');
  document.querySelector('#sourceName').textContent = file.name.replace(/\.[^/.]+$/, '');
  document.querySelector('#sourceMeta').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · local source`;
  document.querySelector('#projectTitle').textContent = file.name.replace(/\.[^/.]+$/, '').slice(0, 27);
  player.addEventListener('loadedmetadata', () => { document.querySelector('#endTime').textContent = formatTime(player.duration); setClip(clipStart, Math.min(clipEnd, player.duration)); }, { once: true });
  showToast('Video loaded. Find your first moment.');
});

[playBtn, playCenter].forEach(control => control.addEventListener('click', togglePlay));
player.addEventListener('play', () => { playBtn.textContent = 'Ⅱ'; playCenter.textContent = 'Ⅱ'; });
player.addEventListener('pause', () => { playBtn.textContent = '▶'; playCenter.textContent = '▶'; });
player.addEventListener('timeupdate', () => {
  if (!player.duration) return;
  playhead.style.left = `${(player.currentTime / player.duration) * 100}%`;
  timeReadout.textContent = `${formatTime(player.currentTime, true)} / ${formatTime(clipEnd, true)}`;
  if (player.currentTime >= clipEnd) { player.pause(); player.currentTime = clipStart; }
});

document.querySelectorAll('.skip-button').forEach(button => button.addEventListener('click', () => {
  if (player.src) player.currentTime = Math.max(0, player.currentTime + Number(button.dataset.skip));
}));
document.querySelectorAll('.signal-card').forEach(card => card.addEventListener('click', () => selectMoment(Number(card.dataset.start), Number(card.dataset.end), card)));
document.querySelectorAll('.clip-item').forEach(item => item.addEventListener('click', () => selectMoment(Number(item.dataset.start), Number(item.dataset.end), document.querySelector(`.signal-card[data-start="${item.dataset.start}"]`))));

document.querySelector('#exportBtn').addEventListener('click', () => showToast(`Clip ${formatTime(clipStart)}–${formatTime(clipEnd)} is ready to export`));
document.querySelector('#resetBtn').addEventListener('click', () => { setClip(14, 32); showToast('Selection reset to suggested moment'); });
document.querySelector('#newProjectBtn').addEventListener('click', () => { upload.value = ''; player.removeAttribute('src'); player.load(); frame.classList.remove('loaded'); document.querySelector('#projectTitle').textContent = 'Untitled project'; showToast('New project ready'); });
document.querySelector('#scanBtn').addEventListener('click', () => { const label = document.querySelector('#scanLabel'); label.textContent = 'Scanning audio + video...'; setTimeout(() => { label.textContent = 'Scan complete · 3 moments found'; showToast('No new high-signal moments found'); }, 1200); });

function moveHandle(event) {
  if (!draggingHandle) return;
  const bounds = track.getBoundingClientRect();
  const sourceDuration = player.duration || 92.8;
  const nextTime = Math.max(0, Math.min(sourceDuration, ((event.clientX - bounds.left) / bounds.width) * sourceDuration));
  if (draggingHandle === 'left') setClip(nextTime, clipEnd); else setClip(clipStart, nextTime);
}
track.addEventListener('pointermove', moveHandle);
track.addEventListener('pointerup', () => { draggingHandle = null; });
track.addEventListener('pointerleave', () => { draggingHandle = null; });
document.querySelector('#leftHandle').addEventListener('pointerdown', event => { draggingHandle = 'left'; event.stopPropagation(); });
document.querySelector('#rightHandle').addEventListener('pointerdown', event => { draggingHandle = 'right'; event.stopPropagation(); });
track.addEventListener('click', event => { if (event.target !== track && event.target !== document.querySelector('.waveform')) return; const bounds = track.getBoundingClientRect(); const sourceDuration = player.duration || 92.8; const position = ((event.clientX - bounds.left) / bounds.width) * sourceDuration; if (player.src) player.currentTime = position; });

function closeCheckout() {
  upgradeModal.hidden = true;
  paymentForm.hidden = false;
  checkoutSuccess.hidden = true;
}

function closeLogin() {
  loginModal.hidden = true;
  loginForm.reset();
}

function syncAccountState() {
  const account = JSON.parse(localStorage.getItem(accountKey) || 'null');
  if (account) {
    profileBtn.textContent = account.name ? account.name.slice(0, 2).toUpperCase() : 'AC';
    loginBtn.textContent = 'Account';
    profileBtn.title = account.email || 'Account';
  } else {
    profileBtn.textContent = 'JD';
    loginBtn.textContent = 'Log in';
    profileBtn.title = 'Profile';
  }
}

document.querySelector('#upgradeBtn').addEventListener('click', () => { upgradeModal.hidden = false; document.querySelector('#checkoutEmail').focus(); });
document.querySelector('#loginBtn').addEventListener('click', () => { loginModal.hidden = false; document.querySelector('#loginEmail').focus(); });
document.querySelector('#profileBtn').addEventListener('click', () => {
  const account = JSON.parse(localStorage.getItem(accountKey) || 'null');
  if (account) {
    showToast(`Signed in as ${account.email}`);
    return;
  }
  loginModal.hidden = false;
  document.querySelector('#loginEmail').focus();
});
document.querySelector('#closeModal').addEventListener('click', closeCheckout);
document.querySelector('#closeLoginModal').addEventListener('click', closeLogin);
document.querySelector('#successClose').addEventListener('click', closeCheckout);
upgradeModal.addEventListener('click', event => { if (event.target === upgradeModal) closeCheckout(); });
loginModal.addEventListener('click', event => { if (event.target === loginModal) closeLogin(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!upgradeModal.hidden) closeCheckout(); if (!loginModal.hidden) closeLogin(); } });
document.querySelectorAll('.plan-option').forEach(option => option.addEventListener('click', () => {
  document.querySelectorAll('.plan-option').forEach(item => item.classList.toggle('active', item === option));
  checkoutPrice.textContent = SUBSCRIPTION_PRICE;
}));
checkoutPrice.textContent = SUBSCRIPTION_PRICE;
paymentForm.addEventListener('submit', event => {
  event.preventDefault();
  if (FINCRA_CHECKOUT_URL) { window.location.href = FINCRA_CHECKOUT_URL; return; }
  paymentForm.hidden = true;
  checkoutSuccess.hidden = false;
  showToast('Checkout complete');
});

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = document.querySelector('#loginEmail').value.trim();
  const password = document.querySelector('#loginPassword').value.trim();
  if (!email || !password) {
    showToast('Please enter your email and password');
    return;
  }

  const account = { email, name: email.split('@')[0], password };
  localStorage.setItem(accountKey, JSON.stringify(account));
  syncAccountState();
  closeLogin();
  showToast('Welcome back. Your account is ready.');
});

toggleAccountMode.addEventListener('click', () => {
  const formTitle = document.querySelector('#loginTitle');
  const submitText = document.querySelector('#loginSubmit');
  const mode = toggleAccountMode.textContent.trim().toLowerCase();
  if (mode === 'create one') {
    formTitle.textContent = 'Create your account.';
    submitText.textContent = 'Create account';
    toggleAccountMode.textContent = 'Log in';
  } else {
    formTitle.textContent = 'Welcome back.';
    submitText.textContent = 'Log in to account';
    toggleAccountMode.textContent = 'Create one';
  }
});

setClip(clipStart, clipEnd);
updateFreeCounter();
syncAccountState();
