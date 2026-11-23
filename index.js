document.querySelector('#startButton').addEventListener('click', () => {
changeShaderColors([
  '#140d08',
  '#b85f35',
  '#4a2718',
  '#f2c66d'
], 1500);
});



// color change scripts, made with ai

function colorToRgb(hex) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function mixColor(from, to, progress) {
  const a = colorToRgb(from);
  const b = colorToRgb(to);

  return '#' + a
    .map((channel, index) =>
      Math.round(channel + (b[index] - channel) * progress)
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
}

function changeShaderColors(colors, duration = 1000) {
  const startColors = ['#07130f', '#31584a', '#101d18', '#9ac5a7'];
  const startTime = performance.now();

  function animate(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = progress * progress * (3 - 2 * progress);

    window.__setShaderColors(
      ...startColors.map((color, index) =>
        mixColor(color, colors[index], eased)
      )
    );

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}