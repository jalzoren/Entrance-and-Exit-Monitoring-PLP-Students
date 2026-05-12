// audioUtils.js
// Plays a short beep and optionally speaks a message

let audioContext = null;

// Initialize AudioContext on first user interaction (browsers require user gesture)
function getAudioContext() {
  if (!audioContext && window.AudioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a short beep sound.
 * @param {number} duration - Beep duration in ms (default: 200)
 * @param {number} frequency - Frequency in Hz (default: 880)
 * @param {number} volume - 0 to 1 (default: 0.3)
 */
export function playBeep(duration = 200, frequency = 880, volume = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume if suspended (browser auto-suspend policy)
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      beep(ctx, duration, frequency, volume);
    }).catch(e => console.warn('AudioContext resume failed:', e));
  } else {
    beep(ctx, duration, frequency, volume);
  }
}

function beep(ctx, duration, frequency, volume) {
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;

  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.00001, now + duration / 1000);
  oscillator.stop(now + duration / 1000);
}

/**
 * Speak a message using browser's speech synthesis.
 * @param {string} message - Text to speak.
 */
export function speakMessage(message) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.cancel(); // stop any ongoing speech
  window.speechSynthesis.speak(utterance);
}

/**
 * Play error feedback: low beep + voice speaks the error message.
 * @param {string} errorMessage - The error text to speak (e.g. "You've already entered the school.")
 */
export function playErrorSound(errorMessage) {
  playBeep(400, 440, 0.4); // lower frequency, longer beep for error
  speakMessage(errorMessage);
}

/**
 * Play success feedback: beep + voice announcement.
 * @param {string} action - 'ENTRY' or 'EXIT'
 * @param {string} studentName - optional student name (for voice)
 */
export function playEntryExitSuccess(action, studentName = '') {
  playBeep(180, action === 'ENTRY' ? 880 : 660, 0.35);
  const announcement = action === 'ENTRY' ? 'Entry recorded' : 'Exit recorded';
  // optional: include name
  // speakMessage(`${announcement}, ${studentName}`);
  speakMessage(announcement);
}

// -------------------------------------------------------------
// Pre‑recorded voice messages
// -------------------------------------------------------------

const audioCache = new Map();

/**
 * Load and cache an audio file.
 * @param {string} filename - e.g. 'entry_recorded.mp3'
 * @returns {Promise<HTMLAudioElement>}
 */
function loadAudio(filename) {
  if (audioCache.has(filename)) {
    return Promise.resolve(audioCache.get(filename));
  }
  const audio = new Audio(`/sounds/${filename}`);
  const promise = new Promise((resolve, reject) => {
    audio.addEventListener('canplaythrough', () => {
      audioCache.set(filename, audio);
      resolve(audio);
    });
    audio.addEventListener('error', (e) => reject(e));
  });
  audio.load();
  return promise;
}

/**
 * Play a pre‑recorded voice message.
 * @param {string} filename
 */
export function playVoiceMessage(filename) {
  loadAudio(filename)
    .then(audio => {
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('Audio play failed:', e));
    })
    .catch(e => console.error('Failed to load audio:', filename, e));
}

// Convenience functions for your events
export function playEntryRecorded() {
  playVoiceMessage('entry_recorded.mp3');
  playBeep(180, 880, 0.35);
}

export function playExitRecorded() {
  playVoiceMessage('exit_recorded.mp3');
  playBeep(180, 660, 0.35);
}

export function playAlreadyEntered() {
  playVoiceMessage('already_entered.mp3');
  playBeep(400, 440, 0.4);
}

export function playAlreadyExited() {
  playVoiceMessage('already_exited.mp3');
  playBeep(400, 440, 0.4);
}

export function playNoEntryRecord() {
  playVoiceMessage('no_entry_record.mp3');
  playBeep(400, 440, 0.4);
}

export function playVisitorPassIssued() {
  playVoiceMessage('visitor_pass_issued.mp3');
  playBeep(300, 660, 0.35);
}