document.querySelector('#startbutton').addEventListener('click', () => {
  changeShaderColors([
    '#19c957',
    '#298b20',
    '#366744',
    '#74df6a'
  ], 1500);
});
document.querySelector('#resetbutton').addEventListener('click', () => {
  changeShaderColors([
    '#98F5E1',
    '#B5B9FF',
    '#FFF07C',
    '#FFB7B2'
  ], 1500);
});

// shader color change scripts, made with ai
let currentShaderColors = ['#98F5E1', '#B5B9FF', '#FFF07C', '#FFB7B2'];
let colorAnimationFrame = null;

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

function changeShaderColors(targetColors, duration = 1000) {
  if (!window.__setShaderColors) return;

  if (colorAnimationFrame !== null) {
    cancelAnimationFrame(colorAnimationFrame);
  }

  const startColors = [...currentShaderColors];
  const startTime = performance.now();

  function animate(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = progress * progress * (3 - 2 * progress);

    const interpolatedColors = startColors.map((color, index) =>
      mixColor(color, targetColors[index], eased)
    );

    window.__setShaderColors(...interpolatedColors);

    if (progress < 1) {
      colorAnimationFrame = requestAnimationFrame(animate);
    } else {
      currentShaderColors = [...targetColors];
      colorAnimationFrame = null;
    }
  }

  colorAnimationFrame = requestAnimationFrame(animate);
}