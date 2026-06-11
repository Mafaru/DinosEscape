export function showMainMenu({ onStart, onTutorial, onStatistics }) {
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
  title.innerHTML = "DINO<span>SESCAPE</span>";
  title.style.fontSize = "82px";
  title.style.margin = "0 0 10px";
  title.style.letterSpacing = "6px";
  title.style.color = "#f0c07a";
  title.style.textShadow =
    "0 0 12px rgba(240, 192, 122, 0.75), 0 0 35px rgba(120, 55, 20, 0.9)";
  title.querySelector("span").style.color = "#a84b22";

  const subtitle = document.createElement("div");
  subtitle.textContent = "GENETIC CONTAINMENT FAILURE";
  subtitle.style.marginBottom = "48px";
  subtitle.style.color = "#b47a3c";
  subtitle.style.letterSpacing = "4px";

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

    button.addEventListener("mouseenter", () => {
      button.style.background = "rgba(216, 120, 45, 0.22)";
      button.style.transform = "scale(1.04)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.background = "rgba(18, 8, 3, 0.75)";
      button.style.transform = "scale(1)";
    });

    button.addEventListener("click", onClick);
    return button;
  }

  buttons.appendChild(createButton("Start Game", () => {
    overlay.remove();
    onStart();
  }));
  buttons.appendChild(createButton("Tutorial", onTutorial));
  buttons.appendChild(createButton("Statistics", onStatistics));

  overlay.appendChild(title);
  overlay.appendChild(subtitle);
  overlay.appendChild(buttons);
  document.body.appendChild(overlay);
}