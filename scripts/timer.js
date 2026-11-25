const seconds = 25 * 60;
const timedisplay = document.querySelector('#timedisplay');
const alarm = new Audio(`alarm.wav`);
let timeleft = seconds;
let countdown = null;
let endTime = null;

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

    endTime = Date.now() + timeleft * 1000;
    countdown = setInterval(updatetimer, 250);
    updatetimer();
}

function pauseTimer() {
    if (countdown === null) return;

    timeleft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    endTime = null;
    clearInterval(countdown);
    countdown = null;
    updatetimedisplay();
}

function resetTimer() {
    if (countdown !== null) {
        clearInterval(countdown);
        countdown = null;
    }

    endTime = null;
    timeleft = seconds;
    updatetimedisplay();
}

function updatetimer() {
    timeleft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    updatetimedisplay();

    if (timeleft <= 0) {
        clearInterval(countdown);
        countdown = null;
        endTime = null;
        timedisplay.textContent = 'Time is up!';
        changeShaderColors([
            '#e50909',
            '#c43d14',
            '#f73670',
            '#FFB7B2'
        ], 1500);
        alarm.play();
    }
}

function updateRunningTimer() {
    if (countdown !== null) {
        endTime = Date.now() + timeleft * 1000;
    }
}

document.querySelector('#startbutton').addEventListener('click', startTimer);
document.querySelector('#pausebutton').addEventListener('click', pauseTimer);
document.querySelector('#resetbutton').addEventListener('click', resetTimer);
document.querySelector('#addminutebutton').addEventListener('click', () => {
    timeleft += 60;
    updatetimedisplay();
    updateRunningTimer();
});
document.querySelector('#subminutebutton').addEventListener('click', () => {
    timeleft -= 60;
    if (timeleft < 0) {
        timeleft = 0;
    }
    updatetimedisplay();
    updateRunningTimer();
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && countdown !== null) {
        updatetimer();
    }
});

updatetimedisplay();