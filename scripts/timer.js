const sessions = {
    focus: { label: 'Focus', minutes: 25 },
    shortBreak: { label: 'Short Break', minutes: 5 },
    longBreak: { label: 'Long Break', minutes: 15 }
};
const focus_rounds_before_long_break = 4;

const time_display = document.querySelector('#timedisplay');
const session_progress = document.querySelector('#session-progress');
const session_message = document.querySelector('#session-message');
const session_buttons = document.querySelectorAll('.session-button');
const alarm = new Audio('alarm.wav');

let current_session = 'focus';
let completed_focus_rounds = 0;
let time_left = sessions[current_session].minutes * 60;
let interval_id = null;
let end_time = null;

function is_running() {
    return interval_id !== null;
}

function full_duration() {
    return sessions[current_session].minutes * 60;
}

function seconds_until_end() {
    return Math.max(0, Math.ceil((end_time - Date.now()) / 1000));
}

function stop_interval() {
    clearInterval(interval_id);
    interval_id = null;
    end_time = null;
}

function render_session_info() {
    session_progress.textContent = `Focus sessions: ${completed_focus_rounds}/${focus_rounds_before_long_break}`;
    session_buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.session === current_session));
    });
}

function render_time() {
    const minutes = String(Math.floor(time_left / 60)).padStart(2, '0');
    const seconds = String(time_left % 60).padStart(2, '0');
    time_display.textContent = `${minutes}:${seconds}`;
}

function select_session(name) {
    stop_interval();
    current_session = name;
    time_left = full_duration();
    session_message.textContent = '';
    render_session_info();
    render_time();
}

function start_timer() {
    if (is_running()) return;

    if (time_left === 0) {
        time_left = full_duration();
        render_time();
    }

    end_time = Date.now() + time_left * 1000;
    interval_id = setInterval(tick, 250);
    tick();
}

function pause_timer() {
    if (!is_running()) return;

    time_left = seconds_until_end();
    stop_interval();
    render_time();
}

function reset_timer() {
    stop_interval();
    time_left = full_duration();
    session_message.textContent = '';
    render_time();
}

function next_session_name() {
    if (current_session !== 'focus') return 'focus';

    completed_focus_rounds++;
    if (completed_focus_rounds === focus_rounds_before_long_break) {
        completed_focus_rounds = 0;
        return 'longBreak';
    }
    return 'shortBreak';
}

function move_to_next_session() {
    select_session(next_session_name());
    session_message.textContent = `${sessions[current_session].label} starting now.`;
    start_timer();
}

function tick() {
    time_left = seconds_until_end();
    render_time();

    if (time_left > 0) return;

    stop_interval();
    time_display.textContent = 'Time is up!';
    changeShaderColors(['#e50909', '#c43d14', '#f73670', '#FFB7B2'], 1500);
    alarm.play();
    move_to_next_session();
}

function adjust_time(seconds) {
    time_left = Math.max(0, time_left + seconds);
    render_time();

    if (is_running()) {
        end_time = Date.now() + time_left * 1000;
    }
}

document.querySelector('#startbutton').addEventListener('click', start_timer);
document.querySelector('#pausebutton').addEventListener('click', pause_timer);
document.querySelector('#resetbutton').addEventListener('click', reset_timer);
document.querySelector('#addminutebutton').addEventListener('click', () => adjust_time(60));
document.querySelector('#subminutebutton').addEventListener('click', () => adjust_time(-60));

session_buttons.forEach((button) => {
    button.addEventListener('click', () => select_session(button.dataset.session));
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && is_running()) tick();
});

render_session_info();
render_time();