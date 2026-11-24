const seconds = 25 * 60;
const timedisplay = document.querySelector('#timedisplay');

let timeleft = seconds;
let countdown = null;

function updatetimedisplay() {
    const minutes = Math.floor(timeleft / 60);
    const seconds = timeleft % 60;
    timedisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (countdown !== null) return;

    if (timeleft === 0) {
        timeleft = seconds;
        updatetimedisplay();
    }

    countdown = setInterval(() => {
        timeleft--;
        updatetimedisplay();

        if (timeleft <= 0) {
            clearInterval(countdown);
            countdown = null;
            timedisplay.textContent = 'Time is up!';
        }
    }, 1000);
}

function pauseTimer() {
    if (countdown === null) return;

    clearInterval(countdown);
    countdown = null;
}

function resetTimer() {
    if (countdown !== null) {
        clearInterval(countdown);
        countdown = null;
    }

    timeleft = seconds;
    updatetimedisplay();
}

document.querySelector('#startbutton').addEventListener('click', startTimer);
document.querySelector('#pausebutton').addEventListener('click', pauseTimer);
document.querySelector('#resetbutton').addEventListener('click', resetTimer);

updatetimedisplay();