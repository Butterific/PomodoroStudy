document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = `
    *, *::before, *::after {
      cursor: none !important;
    }
  `;
  document.head.appendChild(style);

  const canvas = document.createElement("canvas");
  canvas.id = "cursor-trail-canvas";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "99998"; 
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const cursor = document.createElement("div");
  cursor.id = "scursor"; 
  cursor.style.position = "fixed";
  cursor.style.top = "0";
  cursor.style.left = "0";
  cursor.style.width = "12px"; 
  cursor.style.height = "12px";
  cursor.style.backgroundColor = "#00fe33"; 
  cursor.style.borderRadius = "50%";
  cursor.style.pointerEvents = "none";
  cursor.style.transform = "translate(-50%, -50%)";
  cursor.style.zIndex = "99999";
  cursor.style.willChange = "transform";
  cursor.style.boxShadow = "0 0 10px #00ff2f, 0 0 20px #00ff15";
  document.body.appendChild(cursor);

  let mouseX = 0;
  let mouseY = 0;
  let cursorX = 0;
  let cursorY = 0;
  const speed = 0.2; 

  const history = [];
  const maxHistoryLength = 15;
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener("mouseleave", () => {
    cursor.style.opacity = "0";
    history.length = 0; 
  });

  document.addEventListener("mouseenter", () 