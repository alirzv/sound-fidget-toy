/* ==========================================================================
   VIBEPAD - TACTILE SOUND FIDGET - APPLICATION LOGIC
   ========================================================================== */

// App State
const state = {
  activeTab: 'animals',
  activeSoundId: 'cat',
  isPlaying: false,
  hapticsEnabled: true,
  loopEnabled: false,
  bgKeepAlive: false,
  audioContext: null,
  activeAudioElement: null,
  keepAliveOscillator: null,
  keepAliveGain: null,
  currentPitch: 440,
  currentResonance: 1200,
  fadeTimeout: null,
  fadeInterval: null
};

// Sound Databases
const soundLibrary = {
  animals: [
    { id: 'bird', name: 'Cute Tweet', emoji: '🐤', url: 'https://upload.wikimedia.org/wikipedia/commons/4/45/30goldfinch.ogg' },
    { id: 'sheep', name: 'Sheep Bleat', emoji: '🐑', url: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Sheep_bleating.ogg' },
    { id: 'cricket', name: 'Cricket', emoji: '🦗', url: './sounds/cricket.mp3' },
    { id: 'duck', name: 'Duck Quack', emoji: '🦆', url: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Mallard_%28Anas_platyrhynchos%29_%28W1CDR0001518_BD17%29.ogg' },
    { id: 'frog', name: 'Frog Ripit', emoji: '🐸', url: './sounds/frog.mp3' }
  ],
  synth: [
    { id: 'laser', name: 'Laser Blip', emoji: '👾', type: 'synth' },
    { id: 'coin', name: 'Retro Coin', emoji: '🪙', type: 'synth' },
    { id: 'zap', name: 'Zap Rise', emoji: '⚡', type: 'synth' },
    { id: 'bass', name: 'Sub Wobble', emoji: '🔊', type: 'synth' },
    { id: 'police', name: 'Police Car', emoji: '🚨', url: './sounds/police.mp3' }
  ],
  zen: [
    { id: 'bowl', name: 'Tibetan Bowl', emoji: '🥣', type: 'synth' },
    { id: 'bell', name: 'Ting Bell', emoji: '🔔', type: 'synth' },
    { id: 'gong', name: 'Zen Gong', emoji: '🧘', type: 'synth' },
    { id: 'om', name: 'Ambient Hum', emoji: '🕉️', type: 'synth' }
  ]
};

// DOM References
const fidgetButton = document.getElementById('fidgetButton');
const visualizerRing = document.getElementById('visualizerRing');
const soundWaveGlow = document.getElementById('soundWaveGlow');
const activeCategoryLabel = document.getElementById('activeCategory');
const activeSoundNameLabel = document.getElementById('activeSoundName');
const sliderPitch = document.getElementById('sliderPitch');
const sliderResonance = document.getElementById('sliderResonance');
const valPitch = document.getElementById('valPitch');
const valResonance = document.getElementById('valResonance');
const synthControls = document.getElementById('synthControls');
const hapticToggle = document.getElementById('hapticToggle');
const loopToggle = document.getElementById('loopToggle');
const bgKeepAliveToggle = document.getElementById('bgKeepAliveToggle');
const installBanner = document.getElementById('installBanner');
const btnInstall = document.getElementById('btnInstall');
const navTabs = document.querySelectorAll('.nav-tab');

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered successfully!', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// PWA Install Prompt Event Handling
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.classList.remove('hidden');
});

btnInstall.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);
  deferredPrompt = null;
  installBanner.classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  console.log('SoundClick app installed successfully!');
  installBanner.classList.add('hidden');
});

/* ==========================================================================
   Sound Engine Initialization
   ========================================================================== */

function getAudioContext() {
  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
  return state.audioContext;
}

// Preloaded Audio Objects cache for sound packs
const audioCache = {};
function preloadAudioAssets() {
  Object.keys(soundLibrary).forEach(tabId => {
    soundLibrary[tabId].forEach(sound => {
      if (sound.url) {
        const audio = new Audio();
        audio.src = sound.url;
        audio.preload = 'auto';
        audio.crossOrigin = 'anonymous';
        audioCache[sound.id] = audio;
      }
    });
  });
}
preloadAudioAssets();

/* ==========================================================================
   Tactile & Haptic Effects
   ========================================================================== */

