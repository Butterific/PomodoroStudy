const sessions = {
    focus: { label: 'Focus', duration: 25 },
    shortBreak: { label: 'Short Break', duration: 5 },
    longBreak: { label: 'Long Break', duration: 15 }
};
const focusSessionsUntilLongBreak = 4;
const timedisplay = document.querySelector('#timedisplay');
const sessionProgress = document.querySelector('#session-progress');
const sessionMessage = document.querySelector('#session-message');
const sessionButtons = document.querySelectorAll('.session-button');
const alarm = new Audio(`alarm.wav`);
let currentSession = 'focus';
let completedFocusSessions = 0;
let timeleft = sessions[currentSession].duration * 60;
let countdown = null;
let endTime = null;

function updateSessionDisplay() {
    sessionProgress.textContent = `Focus sessions: ${completedFocusSessions}/${focusSessionsUntilLongBreak}`;
    sessionButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.session === currentSession));
    });
}

function updatetimedisplay() {
    const minutes = Math.floor(timeleft / 60);
    const seconds = timeleft % 60;
    timedisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function selectSession(sessionName) {
    if (countdown !== null) {
        clearInterval(countdown);
        countdown = null;
    }

    endTime = null;
    currentSession = sessionName;
    timeleft = sessions[currentSession].duration * 60;
    sessionMessage.textContent = '';
    updateSessionDisplay();
    updatetimedisplay();
}

function startTimer() {
    if (countdown !== null) return;

    if (timeleft === 0) {
        timeleft = sessions[currentSession].duration * 60;
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
    timeleft = sessions[currentSession].duration * 60;
    sessionMessage.textContent = '';
    updatetimedisplay();
}

function advanceSession() {
    let nextSession;

    if (currentSession === 'focus') {
        completedFocusSessions++;
        if (completedFocusSessions === focusSessionsUntilLongBreak) {
            completedFocusSessions = 0;
            nextSession = 'longBreak';
        } else {
            nextSession = 'shortBreak';
        }
    } else {
        nextSession = 'focus';
    }

    selectSession(nextSession);
    sessionMessage.textContent = `${sessions[currentSession].label} starting now.`;
    startTimer();
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
        advanceSession();
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
sessionButtons.forEach((button) => {
    button.addEventListener('click', () => {
        selectSession(button.dataset.session);
    });
});
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

updateSessionDisplay();
updatetimedisplay();