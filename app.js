const canvas = document.querySelector("#flightCanvas");
const ctx = canvas.getContext("2d");
const scanButton = document.querySelector("#scanButton");
const scanState = document.querySelector("#scanState");
const soundState = document.querySelector("#soundState");
const multiplierDisplay = document.querySelector("#multiplierDisplay");
const resultValue = document.querySelector("#resultValue");
const resultText = document.querySelector("#resultText");
const resultCard = document.querySelector("#resultCard");
const historyChips = document.querySelector("#historyChips");
const lastSignal = document.querySelector("#lastSignal");
const averageSignal = document.querySelector("#averageSignal");
const highestSignal = document.querySelector("#highestSignal");

let mode = "idle";
let progress = 0;
let currentMultiplier = 1;
let targetMultiplier = 1.45;
let startTime = 0;
let history = [1.45, 2.18, 1.22, 3.04, 1.67, 5.21, 1.38, 2.72];
let audioCtx;
let engineOsc;
let engineGain;
let engineFilter;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone({ frequency, duration, type = "sine", gain = 0.05, delay = 0, endFrequency }) {
  const ac = getAudioContext();
  if (!ac) return;
  const now = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.025);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.04);
}

function playNoiseBurst() {
  const ac = getAudioContext();
  if (!ac) return;
  const length = Math.floor(ac.sampleRate * 0.28);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const source = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const amp = ac.createGain();
  filter.type = "bandpass";
  filter.frequency.value = 620;
  filter.Q.value = 0.9;
  amp.gain.setValueAtTime(0.12, ac.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.28);
  source.buffer = buffer;
  source.connect(filter).connect(amp).connect(ac.destination);
  source.start();
}

function startFlightSound() {
  const ac = getAudioContext();
  if (!ac) {
    soundState.textContent = "Sound unavailable";
    return;
  }
  soundState.textContent = "Sound on";
  playTone({ frequency: 720, duration: 0.08, type: "triangle", gain: 0.04 });
  playTone({ frequency: 980, duration: 0.1, type: "triangle", gain: 0.035, delay: 0.09 });

  stopEngineSound();
  engineOsc = ac.createOscillator();
  engineGain = ac.createGain();
  engineFilter = ac.createBiquadFilter();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 88;
  engineFilter.type = "lowpass";
  engineFilter.frequency.value = 520;
  engineGain.gain.value = 0.0001;
  engineOsc.connect(engineFilter).connect(engineGain).connect(ac.destination);
  engineGain.gain.exponentialRampToValueAtTime(0.045, ac.currentTime + 0.18);
  engineOsc.start();
}

function updateFlightSound() {
  if (!audioCtx || !engineOsc || !engineGain || !engineFilter) return;
  const now = audioCtx.currentTime;
  engineOsc.frequency.setTargetAtTime(92 + progress * 110 + currentMultiplier * 8, now, 0.05);
  engineFilter.frequency.setTargetAtTime(440 + progress * 900, now, 0.08);
  engineGain.gain.setTargetAtTime(0.04 + progress * 0.035, now, 0.08);
}

function stopEngineSound() {
  if (!audioCtx || !engineOsc || !engineGain) return;
  const now = audioCtx.currentTime;
  engineGain.gain.cancelScheduledValues(now);
  engineGain.gain.setTargetAtTime(0.0001, now, 0.035);
  try {
    engineOsc.stop(now + 0.18);
  } catch (error) {
    // The oscillator may already be stopped after a very fast scan restart.
  }
  engineOsc = null;
  engineGain = null;
  engineFilter = null;
}

function playCrashSound() {
  stopEngineSound();
  playTone({ frequency: 260, endFrequency: 70, duration: 0.34, type: "sawtooth", gain: 0.09 });
  playTone({ frequency: 130, endFrequency: 42, duration: 0.42, type: "square", gain: 0.035, delay: 0.04 });
  playNoiseBurst();
}

function pickCrashPoint() {
  const roll = Math.random();
  if (roll < 0.58) return 1 + Math.random() * 0.85;
  if (roll < 0.84) return 1.85 + Math.random() * 1.35;
  if (roll < 0.96) return 3.2 + Math.random() * 3.4;
  return 6.6 + Math.random() * 5.5;
}