function triggerVibration(duration = 15) {
  if (state.hapticsEnabled && 'vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

// Add visual ripple animations on play
function startVisualizerEffects() {
  fidgetButton.classList.add('playing');
  visualizerRing.classList.add('animating');
  soundWaveGlow.classList.add('animating');
}

function stopVisualizerEffects() {
  fidgetButton.classList.remove('playing');
  visualizerRing.classList.remove('animating');
  soundWaveGlow.classList.remove('animating');
}

/* ==========================================================================
   Web Audio API Synthesizers
   ========================================================================== */

// 1. Chiptune Fidget Synth Sounds
function playChiptuneSynth(id, ctx) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gainNode = ctx.createGain();

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;
  const baseFreq = state.currentPitch;
  const filterCutoff = state.currentResonance;

  filter.type = 'lowpass';
  filter.Q.value = 8;
  filter.frequency.setValueAtTime(filterCutoff, now);

  if (id === 'laser') {
    // Laser Sound: Fast downward sweep
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 2.5, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.2, now + 0.35);
    
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.36);
  } 
  else if (id === 'coin') {
    // Coin Sound: Arpeggio (double pitch step)
    osc.type = 'square';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.5, now + 0.08);
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.setValueAtTime(0.3, now + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.31);
  } 
  else if (id === 'zap') {
    // Zap sound: Ultra fast pitch rising
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.4, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 3.0, now + 0.15);
    
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.16);
  } 
  else if (id === 'bass') {
    // Bass Drop & Wobble (LFO filter frequency)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 0.6, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.65);
    
    // Animate filter cutoff (Wobble)
    filter.frequency.setValueAtTime(filterCutoff, now);
    filter.frequency.linearRampToValueAtTime(filterCutoff * 0.1, now + 0.2);
    filter.frequency.linearRampToValueAtTime(filterCutoff * 0.5, now + 0.4);
    filter.frequency.linearRampToValueAtTime(20, now + 0.65);
    
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
    
    osc.start(now);
    osc.stop(now + 0.66);
  }

  // Handle visual effects timing
  const duration = id === 'bass' ? 650 : id === 'coin' ? 300 : 350;
  startVisualizerEffects();
  setTimeout(() => {
    if (!state.isPlaying) stopVisualizerEffects();
  }, duration);
}

// 2. Zen Bells & Bowls (Additive Harmonics Synthesizer)
function playZenSynth(id, ctx) {
  const now = ctx.currentTime;
  const baseFreq = state.currentPitch * 0.7; // shift lower for calming vibes
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  
  startVisualizerEffects();

  if (id === 'bowl') {
    // Tibetan Singing Bowl: 5 harmonic sine waves playing together with differing delays and decay speeds
    const partials = [1.0, 1.98, 2.82, 3.86, 4.90];
    const gains = [0.4, 0.25, 0.15, 0.1, 0.05];
    const duration = 3.5; // Long ring

    masterGain.gain.setValueAtTime(0.4, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    partials.forEach((ratio, index) => {
      const osc = ctx.createOscillator();
      const nodeGain = ctx.createGain();
      
      osc.type = 'sine';
      // Add slight detune for richness
      osc.frequency.setValueAtTime(baseFreq * ratio + (Math.random() * 2 - 1), now);
      
      nodeGain.gain.setValueAtTime(gains[index], now);
      nodeGain.gain.exponentialRampToValueAtTime(0.001, now + duration * (1 - index * 0.15));

      osc.connect(nodeGain);
      nodeGain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => stopVisualizerEffects(), duration * 1000);
  } 
  else if (id === 'bell') {
    // High-pitched crystal bell sound
    const partials = [1.0, 2.0, 3.0, 4.1];
    const gains = [0.4, 0.2, 0.1, 0.05];
    const duration = 2.0;

    masterGain.gain.setValueAtTime(0.5, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    partials.forEach((ratio, index) => {
      const osc = ctx.createOscillator();
      const nodeGain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 2.0 * ratio, now); // Shift register higher
      
      nodeGain.gain.setValueAtTime(gains[index], now);
      nodeGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.3 * (4 - index));

      osc.connect(nodeGain);
      nodeGain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => stopVisualizerEffects(), duration * 1000);
  } 
  else if (id === 'gong') {
    // Deep Zen Gong
    const duration = 4.0;
    masterGain.gain.setValueAtTime(0.6, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Deep metallic blend (triangle + sawtooth + sine)
    const waves = ['triangle', 'sine', 'sawtooth'];
    const freqs = [baseFreq * 0.5, baseFreq * 1.01, baseFreq * 1.5];
    const gains = [0.4, 0.3, 0.1];

    waves.forEach((type, index) => {
      const osc = ctx.createOscillator();
      const nodeGain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freqs[index], now);
      
      // Filter out high hiss
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      
      nodeGain.gain.setValueAtTime(gains[index], now);
      nodeGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(nodeGain);
      nodeGain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => stopVisualizerEffects(), duration * 1000);
  }
  else if (id === 'om') {
    // Ambient Continuous Monotonous Om (Drone)
    const duration = 5.0;
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.5, now + 1.0); // Slow fade-in
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const freqs = [65.41, 130.81, 196.2]; // C2, C3, G3
    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const nodeGain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      // Smooth out
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      
      nodeGain.gain.setValueAtTime(0.2, now);
      
      osc.connect(filter);
      filter.connect(nodeGain);
      nodeGain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + duration);
    });

    setTimeout(() => stopVisualizerEffects(), duration * 1000);
  }
}

