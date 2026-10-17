(function() {
  'use strict';

  // State Management
  const state = {
    currentScreen: 'landing',
    spinsCount: 0,
    saldo: 0,
    isTurbo: false,
    isAutoSpin: false,

  };

  const ASSETS = {
    symbols: [
      'images/tangerina.png',
      'images/fogos.png',
      'images/envelope.png',
      'images/saco.png',
      'images/dragao.png',
      'images/ovos.png',
      'images/wild_new.png'
    ],
    payouts: [
      { amount: 5000, type: 'GRANDE GANHO', grid: [['images/saco.png', 'images/saco.png', 'images/saco.png'], ['images/fogos.png', 'images/ovos.png', 'images/envelope.png'], ['images/tangerina.png', 'images/wild_new.png', 'images/fogos.png']] },
      { amount: 8000, type: 'GRANDE GANHO', grid: [['images/envelope.png', 'images/ovos.png', 'images/tangerina.png'], ['images/fogos.png', 'images/fogos.png', 'images/fogos.png'], ['images/wild_new.png', 'images/saco.png', 'images/envelope.png']] },
      { amount: 10000, type: 'MEGA GANHO', grid: [['images/ovos.png', 'images/fogos.png', 'images/envelope.png'], ['images/tangerina.png', 'images/wild_new.png', 'images/saco.png'], ['images/ovos.png', 'images/ovos.png', 'images/ovos.png']] },
      { amount: 12000, type: 'MEGA GANHO', grid: [['images/dragao.png', 'images/envelope.png', 'images/fogos.png'], ['images/dragao.png', 'images/ovos.png', 'images/saco.png'], ['images/dragao.png', 'images/wild_new.png', 'images/envelope.png']] },
      { amount: 15000, type: 'MEGA GANHO', grid: [['images/fogos.png', 'images/wild_new.png', 'images/ovos.png'], ['images/envelope.png', 'images/wild_new.png', 'images/saco.png'], ['images/tangerina.png', 'images/wild_new.png', 'images/fogos.png']] },
      { amount: 5000, type: 'GRANDE GANHO', grid: [['images/envelope.png', 'images/ovos.png', 'images/saco.png'], ['images/fogos.png', 'images/envelope.png', 'images/tangerina.png'], ['images/wild_new.png', 'images/fogos.png', 'images/envelope.png']] },
      { amount: 10000, type: 'MEGA GANHO', grid: [['images/tangerina.png', 'images/fogos.png', 'images/wild_new.png'], ['images/ovos.png', 'images/wild_new.png', 'images/saco.png'], ['images/wild_new.png', 'images/envelope.png', 'images/ovos.png']] },
      { amount: 20000, type: 'MEGA GANHO', grid: [['images/dragao.png', 'images/dragao.png', 'images/dragao.png'], ['images/dragao.png', 'images/wild_new.png', 'images/dragao.png'], ['images/envelope.png', 'images/fogos.png', 'images/ovos.png']] },
      { amount: 15000, type: 'MEGA GANHO', grid: [['images/wild_new.png', 'images/fogos.png', 'images/tangerina.png'], ['images/wild_new.png', 'images/saco.png', 'images/ovos.png'], ['images/wild_new.png', 'images/envelope.png', 'images/fogos.png']] },
      { amount: 30000, type: 'SUPER MEGA GANHO', grid: [['images/wild_new.png', 'images/wild_new.png', 'images/wild_new.png'], ['images/wild_new.png', 'images/wild_new.png', 'images/wild_new.png'], ['images/wild_new.png', 'images/wild_new.png', 'images/wild_new.png']] }
    ]
  };

  // ── Sound Engine (Web Audio API — no external files) ──────────────────────
  let _audioCtx = null;

  function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
  }

  // Mechanical reel tick (short noise burst)
  function playReelTick() {
    try {
      const ctx = getAudioCtx();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch(e) {}
  }

  // Continuous reel spin sound (repeated ticks for duration ms)
  let _spinInterval = null;
  function startSpinSound() {
    stopSpinSound();
    playReelTick();
    _spinInterval = setInterval(playReelTick, 80);
  }
  function stopSpinSound() {
    if (_spinInterval) { clearInterval(_spinInterval); _spinInterval = null; }
  }

  // Reel stop thud — low pitched click per column
  function playReelStop(colIndex) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 120 - colIndex * 20;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch(e) {}
  }

  // Coin jingle — ascending random notes
  function playCoins(count) {
    try {
      const ctx = getAudioCtx();
      const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
      for (let i = 0; i < count; i++) {
        const t = ctx.currentTime + i * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[i % notes.length], t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      }
    } catch(e) {}
  }

  // Win fanfare — ascending chord sweep
  function playWinFanfare(isBig) {
    try {
      const ctx = getAudioCtx();
      const melody = isBig
        ? [392, 523, 659, 784, 1047, 1319, 1568]  // G4→E6
        : [523, 659, 784, 1047];                    // C5→C6
      const dur = isBig ? 0.12 : 0.1;
      melody.forEach((freq, i) => {
        const t = ctx.currentTime + i * (isBig ? 0.09 : 0.08);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.12);
      });
    } catch(e) {}
  }
  // ─────────────────────────────────────────────────────────────────────────


  // Routing Handler

  function handleRoute() {
    const hash = window.location.hash || '#/';
    
    // Hide all screens
    document.getElementById('screen-landing').classList.add('hidden');
    document.getElementById('screen-jogar').classList.add('hidden');
    document.getElementById('screen-game').classList.add('hidden');
    document.getElementById('screen-video').classList.add('hidden');

    // Routing Logic
    if (hash === '#/' || hash === '#/landing') {
      state.currentScreen = 'landing';
      document.getElementById('screen-landing').classList.remove('hidden');
    } else if (hash === '#/jogar') {
      state.currentScreen = 'jogar';
      document.getElementById('screen-jogar').classList.remove('hidden');
      setupJogarScreen();
    } else if (hash === '#/game') {
      state.currentScreen = 'game';
      document.getElementById('screen-game').classList.remove('hidden');
      setupGameScreen();
    } else if (hash.startsWith('#/video')) {
      state.currentScreen = 'video';
      document.getElementById('screen-video').classList.remove('hidden');
      setupVideoScreen();
    }
  }

  // --- 1. LANDING SCREEN LOGIC ---
  // Managed via HTML link trigger in welcoming card

  // --- 2. REGISTRATION (JOGAR) SCREEN LOGIC ---
  function setupJogarScreen() {


    const form = document.getElementById('form-register');
    const modalWelcome = document.getElementById('modal-welcome');
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        // Show success modal popup
        if (modalWelcome) {
          modalWelcome.classList.remove('hidden');
        }
      };
    }
  }



  // --- 3. GAME SIMULATOR SCREEN LOGIC ---
  let isSpinning = false;
  let selectedPayMethod = ''; // 'express' or 'iban'
  
  function setupGameScreen() {

    // Reset simulator stats
    state.spinsCount = 0;
    state.saldo = 0;
    
    updateGameStats();

    const btnSpin = document.getElementById('btn-spin');
    const btnAuto = document.getElementById('btn-auto-spin');
    
    if (btnSpin) {
      btnSpin.onclick = () => {
        if (!isSpinning && state.spinsCount < 10) {
          triggerSpin();
        }
      };
    }

    if (btnAuto) {
      btnAuto.onclick = () => {
        state.isAutoSpin = !state.isAutoSpin;
        if (state.isAutoSpin) {
          btnAuto.classList.add('border-green-500', 'bg-green-950/20');
          if (!isSpinning) triggerSpin();
        } else {
          btnAuto.classList.remove('border-green-500', 'bg-green-950/20');
        }
      };
    }

    // STEP 1 → STEP 2: Sacar button opens payment method selection
    const btnSacar = document.getElementById('btn-sacar');
    if (btnSacar) {
      btnSacar.onclick = () => {
        document.getElementById('modal-finished').classList.add('hidden');
        document.getElementById('modal-payment').classList.remove('hidden');
        selectedPayMethod = '';
        document.getElementById('pay-input-wrap').classList.add('hidden');
        document.getElementById('btn-confirm-pay').classList.add('hidden');
        // Reset selection styles
        document.getElementById('pay-express').classList.remove('border-emerald-500', 'bg-emerald-950/20');
        document.getElementById('pay-iban').classList.remove('border-emerald-500', 'bg-emerald-950/20');
      };
    }

    // Payment method button handlers
    const payExpress = document.getElementById('pay-express');
    const payIban = document.getElementById('pay-iban');
    const payInputWrap = document.getElementById('pay-input-wrap');
    const payInputLabel = document.getElementById('pay-input-label');
    const payInput = document.getElementById('pay-input');
    const btnConfirmPay = document.getElementById('btn-confirm-pay');

    if (payExpress) {
      payExpress.onclick = () => {
        selectedPayMethod = 'express';
        payExpress.classList.add('border-emerald-500', 'bg-emerald-950/20');
        payIban.classList.remove('border-emerald-500', 'bg-emerald-950/20');
        payInputLabel.textContent = 'Número Express';
        payInput.placeholder = 'Ex: 923 456 789';
        payInput.value = '';
        payInputWrap.classList.remove('hidden');
        btnConfirmPay.classList.remove('hidden');
      };
    }

    if (payIban) {
      payIban.onclick = () => {
        selectedPayMethod = 'iban';
        payIban.classList.add('border-emerald-500', 'bg-emerald-950/20');
        payExpress.classList.remove('border-emerald-500', 'bg-emerald-950/20');
        payInputLabel.textContent = 'IBAN';
        payInput.placeholder = 'Ex: AO06 0000 0000 0000 0000 0000 0';
        payInput.value = '';
        payInputWrap.classList.remove('hidden');
        btnConfirmPay.classList.remove('hidden');
      };
    }

    // STEP 2 → STEP 3: Confirm payment → verifying
    if (btnConfirmPay) {
      btnConfirmPay.onclick = () => {
        const inputVal = payInput.value.trim();
        if (!inputVal) {
          payInput.focus();
          payInput.classList.add('ring-2', 'ring-red-500/50');
          setTimeout(() => payInput.classList.remove('ring-2', 'ring-red-500/50'), 1500);
          return;
        }

        document.getElementById('modal-payment').classList.add('hidden');
        document.getElementById('modal-verifying').classList.remove('hidden');

        // STEP 3 → STEP 4: After 3 seconds show verified card
        setTimeout(() => {
          document.getElementById('modal-verifying').classList.add('hidden');

          // Populate verified card
          const verifiedAmount = document.getElementById('verified-amount');
          const verifiedMethodIcon = document.getElementById('verified-method-icon');
          const verifiedMethodLabel = document.getElementById('verified-method-label');
          const verifiedMethodValue = document.getElementById('verified-method-value');

          if (verifiedAmount) verifiedAmount.textContent = `${state.saldo.toLocaleString('pt-AO')} Kz`;
          if (verifiedMethodIcon) verifiedMethodIcon.textContent = selectedPayMethod === 'express' ? '📱' : '🏦';
          if (verifiedMethodLabel) verifiedMethodLabel.textContent = selectedPayMethod === 'express' ? 'Express' : 'IBAN';
          if (verifiedMethodValue) verifiedMethodValue.textContent = inputVal;

          document.getElementById('modal-verified').classList.remove('hidden');
        }, 3000);
      };
    }

    // STEP 4 → VSL: Final withdraw button redirects to VSL
    const btnFinalWithdraw = document.getElementById('btn-final-withdraw');
    if (btnFinalWithdraw) {
      btnFinalWithdraw.onclick = () => {
        window.location.hash = `#/video?saldo=${state.saldo.toLocaleString('pt-AO')}`;
      };
    }
  }

  function updateGameStats() {
    const counter = document.getElementById('spins-counter');
    const saldoEl = document.getElementById('game-saldo');
    const payoutBalEl = document.getElementById('payout-balance');
    const finalAmountLabel = document.getElementById('final-amount-label');

    if (counter) counter.textContent = `${state.spinsCount}/10`;
    if (saldoEl) saldoEl.textContent = `${state.saldo.toLocaleString('pt-AO')} Kz`;
    if (payoutBalEl) payoutBalEl.textContent = `${state.saldo.toLocaleString('pt-AO')} Kz`;
    if (finalAmountLabel) finalAmountLabel.textContent = `${state.saldo.toLocaleString('pt-AO')} Kz`;
  }

  function spawnConfetti(count) {
    const colors = ['#fbbf24','#f97316','#ef4444','#22c55e','#3b82f6','#a855f7','#ec4899'];
    const container = document.body;
    const machine = document.querySelector('#screen-game .rounded-2xl');
    const rect = machine ? machine.getBoundingClientRect() : { left: window.innerWidth/2, width: 0, top: 100 };

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.cssText = `
        left: ${rect.left + Math.random() * rect.width}px;
        top: ${rect.top}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        width: ${5 + Math.random() * 6}px;
        height: ${5 + Math.random() * 6}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        animation-delay: ${Math.random() * 0.4}s;
        animation-duration: ${0.8 + Math.random() * 0.6}s;
      `;
      container.appendChild(p);
      setTimeout(() => p.remove(), 1600);
    }
  }

  function triggerSpin() {
    isSpinning = true;
    const btnSpin = document.getElementById('btn-spin');
    if (btnSpin) btnSpin.disabled = true;

    const slotMachine = document.querySelector('#screen-game .rounded-2xl.border-\\[6px\\]');

    // Start mechanical spin sound
    startSpinSound();

    // Add spinning class to each image (staggered stops)
    const colStops = [900, 1100, 1300]; // ms each column stops

    [0, 1, 2].forEach(col => {
      [0, 1, 2].forEach(row => {
        const el = document.getElementById(`slot-${col}-${row}`);
        if (el) {
          el.classList.remove('slot-win');
          el.classList.add('slot-spinning');
        }
      });
    });

    // Stop each column with a stagger
    const outcome = ASSETS.payouts[state.spinsCount];

    [0, 1, 2].forEach(col => {
      setTimeout(() => {
        // Reel stop sound + slow down ticks on last column
        if (col === 2) stopSpinSound();
        playReelStop(col);

        [0, 1, 2].forEach(row => {
          const el = document.getElementById(`slot-${col}-${row}`);
          if (el) {
            el.classList.remove('slot-spinning');
            el.src = outcome.grid[col][row];
            // Small bounce as each reel lands
            el.style.transition = 'transform 0.15s cubic-bezier(.36,.07,.19,.97)';
            el.style.transform = 'scale(1.1)';
            setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
          }
        });
      }, colStops[col]);
    });

    // After all columns stopped — trigger win effects
    const lastStop = colStops[2];
    setTimeout(() => {

      // Update winnings balance
      state.saldo += outcome.amount;
      state.spinsCount++;
      updateGameStats();

      // Win sounds: coins + fanfare (bigger fanfare for large wins)
      const isBigWin = outcome.amount >= 15000;
      const coinCount = isBigWin ? 8 : outcome.amount >= 10000 ? 5 : 3;
      playCoins(coinCount);
      setTimeout(() => playWinFanfare(isBigWin), coinCount * 70 + 50);

      // Win bounce on all symbols
      [0, 1, 2].forEach((col, ci) => {
        [0, 1, 2].forEach((row, ri) => {
          const el = document.getElementById(`slot-${col}-${row}`);
          if (el) {
            setTimeout(() => el.classList.add('slot-win'), (ci * 3 + ri) * 60);
            setTimeout(() => el.classList.remove('slot-win'), (ci * 3 + ri) * 60 + 600);
          }
        });
      });

      // Shake the slot machine
      if (slotMachine) {
        slotMachine.classList.add('machine-shake');
        setTimeout(() => slotMachine.classList.remove('machine-shake'), 500);
      }

      // Golden glow on machine border
      if (slotMachine) {
        slotMachine.classList.add('machine-win-glow');
        setTimeout(() => slotMachine.classList.remove('machine-win-glow'), 800);
      }

      // Screen flash
      const flash = document.getElementById('game-flash');
      if (flash) {
        flash.className = 'pointer-events-none fixed inset-0 z-40 transition-all duration-300 bg-amber-400/20';
        setTimeout(() => flash.className = 'pointer-events-none fixed inset-0 z-40 transition-all duration-300 bg-transparent', 400);
      }

      // Confetti burst — more particles for bigger wins
      const confettiCount = outcome.amount >= 15000 ? 40 : outcome.amount >= 10000 ? 25 : 14;
      spawnConfetti(confettiCount);

      // Show payout win display
      const payoutWinEl = document.getElementById('payout-win');
      if (payoutWinEl) {
        payoutWinEl.textContent = `+${outcome.amount.toLocaleString('pt-AO')} Kz`;
        payoutWinEl.classList.add('text-green-400', 'scale-105');
        setTimeout(() => payoutWinEl.classList.remove('scale-105'), 500);
      }

      // Show per-spin win toast card
      const spinWinModal = document.getElementById('modal-spin-win');
      const spinWinType = document.getElementById('spin-win-type');
      const spinWinAmount = document.getElementById('spin-win-amount');
      if (spinWinModal && spinWinType && spinWinAmount) {
        spinWinType.textContent = outcome.type;
        spinWinAmount.textContent = `+${outcome.amount.toLocaleString('pt-AO')} Kz`;
        spinWinModal.classList.remove('hidden');
        setTimeout(() => spinWinModal.classList.add('hidden'), 1800);
      }

      isSpinning = false;
      if (btnSpin) btnSpin.disabled = false;

      // Handle sequence checks
      if (state.spinsCount >= 10) {
        state.isAutoSpin = false;
        setTimeout(() => {
          const modalFinished = document.getElementById('modal-finished');
          if (modalFinished) modalFinished.classList.remove('hidden');
        }, 2200);
      } else if (state.isAutoSpin) {
        setTimeout(triggerSpin, 2200);
      }

    }, lastStop + 150);
  }


  // --- 4. YOUTUBE VSL SCREEN LOGIC ---
  function setupVideoScreen() {

    // Load vturb player script only when this screen is first visited
    if (!window._vturbLoaded && !window._vtubrLoaded) {
      window._vturbLoaded = true;
      window._vtubrLoaded = true;
      var s = document.createElement('script');
      s.src = 'https://scripts.converteai.net/6d00c478-f718-4fbd-a9d6-7248da316841/players/6ad3c3ad31f4dd382669facb/v4/player.js';
      s.async = true;
      document.head.appendChild(s);
    }

    // Parse URL balance parameter
    const urlParams = new URLSearchParams(window.location.search);
    let saldoParam = urlParams.get('saldo') || '130.000';
    saldoParam = decodeURIComponent(saldoParam).replace(/\s/g, ' ').trim();

    const vslSaldoValueEl = document.getElementById('vsl-saldo-value');
    if (vslSaldoValueEl) {
      vslSaldoValueEl.textContent = saldoParam.includes('Kz') || saldoParam.includes('KZ') ? saldoParam : `${saldoParam} Kz`;
    }

    // Subscribe toggles
    const vslBtnSub = document.getElementById('vsl-btn-subscribe');
    let sub = false;
    if (vslBtnSub) {
      vslBtnSub.onclick = () => {
        sub = !sub;
        if (sub) {
          vslBtnSub.textContent = 'Subscrito';
          vslBtnSub.className = 'ml-2 shrink-0 rounded-full bg-[#f2f2f2] text-[#0f0f0f] px-4 py-2 text-sm font-semibold';
        } else {
          vslBtnSub.textContent = 'Subscrever';
          vslBtnSub.className = 'ml-2 shrink-0 rounded-full bg-[#0f0f0f] text-white px-4 py-2 text-sm font-semibold hover:bg-[#272727]';
        }
      };
    }

    // Likes toggles
    const vslBtnLike = document.getElementById('vsl-btn-like');
    const vslBtnDislike = document.getElementById('vsl-btn-dislike');
    const vslLikesCount = document.getElementById('vsl-likes-count');
    const iconLike = document.getElementById('vsl-icon-like');
    const iconDislike = document.getElementById('vsl-icon-dislike');

    let initialLikes = 48273;
    let liked = false;
    let disliked = false;

    function renderLikes() {
      let count = initialLikes;
      if (liked) count++;
      const formatted = (count / 1000).toFixed(1).replace('.0', '') + ' mil';
      if (vslLikesCount) vslLikesCount.textContent = formatted;

      if (iconLike) {
        if (liked) iconLike.classList.add('fill-[#0f0f0f]');
        else iconLike.classList.remove('fill-[#0f0f0f]');
      }
      if (iconDislike) {
        if (disliked) iconDislike.classList.add('fill-[#0f0f0f]');
        else iconDislike.classList.remove('fill-[#0f0f0f]');
      }
    }

    if (vslBtnLike) {
      vslBtnLike.onclick = () => {
        liked = !liked;
        if (liked) disliked = false;
        renderLikes();
      };
    }

    if (vslBtnDislike) {
      vslBtnDislike.onclick = () => {
        disliked = !disliked;
        if (disliked) liked = false;
        renderLikes();
      };
    }

    // Dynamic viewers counter updates
    let count = 2847;
    const countEl = document.getElementById('vsl-viewer-count');
    const descEl = document.getElementById('vsl-desc-viewers');
    
    function refreshViewers() {
      count = Math.max(2500, count + Math.floor(Math.random() * 11) - 5);
      const formatted = count.toLocaleString('pt-AO');
      if (countEl) countEl.textContent = formatted;
      if (descEl) descEl.textContent = formatted;
    }
    
    setInterval(refreshViewers, 3000);

    // Dynamic Live YouTube Chat
    const chatList = document.getElementById('vsl-chat-list');
    const chatCount = document.getElementById('vsl-chat-count');

    const AVATARS = {
      f1: 'images/avatars/f1.jpg',
      f2: 'images/avatars/f2.jpg',
      f3: 'images/avatars/f3.jpg',
      f4: 'images/avatars/f4.jpg',
      h1: 'images/avatars/h1.jpg',
      h2: 'images/avatars/h2.jpg',
      h3: 'images/avatars/h3.jpg',
      h4: 'images/avatars/h4.jpg',
      virginia: 'images/avatars/virginia.jpg'
    };

    const INITIAL_CHAT = [
      { name: 'Luísa Capitango', avatar: AVATARS.f1, text: 'Boa noite gente! Cheguei agora 🙋‍♀️', time: 'há 14 min', isHost: false },
      { name: 'Manuel Fernando', avatar: AVATARS.h1, text: 'Virgínia, eu já tinha tentado outras coisas e nada funcionou. Vamos ver dessa vez 🙏', time: 'há 13 min', isHost: false },
      { name: 'Virgínia Fonseca', avatar: AVATARS.virginia, text: 'Bem-vindos meus amores ❤️ Fiquem até ao fim que vou mostrar tudo passo a passo!', time: 'há 12 min', isHost: true },
      { name: 'Ana Paula', avatar: AVATARS.f2, text: 'Estou a assistir desde Luanda 🇦🇴', time: 'há 11 min', isHost: false },
      { name: 'Edson Miguel', avatar: AVATARS.h2, text: 'Já recebi 45.000 Kz na conta Multicaixa 🤠🤠', time: 'há 10 min', isHost: false },
      { name: 'Helena Sebastião', avatar: AVATARS.f3, text: 'Sério??? Como fizeste?', time: 'há 9 min', isHost: false },
      { name: 'Carlos Mateus', avatar: AVATARS.h3, text: 'Funciona mesmo gente, eu também já recebi 👏', time: 'há 8 min', isHost: false },
      { name: 'Virgínia Fonseca', avatar: AVATARS.virginia, text: '@Helena segue exactamente o que eu mostro no vídeo, sem pular nenhum passo 😊', time: 'há 7 min', isHost: true },
      { name: 'Beatriz Sousa', avatar: AVATARS.f4, text: 'Que Deus te abençoe Virgínia 🙏🙏', time: 'há 6 min', isHost: false },
      { name: 'Júlio Tavares', avatar: AVATARS.h4, text: 'Acabei de me inscrever, vamos ver no que dá', time: 'há 5 min', isHost: false }
    ];

    const TIMED_CHAT = [
      { name: 'Luísa Capitango', avatar: AVATARS.f1, text: 'Caiu na minha conta agora!!! 🤑🤑🤑🤑🤑', delay: 8000 },
      { name: 'Virgínia Fonseca', avatar: AVATARS.virginia, text: 'Parabéns Luísa!! 🎉 Era só seguir o passo a passo 😊', isHost: true, delay: 14000 },
      { name: 'Manuel Fernando', avatar: AVATARS.h1, text: 'Estou a tremer aqui, recebi 80.000 Kz 😭', delay: 22000 },
      { name: 'Ana Paula', avatar: AVATARS.f2, text: 'Não acredito que é real. mas é real mesmo 😱', delay: 30000 },
      { name: 'Edson Miguel', avatar: AVATARS.h2, text: 'Pessoal não percam tempo, vão directo no link', delay: 38000 },
      { name: 'Helena Sebastião', avatar: AVATARS.f3, text: 'Já tentei agora, deu certo! Obrigada Virgínia 🙏❤️', delay: 46000 },
      { name: 'Virgínia Fonseca', avatar: AVATARS.virginia, text: 'Continuem assistindo, falta a parte mais importante 😊', isHost: true, delay: 54000 },
      { name: 'Carlos Mateus', avatar: AVATARS.h3, text: 'Recomendo a todos os meus amigos 💪', delay: 62000 },
      { name: 'Beatriz Sousa', avatar: AVATARS.f4, text: 'Mãe vai ficar tão feliz quando eu chegar com esse dinheiro 🥹', delay: 70000 },
      { name: 'Júlio Tavares', avatar: AVATARS.h4, text: 'Confirmado! Caiu no meu IBAN ✅', delay: 78000 },
      { name: 'Virgínia Fonseca', avatar: AVATARS.virginia, text: 'Fiquem atentas que os levantamentos estão liberados 👇👇👇', isHost: true, delay: 86000 },
      { name: 'Luísa Capitango', avatar: AVATARS.f1, text: 'Já é o segundo levantamento que faço hoje 🤑', delay: 95000 },
      { name: 'Ana Paula', avatar: AVATARS.f2, text: 'Virgínia és um anjo 👼🥺', delay: 104000 },
      { name: 'Edson Miguel', avatar: AVATARS.h2, text: 'Pessoal aproveitem antes que feche!!!', delay: 112000 }
    ];

    function drawMsg(msg, isNew = false) {
      const card = document.createElement('div');
      card.className = `flex gap-2.5 ${isNew ? 'animate-chat-in' : ''}`;
      
      const hostBadge = msg.isHost 
        ? `<span class="flex items-center gap-0.5 rounded bg-[#ea580c]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ea580c]">Autor</span>`
        : '';
      const nameColor = msg.isHost ? 'text-[#ea580c]' : 'text-[#0f0f0f]';

      card.innerHTML = `
        <img src="${msg.avatar}" alt="${msg.name}" class="h-8 w-8 shrink-0 rounded-full bg-[#f2f2f2] object-cover sm:h-9 sm:w-9">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-1.5 text-xs">
            <span class="font-semibold ${nameColor}">${msg.name}</span>
            ${hostBadge}
            <span class="text-[#606060]">${msg.time || 'agora'}</span>
          </div>
          <p class="mt-0.5 break-words text-sm leading-snug text-[#0f0f0f]">${msg.text}</p>
        </div>
      `;
      return card;
    }

    if (chatList) {
      chatList.innerHTML = '';
      INITIAL_CHAT.forEach(m => chatList.appendChild(drawMsg(m, false)));
      
      const refreshChatCount = () => {
        if (chatCount) chatCount.textContent = chatList.children.length;
      };
      refreshChatCount();
      chatList.scrollTop = chatList.scrollHeight;

      // Timed comments
      TIMED_CHAT.forEach(m => {
        setTimeout(() => {
          if (state.currentScreen === 'video') {
            chatList.appendChild(drawMsg(m, true));
            refreshChatCount();
            chatList.scrollTop = chatList.scrollHeight;
          }
        }, m.delay);
      });
    }
  }

  // Hash-routing triggers
  window.onhashchange = handleRoute;
  window.onload = handleRoute;
  handleRoute();

})();
