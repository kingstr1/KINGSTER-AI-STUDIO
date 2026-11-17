/* KINGSTER AI STUDIO - NEON REFLEX MINI GAME */
document.addEventListener("DOMContentLoaded", () => {
  const tiles = Array.from(document.querySelectorAll(".arcade-tile"));
  const startButton = document.getElementById("startGame");
  const scoreValue = document.getElementById("scoreValue");
  const timeValue = document.getElementById("timeValue");
  const bestValue = document.getElementById("bestValue");
  const status = document.getElementById("gameStatus");
  if (!tiles.length || !startButton || !scoreValue || !timeValue || !bestValue || !status) return;

  const roundLength = 30;
  const bestKey = "kingster-neon-reflex-best";
  let score = 0;
  let bestScore = 0;
  let playing = false;
  let endsAt = 0;
  let clockTimer = null;
  let moveTimer = null;
  let previousOrb = -1;

  try { bestScore = Number(localStorage.getItem(bestKey)) || 0; } catch { /* Storage can be unavailable in private browsing. */ }
  bestValue.textContent = String(bestScore);

  function clearTiles() {
    tiles.forEach((tile, index) => {
      tile.classList.remove("is-orb", "is-decoy");
      tile.textContent = "";
      tile.dataset.kind = "empty";
      tile.setAttribute("aria-label", `Tile ${index + 1}, empty`);
    });
  }

  function showTargets() {
    if (!playing) return;
    clearTiles();

    const choices = tiles.map((_, index) => index).filter(index => index !== previousOrb);
    const orbIndex = choices[Math.floor(Math.random() * choices.length)];
    previousOrb = orbIndex;
    const orb = tiles[orbIndex];
    orb.dataset.kind = "orb";
    orb.classList.add("is-orb");
    orb.textContent = "✦";
    orb.setAttribute("aria-label", `Cyan orb, tile ${orbIndex + 1}`);

    if (score >= 4 && Math.random() < 0.32) {
      const decoyChoices = tiles.map((_, index) => index).filter(index => index !== orbIndex);
      const decoyIndex = decoyChoices[Math.floor(Math.random() * decoyChoices.length)];
      const decoy = tiles[decoyIndex];
      decoy.dataset.kind = "decoy";
      decoy.classList.add("is-decoy");
      decoy.textContent = "×";
      decoy.setAttribute("aria-label", `Red decoy, tile ${decoyIndex + 1}`);
    }
  }

  function scheduleMove() {
    window.clearTimeout(moveTimer);
    const delay = Math.max(480, 1150 - score * 32);
    moveTimer = window.setTimeout(() => {
      showTargets();
      scheduleMove();
    }, delay);
  }

  function finishRound() {
    if (!playing) return;
    playing = false;
    window.clearInterval(clockTimer);
    window.clearTimeout(moveTimer);
    clearTiles();
    tiles.forEach(tile => { tile.disabled = true; });
    timeValue.textContent = "0";
    status.textContent = `Time is up! You scored ${score} ${score === 1 ? "point" : "points"}. Try again?`;
    startButton.textContent = "PLAY AGAIN";
    startButton.disabled = false;
  }

  function startRound() {
    window.clearInterval(clockTimer);
    window.clearTimeout(moveTimer);
    score = 0;
    scoreValue.textContent = "0";
    timeValue.textContent = String(roundLength);
    status.textContent = "Go! Catch the cyan orb and avoid red decoys.";
    startButton.textContent = "PLAYING…";
    startButton.disabled = true;
    tiles.forEach(tile => { tile.disabled = false; });
    previousOrb = -1;
    playing = true;
    endsAt = Date.now() + roundLength * 1000;
    showTargets();
    scheduleMove();

    clockTimer = window.setInterval(() => {
      const secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      timeValue.textContent = String(secondsLeft);
      if (secondsLeft === 0) finishRound();
    }, 100);
  }

  tiles.forEach(tile => {
    tile.addEventListener("click", () => {
      if (!playing) return;
      if (tile.dataset.kind === "orb") {
        score += 1;
        scoreValue.textContent = String(score);
        status.textContent = `Nice catch! Score: ${score}.`;
        showTargets();
        scheduleMove();
        if (score > bestScore) {
          bestScore = score;
          bestValue.textContent = String(bestScore);
          try { localStorage.setItem(bestKey, String(bestScore)); } catch { /* The round still works without storage. */ }
        }
      } else if (tile.dataset.kind === "decoy") {
        score = Math.max(0, score - 1);
        scoreValue.textContent = String(score);
        status.textContent = `That was a decoy. Score: ${score}.`;
        showTargets();
        scheduleMove();
      }
    });
  });

  startButton.addEventListener("click", startRound);
});