// 3. Synthesized Frog Ripit Fidget Croak
function playFrogRibbit(ctx) {
  const now = ctx.currentTime;
  
  // A frog "ribbit/ripit" is a quick double-pulse clicking sound.
  // We combine a bandpass filter with a modulated triangle wave to get a clicky mechanical croak.
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 5;
  filter.frequency.setValueAtTime(800, now);
  filter.connect(ctx.destination);

  function triggerPulse(startTime, duration, startFreq, endFreq) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
    
    // Vocal cord texture vibrato/LFO modulation
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(45, startTime);
    lfoGain.gain.setValueAtTime(120, startTime); // frequency swing width
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(filter);
    
    lfo.start(startTime);
    osc.start(startTime);
    
    lfo.stop(startTime + duration);
    osc.stop(startTime + duration);
  }

  // Quick double pulse (rip-it!)
  triggerPulse(now, 0.07, 180, 220);          // first click pulse
  triggerPulse(now + 0.10, 0.12, 190, 140);   // second croak pulse

  startVisualizerEffects();
  setTimeout(() => {
    if (!state.isPlaying) stopVisualizerEffects();
  }, 300);
}

/* ==========================================================================
   Sound Playback Manager
   ========================================================================== */

function playActiveSound() {
  const ctx = getAudioContext();
  triggerVibration(18);

  const pack = soundLibrary[state.activeTab];
  const soundItem = pack.find(s => s.id === state.activeSoundId);
  if (!soundItem) return;

  state.isPlaying = true;

  // Clear any existing 2-second fade-out timers
  if (state.fadeTimeout) {
    clearTimeout(state.fadeTimeout);
    state.fadeTimeout = null;
  }
  if (state.fadeInterval) {
    clearInterval(state.fadeInterval);
    state.fadeInterval = null;
  }

  // Stop any active HTML5 audio element
  if (state.activeAudioElement) {
    state.activeAudioElement.pause();
    state.activeAudioElement.volume = 1.0;
    state.activeAudioElement.currentTime = 0;
  }

  // Handle sound types
  if (soundItem.url) {
    // HTML5 Audio playback (enforcing the 2-second limit fade-out)
    let audio = audioCache[soundItem.id];
    if (!audio) {
      audio = new Audio(soundItem.url);
      audioCache[soundItem.id] = audio;
    }
    
    state.activeAudioElement = audio;
    audio.loop = false; // Managed programmatically to strictly respect 2-second limits
    audio.volume = 1.0;
    audio.currentTime = 0;
    
    startVisualizerEffects();
    audio.play()
      .then(() => {
        updateMediaSessionPlayback('playing');
      })
      .catch(err => {
        console.error('Audio play blocked:', err);
        stopVisualizerEffects();
        state.isPlaying = false;
      });

    // Strict 2-second limit fade-out wrapper
    state.fadeTimeout = setTimeout(() => {
      const fadeSteps = 10;
      const intervalTime = 30; // 30ms * 10 = 300ms total fadeout duration
      let currentStep = fadeSteps;
      
      state.fadeInterval = setInterval(() => {
        currentStep--;
        if (currentStep <= 0) {
          clearInterval(state.fadeInterval);
          state.fadeInterval = null;
          audio.volume = 0;
          audio.pause();
          audio.currentTime = 0;
          
          if (!state.loopEnabled) {
            stopVisualizerEffects();
            state.isPlaying = false;
            updateMediaSessionPlayback('paused');
          } else if (state.isPlaying && state.loopEnabled) {
            // Loop: restart immediately
            playActiveSound();
          }
        } else {
          audio.volume = currentStep / fadeSteps;
        }
      }, intervalTime);
    }, 1700); // Start fade-out at 1.7 seconds, ending exactly at 2.0 seconds

    audio.onended = () => {
      if (state.fadeTimeout) {
        clearTimeout(state.fadeTimeout);
        state.fadeTimeout = null;
      }
      if (state.fadeInterval) {
        clearInterval(state.fadeInterval);
        state.fadeInterval = null;
      }
      audio.volume = 1.0;
      audio.currentTime = 0;

      if (!state.loopEnabled) {
        stopVisualizerEffects();
        state.isPlaying = false;
        updateMediaSessionPlayback('paused');
      } else if (state.isPlaying && state.loopEnabled) {
        playActiveSound();
      }
    };
  } else {
    // Synthesized playback (No URL defined)
    if (state.activeTab === 'animals' && soundItem.id === 'frog') {
      // Frog synthesized croaker
      playFrogRibbit(ctx);
      
      const duration = 280; // ms duration of ribbit double-pulse
      setTimeout(() => {
        if (!state.loopEnabled) {
          stopVisualizerEffects();
          state.isPlaying = false;
          updateMediaSessionPlayback('paused');
        } else if (state.isPlaying && state.activeSoundId === 'frog') {
          // Loop frog sound by playing again after 500ms gap
          setTimeout(() => {
            if (state.isPlaying && state.activeSoundId === 'frog' && state.loopEnabled) {
              playActiveSound();
            }
          }, 400);
        }
      }, duration);
    } 
    else if (state.activeTab === 'synth') {
      playChiptuneSynth(soundItem.id, ctx);
    } 
    else if (state.activeTab === 'zen') {
      playZenSynth(soundItem.id, ctx);
    }
  }

  // Sync Mobile Media Session display cards
  updateMediaSessionMetadata(soundItem);
}

