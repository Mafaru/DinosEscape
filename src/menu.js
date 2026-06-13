const menuMusic = new Audio("/audio/gameOn.mp3");
menuMusic.loop = true;
menuMusic.volume = 0.35;

function playMenuMusic() {
  menuMusic.play().catch(() => {});
}

export function showMainMenu({ onStart, onTutorial, onStatistics }) {
  playMenuMusic();

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background =
    "radial-gradient(circle at center, #2a1608 0%, #090402 75%)";
  overlay.style.color = "#f0c07a";
  overlay.style.zIndex = "9998";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontFamily = "Consolas, 'Courier New', monospace";

  const title = document.createElement("h1");
  title.innerHTML = "DINOS<span>ESCAPE</span>";
  title.style.fontSize = "82px";
  title.style.margin = "0 0 10px";
  title.style.letterSpacing = "6px";
  title.style.color = "#f0c07a";
  title.style.textShadow =
    "0 0 12px rgba(240,192,122,.75), 0 0 35px rgba(120,55,20,.9)";
  title.querySelector("span").style.color = "#a84b22";

  const subtitle = document.createElement("div");
  subtitle.textContent = "GENETIC CONTAINMENT FAILURE";
  subtitle.style.marginBottom = "42px";
  subtitle.style.color = "#b47a3c";
  subtitle.style.letterSpacing = "4px";

  const content = document.createElement("div");
  content.style.minHeight = "220px";
  content.style.display = "flex";
  content.style.alignItems = "center";
  content.style.justifyContent = "center";

  const buttons = document.createElement("div");
  buttons.style.display = "flex";
  buttons.style.flexDirection = "column";
  buttons.style.gap = "16px";

  function createButton(label, onClick) {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.width = "280px";
    button.style.padding = "16px 24px";
    button.style.border = "1px solid #d8a35d";
    button.style.background = "rgba(18, 8, 3, 0.75)";
    button.style.color = "#f0c07a";
    button.style.fontSize = "18px";
    button.style.letterSpacing = "2px";
    button.style.cursor = "pointer";
    button.style.textTransform = "uppercase";
    button.style.boxShadow = "0 0 18px rgba(216, 120, 45, 0.25)";

    button.onmouseenter = () => {
      button.style.background = "rgba(216, 120, 45, 0.22)";
      button.style.transform = "scale(1.04)";
    };

    button.onmouseleave = () => {
      button.style.background = "rgba(18, 8, 3, 0.75)";
      button.style.transform = "scale(1)";
    };

    button.onclick = onClick;
    return button;
  }

  function showButtons() {
    content.innerHTML = "";
    buttons.innerHTML = "";

    buttons.appendChild(
      createButton("Start Game", () => {
        overlay.remove();
        onStart();
      })
    );

    buttons.appendChild(createButton("Tutorial", showTutorial));
    buttons.appendChild(createButton("Statistics", showStatistics));

    content.appendChild(buttons);
  }

  function createPanel(titleText, bodyText) {
    content.innerHTML = "";

    const panel = document.createElement("div");
    panel.style.width = "620px";
    panel.style.padding = "28px";
    panel.style.border = "1px solid rgba(216, 163, 93, 0.45)";
    panel.style.background = "rgba(20, 10, 4, 0.78)";
    panel.style.boxShadow = "0 0 35px rgba(216, 120, 45, 0.22)";
    panel.style.borderRadius = "12px";
    panel.style.textAlign = "center";

    const h2 = document.createElement("h2");
    h2.textContent = titleText;
    h2.style.marginTop = "0";
    h2.style.letterSpacing = "3px";
    h2.style.color = "#f0c07a";

    const p = document.createElement("div");
    p.innerHTML = bodyText;
    p.style.fontSize = "18px";
    p.style.lineHeight = "1.7";
    p.style.color = "#d8a35d";

    const back = createButton("Back", showButtons);
    back.style.marginTop = "24px";

    panel.appendChild(h2);
    panel.appendChild(p);
    panel.appendChild(back);
    content.appendChild(panel);
  }

  function showTutorial() {
    createPanel(
      "Tutorial",
      `
      ← / A : move left<br>
      → / D : move right<br>
      SPACE / W / ↑ : jump<br><br>
      Avoid obstacles, jump over cone walls,<br>
      collect glowing bones to recover one life.
      `
    );

    if (onTutorial) onTutorial();
  }

  function showStatistics() {
    const bestScore = localStorage.getItem("dinosEscapeBestScore") || 0;

    createPanel(
      "Statistics",
      `
      Best score:<br>
      <span style="font-size:42px;color:#f0c07a">${bestScore}</span>
      `
    );

    if (onStatistics) onStatistics();
  }

  overlay.appendChild(title);
  overlay.appendChild(subtitle);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  showButtons();
}