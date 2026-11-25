let randomaudio = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
const audio = new Audio(`music/${randomaudio}.mp3`);

document.querySelector('#startbutton').addEventListener('click', () => {
  audio.play();
  audio.loop = true;
  document.querySelector('#musicdisplay').textContent = `Now Playing: ${randomaudio}.mp3`;
});
document.querySelector('#pausebutton').addEventListener('click', () => {
  audio.pause();
  document.querySelector('#musicdisplay').textContent = `Paused: ${randomaudio}.mp3`;
});
document.querySelector('#resetbutton').addEventListener('click', () => {
  audio.pause();
  audio.currentTime = 0;
  document.querySelector('#musicdisplay').textContent = `Reset: ${randomaudio}.mp3`;
});


