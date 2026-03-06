(() => {
  "use strict";

  // ── DOM refs ──
  const wordDisplay = document.getElementById("wordDisplay");
  const statusHint = document.getElementById("statusHint");
  const wordArea = document.getElementById("wordArea");
  const speedSlider = document.getElementById("speedSlider");
  const speedLabel = document.getElementById("speedLabel");
  const wordCount = document.getElementById("wordCount");
  const progress = document.getElementById("progress");

  // ── Parse selected text from URL ──
  const params = new URLSearchParams(window.location.search);
  const rawText = params.get("text") || "";
  const words = rawText.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    wordDisplay.textContent = "No text selected.";
    return;
  }

  // ── State ──
  let currentIndex = 0;
  let wpm = parseInt(speedSlider.value, 10);
  let isPlaying = false;
  let timer = null;

  // ── Restore saved speed ──
  chrome.storage.local.get("adrd_wpm", (result) => {
    if (result.adrd_wpm) {
      wpm = result.adrd_wpm;
      speedSlider.value = wpm;
      speedLabel.textContent = `${wpm} wpm`;
      updateSliderTrack();
    }
  });

  // Show word count
  wordCount.textContent = `${words.length} words`;

  // ── Bionic bold: bold first 40% of letters in a word ──
  function bionicWord(word) {
    // Separate leading punctuation, core letters, trailing punctuation
    const match = word.match(/^([^a-zA-Z\u00C0-\u024F]*)(.*?)([^a-zA-Z\u00C0-\u024F]*)$/);
    if (!match) return document.createTextNode(word);

    const leading = match[1];
    const core = match[2];
    const trailing = match[3];

    const frag = document.createDocumentFragment();

    if (leading) frag.appendChild(document.createTextNode(leading));

    if (core.length === 0) {
      // Purely punctuation / symbols
      frag.appendChild(document.createTextNode(word));
      return frag;
    }

    const boldCount = Math.ceil(core.length * 0.4);

    const boldSpan = document.createElement("span");
    boldSpan.className = "bold";
    boldSpan.textContent = core.slice(0, boldCount);
    frag.appendChild(boldSpan);

    const rest = core.slice(boldCount);
    if (rest) frag.appendChild(document.createTextNode(rest));
    if (trailing) frag.appendChild(document.createTextNode(trailing));

    return frag;
  }

  // ── Display a word at index ──
  function showWord(index) {
    wordDisplay.innerHTML = "";
    wordDisplay.appendChild(bionicWord(words[index]));
    // Update progress
    const pct = ((index + 1) / words.length) * 100;
    progress.style.width = pct + "%";
    // Update word counter
    wordCount.textContent = `${index + 1} / ${words.length}`;
  }

  // ── Advance to next word ──
  function tick() {
    if (!isPlaying) return;

    currentIndex++;
    if (currentIndex >= words.length) {
      // Reached the end
      isPlaying = false;
      wordArea.classList.add("paused");
      showDone();
      return;
    }

    showWord(currentIndex);
    scheduleNext();
  }

  function scheduleNext() {
    let delay = 60000 / wpm;
    // Pause 25% longer on sentence-ending punctuation (. ! ?)
    const word = words[currentIndex] || "";
    if (/[.!?]["'"\u201D\u2019\)\]]*$/.test(word)) {
      delay *= 1.25;
    }
    timer = setTimeout(tick, delay);
  }

  // ── Play / Pause ──
  function play() {
    if (currentIndex >= words.length) return;
    isPlaying = true;
    wordArea.classList.remove("paused");
    statusHint.classList.add("hidden");
    scheduleNext();
  }

  function pause() {
    isPlaying = false;
    wordArea.classList.add("paused");
    clearTimeout(timer);
    statusHint.textContent = "Paused — click or press Space";
    statusHint.classList.remove("hidden");
  }

  function togglePlayPause() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  // ── Done screen ──
  function showDone() {
    wordDisplay.innerHTML = "";
    const container = document.createElement("div");
    container.className = "done-msg";
    container.innerHTML = `
      <span>Finished!</span>
      <button class="restart-btn" id="restartBtn">↺ Restart</button>
    `;
    wordDisplay.appendChild(container);

    document.getElementById("restartBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      restart();
    });

    statusHint.textContent = "";
    statusHint.classList.add("hidden");
  }

  function restart() {
    currentIndex = 0;
    isPlaying = false;
    wordArea.classList.add("paused");
    showWord(0);
    statusHint.textContent = "Click or press Space to start";
    statusHint.classList.remove("hidden");
  }

  // ── Slider ──
  function updateSliderTrack() {
    const min = parseInt(speedSlider.min, 10);
    const max = parseInt(speedSlider.max, 10);
    const val = parseInt(speedSlider.value, 10);
    const pct = ((val - min) / (max - min)) * 100;
    speedSlider.style.background = `linear-gradient(to right, #4caf7a ${pct}%, #1e211e ${pct}%)`;
  }

  speedSlider.addEventListener("input", () => {
    wpm = parseInt(speedSlider.value, 10);
    speedLabel.textContent = `${wpm} wpm`;
    updateSliderTrack();
    // Persist speed setting
    chrome.storage.local.set({ adrd_wpm: wpm });
  });

  // ── Event listeners ──
  // Click anywhere on the word area to toggle
  wordArea.addEventListener("click", (e) => {
    // Don't toggle if clicking the restart button
    if (e.target.closest(".restart-btn")) return;
    togglePlayPause();
  });

  // Spacebar toggles globally
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      // If done, restart instead
      if (currentIndex >= words.length) {
        restart();
        return;
      }
      togglePlayPause();
    }
  });

  // Prevent slider interaction from toggling play/pause
  speedSlider.addEventListener("click", (e) => e.stopPropagation());
  speedSlider.addEventListener("mousedown", (e) => e.stopPropagation());

  // ── Init ──
  showWord(0);
  updateSliderTrack();
  wordArea.classList.add("paused");
})();
