let randomaudio = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
document.querySelector('#startbutton').addEventListener('click', () => {
  // Play the selected audio file
  const audio = new Audio(`music/${randomaudio}.mp3`);
  audio.play();
});