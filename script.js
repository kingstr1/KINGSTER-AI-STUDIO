/* KINGSTER AI STUDIO - SITE AND BROWSER VIDEO MONTAGE */
document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navigation a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });

  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".navigation");
  if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
      const expanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!expanded));
      navigation.classList.toggle("is-open", !expanded);
    });
    navigation.addEventListener("click", event => {
      if (event.target.closest("a")) {
        menuToggle.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
      }
    });
  }

  const upload = document.getElementById("videoUpload");
  if (!upload) return; // The editor only exists on gaming.html.

  const musicUpload = document.getElementById("musicUpload");
  const fileStatus = document.getElementById("fileStatus");
  const musicStatus = document.getElementById("musicStatus");
  const clipList = document.getElementById("clipList");
  const generateBtn = document.getElementById("generateBtn");
  const stopBtn = document.getElementById("stopBtn");
  const status = document.getElementById("generationStatus");
  const preview = document.getElementById("videoPreview");
  const downloadLink = document.getElementById("downloadLink");

  let clips = [];
  let musicFile = null;
  let stopRequested = false;
  let currentOutputUrl = null;

  const setStatus = message => { status.textContent = message; };

  upload.addEventListener("change", () => {
    const selected = Array.from(upload.files || []);
    clips = selected.filter(file => file.type.startsWith("video/") && file.size <= 500 * 1024 * 1024);
    const rejected = selected.length - clips.length;
    fileStatus.textContent = clips.length
      ? `${clips.length} video clip(s) ready.`
      : "No video clips selected.";
    clipList.replaceChildren();
    clips.forEach((file, index) => {
      const item = document.createElement("li");
      item.textContent = `${index + 1}. ${file.name}`;
      clipList.appendChild(item);
    });
    setStatus(rejected ? `${rejected} file(s) were skipped. Choose video files under 500 MB.` : clips.length ? "Clips loaded. Customise your edit, then generate." : "Choose at least one video clip.");
    downloadLink.hidden = true;
  });

  musicUpload.addEventListener("change", () => {
    musicFile = musicUpload.files && musicUpload.files[0] ? musicUpload.files[0] : null;
    musicStatus.textContent = musicFile ? `Music selected: ${musicFile.name}` : "No music selected.";
  });

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const waitForEvent = (element, eventName) => new Promise((resolve, reject) => {
    const onDone = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("A selected video could not be decoded by this browser.")); };
    const cleanup = () => {
      element.removeEventListener(eventName, onDone);
      element.removeEventListener("error", onError);
    };
    element.addEventListener(eventName, onDone, { once: true });
    element.addEventListener("error", onError, { once: true });
  });

  function dimensionsFor(format) {
    if (format === "9:16") return [720, 1280];
    if (format === "1:1") return [900, 900];
    return [1280, 720];
  }

  async function createVideo(file) {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.load();
    await Promise.race([
      waitForEvent(video, "loadedmetadata"),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out loading ${file.name}. Try a smaller MP4 clip.`)), 20000))
    ]);
    return video;
  }

  function drawFrame(ctx, video, width, height, settings, label) {
    const [vw, vh] = [video.videoWidth || width, video.videoHeight || height];
    const scale = Math.max(width / vw, height / vh);
    const sw = width / scale, sh = height / scale;
    const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
    ctx.save();
    if (settings.effects.includes("mono")) ctx.filter = "grayscale(1)";
    else if (settings.effects.includes("glow")) ctx.filter = "saturate(1.5) contrast(1.08)";
    else ctx.filter = "none";
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
    ctx.restore();

    if (settings.effects.includes("glow")) {
      ctx.fillStyle = "rgba(0,190,255,0.08)";
      ctx.fillRect(0, 0, width, height);
    }
    const title = settings.overlay || label;
    if (title) {
      const fontSize = Math.max(24, Math.round(width * 0.045));
      ctx.font = `900 ${fontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.lineWidth = Math.max(3, fontSize / 8);
      ctx.strokeStyle = "rgba(0,0,0,.8)";
      ctx.fillStyle = "#ffffff";
      ctx.strokeText(title, width / 2, height * 0.13, width * 0.88);
      ctx.fillText(title, width / 2, height * 0.13, width * 0.88);
    }
  }

  async function generate() {
    if (!clips.length) {
      setStatus("Please upload at least one gaming video first.");
      return;
    }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      setStatus("Your browser does not support in-browser video export. Please try an updated Chrome or Edge browser.");
      return;
    }

    const format = document.getElementById("videoFormat").value;
    const style = document.getElementById("editStyle").value;
    const lengthChoice = document.getElementById("videoLength").value;
    const transition = document.getElementById("transitions").value;
    const overlay = document.getElementById("overlayText").value.trim();
    const effects = Array.from(document.querySelectorAll('input[name="effects"]:checked')).map(input => input.value);
    const [width, height] = dimensionsFor(format);
    const maxDuration = lengthChoice === "all" ? Infinity : Number(lengthChoice);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(30);
    let audioContext = null;
    let musicElement = null;
    let musicUrl = null;
    let recorder = null;
    const chunks = [];

    stopRequested = false;
    generateBtn.disabled = true;
    stopBtn.disabled = false;
    downloadLink.hidden = true;
    setStatus("Preparing your clips…");

    try {
      if (musicFile) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          await audioContext.resume();
          const destination = audioContext.createMediaStreamDestination();
          musicElement = new Audio();
          musicElement.src = musicUrl = URL.createObjectURL(musicFile);
          musicElement.loop = true;
          musicElement.volume = 0.85;
          const source = audioContext.createMediaElementSource(musicElement);
          source.connect(destination);
          destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
          await musicElement.play();
        }
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
      recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
      const stopped = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start(250);

      let totalSeconds = 0;
      for (let i = 0; i < clips.length && totalSeconds < maxDuration && !stopRequested; i++) {
        setStatus(`Editing clip ${i + 1} of ${clips.length}…`);
        const video = await createVideo(clips[i]);
        const available = Math.max(0, video.duration || 0);
        const remaining = maxDuration - totalSeconds;
        const playFor = Math.min(available, remaining);
        if (!playFor || !Number.isFinite(playFor)) {
          URL.revokeObjectURL(video.src);
          continue;
        }

        video.currentTime = 0;
        await video.play();
        const startedAt = performance.now();
        let lastDraw = 0;
        video.playbackRate = effects.includes("slow") ? 0.75 : 1;
        while (!video.ended && !stopRequested && video.currentTime < playFor) {
          const now = performance.now();
          if (now - lastDraw >= 30) {
            const label = style === "headshot" ? "HIGHLIGHT" :
              style === "cinematic" ? "CINEMATIC" :
              style === "football" ? "GAME TIME" :
              style === "funny" ? "FUNNY MOMENT" : "KINGSTER";
            drawFrame(ctx, video, width, height, { effects, overlay }, label);
            lastDraw = now;
            const elapsed = Math.min(playFor, video.currentTime);
            setStatus(`Rendering clip ${i + 1}/${clips.length} · ${Math.floor(totalSeconds + elapsed)}s`);
          }
          await wait(15);
        }
        video.pause();
        totalSeconds += Math.min(playFor, video.currentTime || (performance.now() - startedAt) / 1000);
        if (transition === "fade" && i < clips.length - 1 && !stopRequested) {
          const fadeStart = performance.now();
          while (performance.now() - fadeStart < 450 && !stopRequested) {
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(0, 0, width, height);
            await wait(30);
          }
        }
        URL.revokeObjectURL(video.src);
      }

      if (recorder.state !== "inactive") recorder.stop();
      await stopped;
      if (!chunks.length) throw new Error("No video data was recorded. Try another video format or a shorter clip.");
      const blob = new Blob(chunks, { type: "video/webm" });
      if (currentOutputUrl) URL.revokeObjectURL(currentOutputUrl);
      currentOutputUrl = URL.createObjectURL(blob);
      preview.src = currentOutputUrl;
      preview.load();
      downloadLink.href = currentOutputUrl;
      downloadLink.download = "kingster-edited-video.webm";
      downloadLink.textContent = "Download finished video";
      downloadLink.hidden = false;
      setStatus(stopRequested ? "Generation stopped. You can download the video rendered so far." : "Your customised montage is ready! Preview it or download it below.");
    } catch (error) {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      setStatus(error.message || "Something went wrong while generating your video. Try a shorter clip or a different browser.");
    } finally {
      if (musicElement) musicElement.pause();
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      if (audioContext) await audioContext.close().catch(() => {});
      stream.getTracks().forEach(track => track.stop());
      generateBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }

  generateBtn.addEventListener("click", generate);
  stopBtn.addEventListener("click", () => {
    stopRequested = true;
    setStatus("Stopping after the current frame…");
  });
});
