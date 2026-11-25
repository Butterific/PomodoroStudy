document.addEventListener('DOMContentLoaded', () => {
    const splash = document.createElement('div');
    splash.id = 'headphone-splash';

    splash.style.position = "fixed";
  splash.style.top = "0";
  splash.style.left = "0";
  splash.style.width = "100vw";
  splash.style.height = "100vhvh"; // fallback
  splash.style.height = "100vh";
  splash.style.backgroundColor = "#000000";
  splash.style.display = "flex";
  splash.style.justifyContent = "center";
  splash.style.alignItems = "center";
  splash.style.zIndex = "99999";
  splash.style.opacity = "1";

  splash.style.transition = "opacity 1s ease";

  const text = document.createElement('h1');
  text.textContent = "Please wear headphones for the best experience.";
  text.style.fontFamily = "'Times New Roman', Times, serif";
  text.style.fontSize = "2rem";
  text.style.fontWeight = "normal";
  text.style.letterSpacing = "1px";
  text.style.textAlign = "center";
  text.style.padding = "0 20px";

  const skipButton = document.createElement('button');
  skipButton.type = 'button';
  skipButton.id = 'headphone-splash-skip';
  skipButton.textContent = 'Click to skip';

  splash.appendChild(text);
  splash.appendChild(skipButton);
  document.body.appendChild(splash);

  let dismissed = false;
  const dismissSplash = () => {
    if (dismissed) return;
    dismissed = true;
    splash.style.opacity = "0";

    setTimeout(() => {
      splash.remove();
    }, 1000);
  };

  skipButton.addEventListener('click', dismissSplash);
  setTimeout(dismissSplash, 4000);
});