function stopActiveSound() {
  state.isPlaying = false;
  stopVisualizerEffects();
  
  if (state.fadeTimeout) {
    clearTimeout(state.fadeTimeout);
    state.fadeTimeout = null;
  }
  if (state.fadeInterval) {
    clearInterval(state.fadeInterval);
    state.fadeInterval = null;
  }

  if (state.activeAudioElement) {
    state.activeAudioElement.pause();
    state.activeAudioElement.volume = 1.0;
    state.activeAudioElement.currentTime = 0;
  }
  updateMediaSessionPlayback('paused');
}

/* ==========================================================================
   Persistent Lock Screen Controls (Media Session API)
   ========================================================================== */

// Keep-Alive audio loop tricks to lock the OS widget visible on screen.
// We play an ultra-low volume, sub-audible hum that loops continuously.
function startLockWidgetKeepAlive() {
  if (!state.bgKeepAlive) return;
  const ctx = getAudioContext();
  
  if (state.keepAliveOscillator) return; // Already running

  state.keepAliveOscillator = ctx.createOscillator();
  state.keepAliveGain = ctx.createGain();

  // Create an inaudible 2Hz LFO hum at 0.001 volume
  state.keepAliveOscillator.type = 'sine';
  state.keepAliveOscillator.frequency.setValueAtTime(2, ctx.currentTime);
  state.keepAliveGain.gain.setValueAtTime(0.001, ctx.currentTime);

  state.keepAliveOscillator.connect(state.keepAliveGain);
  state.keepAliveGain.connect(ctx.destination);
  
  state.keepAliveOscillator.start();
  console.log('Background Keep-Alive engine initialized.');
}

function stopLockWidgetKeepAlive() {
  if (state.keepAliveOscillator) {
    try {
      state.keepAliveOscillator.stop();
      state.keepAliveOscillator.disconnect();
    } catch(e){}
    state.keepAliveOscillator = null;
    state.keepAliveGain = null;
    console.log('Background Keep-Alive engine terminated.');
  }
}

function updateMediaSessionMetadata(soundItem) {
  if ('mediaSession' in navigator) {
    let categoryName = "Animals";
    if (state.activeTab === 'synth') categoryName = "Chiptune Synthesizer";
    if (state.activeTab === 'zen') categoryName = "Zen Bowls";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: soundItem.name,
      artist: "SoundClick Fidget",
      album: categoryName,
      artwork: [
        { src: 'assets/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
      ]
    });
    
    // Register actions for lockscreen remote buttons
    setupMediaSessionActions();
  }
}

function updateMediaSessionPlayback(playbackState) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = playbackState;
  }
}

function setupMediaSessionActions() {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.setActionHandler('play', () => {
    playActiveSound();
  });

  navigator.mediaSession.setActionHandler('pause', () => {
    stopActiveSound();
  });

  navigator.mediaSession.setActionHandler('previoustrack', () => {
    cycleSound(-1);
  });

  navigator.mediaSession.setActionHandler('nexttrack', () => {
    cycleSound(1);
  });
}