function formatX(value) {
  return `${value.toFixed(2)}x`;
}

function drawGrid(width, height) {
  ctx.strokeStyle = "rgba(77, 180, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawPlane(x, y, angle, crashed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (crashed) {
    ctx.fillStyle = "rgba(255, 47, 109, 0.95)";
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (22 + i * 2), Math.sin(a) * (22 + i * 2));
      ctx.lineTo(Math.cos(a + 0.18) * 10, Math.sin(a + 0.18) * 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#f5f8ff";
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(-18, -12);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-18, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#4db4ff";
  ctx.fillRect(-27, -3, 18, 6);
  ctx.restore();
}

function drawScene() {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  drawGrid(width, height);

  const pad = 32;
  const baseY = height - 58;
  const endX = pad + progress * (width - pad * 2);
  const lift = Math.pow(progress, 1.55) * (height - 120);
  const endY = baseY - lift;

  const gradient = ctx.createLinearGradient(0, baseY, endX, endY);
  gradient.addColorStop(0, "rgba(77, 180, 255, 0.1)");
  gradient.addColorStop(0.55, "rgba(77, 180, 255, 0.95)");
  gradient.addColorStop(1, mode === "crashed" ? "rgba(255, 47, 109, 0.96)" : "rgba(255, 53, 79, 0.92)");

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(pad, baseY);
  for (let t = 0; t <= progress; t += 0.02) {
    const x = pad + t * (width - pad * 2);
    const y = baseY - Math.pow(t, 1.55) * (height - 120);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.lineTo(endX, baseY);
  ctx.lineTo(pad, baseY);
  ctx.closePath();
  ctx.fillStyle = mode === "crashed" ? "rgba(255, 47, 109, 0.1)" : "rgba(77, 180, 255, 0.08)";
  ctx.fill();

  const angle = -0.28 - progress * 0.55;
  drawPlane(endX, endY, angle, mode === "crashed");
}

function animate(timestamp) {
  if (!startTime) startTime = timestamp;
  const elapsed = timestamp - startTime;

  if (mode === "flying") {
    const duration = 2500 + Math.min(2500, targetMultiplier * 280);
    progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 2.6);
    currentMultiplier = 1 + (targetMultiplier - 1) * eased;
    multiplierDisplay.textContent = formatX(currentMultiplier);
    updateFlightSound();

    if (progress >= 1) {
      mode = "crashed";
      scanState.textContent = "Signal revealed";
      multiplierDisplay.textContent = formatX(targetMultiplier);
      resultValue.textContent = formatX(targetMultiplier);
      resultText.textContent = "Demo result only. Not a real crash prediction.";
      resultCard.classList.add("revealed");
      playCrashSound();
      history.unshift(targetMultiplier);
      history = history.slice(0, 12);
      renderHistory();
      setTimeout(() => {
        scanButton.disabled = false;
        scanButton.classList.remove("hidden");
      }, 650);
    }
  }

  drawScene();
  requestAnimationFrame(animate);
}

function renderHistory() {
  historyChips.innerHTML = "";
  history.forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "history-chip";
    if (value >= 3) chip.classList.add("hot");
    if (value < 1.5) chip.classList.add("low");
    chip.textContent = formatX(value);
    historyChips.append(chip);
  });

  const avg = history.reduce((sum, value) => sum + value, 0) / history.length;
  lastSignal.textContent = formatX(history[0]);
  averageSignal.textContent = formatX(avg);
  highestSignal.textContent = formatX(Math.max(...history));
}

function startScan() {
  targetMultiplier = pickCrashPoint();
  mode = "flying";
  progress = 0;
  currentMultiplier = 1;
  startTime = 0;
  scanButton.disabled = true;
  scanButton.classList.add("hidden");
  resultCard.classList.remove("revealed");
  resultValue.textContent = "--";
  resultText.textContent = "Scanning demo signal...";
  scanState.textContent = "Scanning next signal";
  multiplierDisplay.textContent = "1.00x";
  startFlightSound();
}

window.addEventListener("resize", resizeCanvas);
scanButton.addEventListener("click", startScan);

resizeCanvas();
renderHistory();
requestAnimationFrame(animate);