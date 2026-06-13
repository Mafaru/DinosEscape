export function startIntro(onFinish) {
  const lines = [
    "YEAR 2147.",
    "After years of secret experiments, Dr. Elias Vorn managed to replicate the Tyrannosaurus Rex gene.",
    "The DinosEscape project was meant to open a new age of bioengineering.",
    "But during a night test, the containment system failed.",
    "The creature escaped into the city.",
    "Now it runs through deserted streets. Help it survive.",
  ];

  let lineIndex = 0;
  let charIndex = 0;
  let typingInterval = null;
  let currentParagraph = null;
  let isTyping = false;

  const typingSound = new Audio("/audio/typing.mp3");
  typingSound.volume = 0.25;

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background =
    "radial-gradient(circle at center, #1b1209 0%, #050302 75%)";
  overlay.style.color = "#d8a35d";
  overlay.style.fontFamily = "Consolas, 'Courier New', monospace";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "48px";
  overlay.style.textAlign = "left";
  overlay.style.letterSpacing = "1px";

  const panel = document.createElement("div");
  panel.style.maxWidth = "920px";
  panel.style.width = "100%";
  panel.style.padding = "36px 42px";
  panel.style.border = "1px solid rgba(216, 163, 93, 0.45)";
  panel.style.background = "rgba(20, 10, 4, 0.72)";
  panel.style.boxShadow = "0 0 35px rgba(216, 120, 45, 0.22)";
  panel.style.borderRadius = "12px";

  const title = document.createElement("div");
  title.textContent = "DINOSESCAPE // GENESIS LOG";
  title.style.color = "#f0c07a";
  title.style.fontSize = "18px";
  title.style.marginBottom = "28px";
  title.style.letterSpacing = "3px";
  title.style.textTransform = "uppercase";

  const textContainer = document.createElement("div");
  textContainer.style.fontSize = "22px";
  textContainer.style.lineHeight = "1.55";
  textContainer.style.textShadow = "0 0 10px rgba(216, 130, 60, 0.45)";

  const hint = document.createElement("div");
  hint.textContent = "ENTER: continue / complete line  |  ESC: skip intro";
  hint.style.marginTop = "28px";
  hint.style.fontSize = "14px";
  hint.style.color = "#b47a3c";
  hint.style.opacity = "0.85";
  hint.style.textAlign = "center";

  panel.appendChild(title);
  panel.appendChild(textContainer);
  panel.appendChild(hint);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function playTypingSound() {
    typingSound.pause();
    typingSound.currentTime = 0;
    typingSound.play().catch(() => {});
  }

  function stopTypingSound() {
    typingSound.pause();
    typingSound.currentTime = 0;
  }

  function finishIntro() {
    clearInterval(typingInterval);
    stopTypingSound();
    window.removeEventListener("keydown", handleKey);
    overlay.remove();
    onFinish();
  }

  function createNewParagraph() {
    currentParagraph = document.createElement("p");
    currentParagraph.style.margin = "0 0 14px";
    currentParagraph.style.opacity = "0";
    currentParagraph.style.transition = "opacity 0.45s ease";
    textContainer.appendChild(currentParagraph);

    requestAnimationFrame(() => {
      currentParagraph.style.opacity = "1";
    });
  }

  function startTypingLine() {
    if (lineIndex >= lines.length) {
      finishIntro();
      return;
    }

    isTyping = true;
    charIndex = 0;
    createNewParagraph();
    playTypingSound();

    clearInterval(typingInterval);

    typingInterval = setInterval(() => {
      currentParagraph.textContent += lines[lineIndex][charIndex];
      charIndex++;

      if (charIndex >= lines[lineIndex].length) {
        clearInterval(typingInterval);
        isTyping = false;
        stopTypingSound();
      }
    }, 32);
  }

  function completeCurrentLine() {
    clearInterval(typingInterval);
    currentParagraph.textContent = lines[lineIndex];
    charIndex = lines[lineIndex].length;
    isTyping = false;
    stopTypingSound();
  }

  function nextLine() {
    if (isTyping) {
      completeCurrentLine();
      return;
    }

    lineIndex++;

    if (lineIndex >= lines.length) {
      finishIntro();
      return;
    }

    startTypingLine();
  }

  function handleKey(event) {
    if (event.key === "Escape") {
      finishIntro();
      return;
    }

    if (event.key === "Enter") {
      nextLine();
    }
  }

  window.addEventListener("keydown", handleKey);
  startTypingLine();
}