// Cycle sounds sequentially (for lock screen skip keys)
function cycleSound(direction) {
  const pack = soundLibrary[state.activeTab];
  const currentIndex = pack.findIndex(s => s.id === state.activeSoundId);
  let nextIndex = currentIndex + direction;

  if (nextIndex >= pack.length) nextIndex = 0;
  if (nextIndex < 0) nextIndex = pack.length - 1;

  const nextSound = pack[nextIndex];
  selectSoundCard(state.activeTab, nextSound.id);
  playActiveSound();
}

/* ==========================================================================
   UI Controls & Navigation
   ========================================================================== */

function selectSoundCard(tabId, soundId) {
  state.activeSoundId = soundId;
  
  // Highlight active card
  document.querySelectorAll('.sound-card').forEach(card => {
    card.classList.remove('selected');
    if (card.dataset.soundId === soundId) {
      card.classList.add('selected');
    }
  });

  // Update labels
  const pack = soundLibrary[tabId];
  const soundItem = pack.find(s => s.id === soundId);
  activeSoundNameLabel.textContent = `${soundItem.emoji} ${soundItem.name}`;
}

function renderSoundPackGrid(tabId) {
  const container = document.getElementById(`pack-${tabId}`);
  container.innerHTML = ''; // Clear

  const sounds = soundLibrary[tabId];
  sounds.forEach(sound => {
    const card = document.createElement('div');
    card.className = `sound-card ${sound.id === state.activeSoundId ? 'selected' : ''}`;
    card.dataset.soundId = sound.id;
    card.innerHTML = `
      <div class="card-icon-container">${sound.emoji}</div>
      <span>${sound.name}</span>
    `;

    card.addEventListener('click', () => {
      triggerVibration(12);
      selectSoundCard(tabId, sound.id);
      playActiveSound();
    });

    container.appendChild(card);
  });
}

function switchTab(targetTabId) {
  state.activeTab = targetTabId;
  
  // Update Tab Navigation classes
  navTabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === targetTabId) {
      tab.classList.add('active');
    }
  });

  // Display correct content grids
  document.querySelectorAll('.sound-pack-grid').forEach(grid => {
    grid.classList.remove('active');
  });
  document.getElementById(`pack-${targetTabId}`).classList.add('active');

  // Show/Hide sliders for synthesizer modes
  if (targetTabId === 'animals') {
    synthControls.style.display = 'none';
    activeCategoryLabel.textContent = 'Animals';
  } else {
    synthControls.style.display = 'block';
    activeCategoryLabel.textContent = targetTabId === 'synth' ? 'Chiptune Synth' : 'Zen Chimes';
  }

  // Pre-select first item of the pack
  const firstSound = soundLibrary[targetTabId][0];
  selectSoundCard(targetTabId, firstSound.id);
}

/* ==========================================================================
   Event Listener Setup
   ========================================================================== */

// Big Fidget Button Triggers
fidgetButton.addEventListener('click', () => {
  if (state.isPlaying && state.activeTab === 'animals' && state.loopEnabled) {
    // If looping animals, a press stops it
    stopActiveSound();
  } else {
    playActiveSound();
  }
});

// Sound morphing sliders
sliderPitch.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  state.currentPitch = val;
  valPitch.textContent = `${val} Hz`;
  triggerVibration(5); // Ultra small tick to feel slider movement
});

sliderResonance.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  state.currentResonance = val;
  valResonance.textContent = `${val} Hz`;
  triggerVibration(5);
});

// Category Tab buttons
navTabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    triggerVibration(15);
    const targetTab = e.target.dataset.tab;
    switchTab(targetTab);
  });
});

// Option Toggles
hapticToggle.addEventListener('change', (e) => {
  state.hapticsEnabled = e.target.checked;
  triggerVibration(20);
});

loopToggle.addEventListener('change', (e) => {
  state.loopEnabled = e.target.checked;
  if (state.activeAudioElement) {
    state.activeAudioElement.loop = state.loopEnabled;
  }
  triggerVibration(15);
});

bgKeepAliveToggle.addEventListener('change', (e) => {
  state.bgKeepAlive = e.target.checked;
  triggerVibration(15);
  if (state.bgKeepAlive) {
    startLockWidgetKeepAlive();
  } else {
    stopLockWidgetKeepAlive();
  }
});

// Initialize rendering on load
window.addEventListener('DOMContentLoaded', () => {
  // Render all packs once
  renderSoundPackGrid('animals');
  renderSoundPackGrid('synth');
  renderSoundPackGrid('zen');

  // Pre-select Animals Category
  switchTab('animals');
});
