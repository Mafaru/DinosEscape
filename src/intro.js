export function startIntro(onFinish) {
  const lines = [
    "ANNO 2147.",
    "Dopo anni di esperimenti segreti, il dottor Elias Vorn riuscì a replicare il gene del Tyrannosaurus Rex.",
    "Il progetto DinosEscape doveva inaugurare una nuova era della bioingegneria.",
    "Ma durante un test notturno, il sistema di contenimento cedette.",
    "La creatura fuggì nella città.",
    "Ora corre tra le strade deserte. Aiutalo a sopravvivere.",
  ];

  let lineIndex = 0;
  let charIndex = 0;
  let typingInterval = null;
  let currentParagraph = null;
  let isTyping = false;

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
  hint.textContent = "INVIO: continua / completa frase  |  ESC: salta intro";
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

  function finishIntro() {
    clearInterval(typingInterval);
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

    clearInterval(typingInterval);

    typingInterval = setInterval(() => {
      currentParagraph.textContent += lines[lineIndex][charIndex];
      charIndex++;

      if (charIndex >= lines[lineIndex].length) {
        clearInterval(typingInterval);
        isTyping = false;
      }
    }, 32);
  }

  function completeCurrentLine() {
    clearInterval(typingInterval);
    currentParagraph.textContent = lines[lineIndex];
    charIndex = lines[lineIndex].length;
    isTyping = false;
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