    
const taskform = document.querySelector('#task-form');
const taskinput = document.querySelector('#task-input');
const tasklist = document.querySelector('#task-list');
const emptytaskmessage = document.querySelector('#empty-task-message');

taskform.addEventListener('submit', (event) => {
    event.preventDefault();

    const taskname = taskinput.value.trim();
    if (!taskname) return;

    const taskitem = document.createElement('li');
    taskitem.className = 'task-item';

    const tasklabel = document.createElement('label');
    tasklabel.className = 'task-label';

    const checkbox = document.createElement('input');
    checkbox.className = 'task-checkbox';
    checkbox.type = 'checkbox';

    const tasktext = document.createElement('span');
    tasktext.className = 'task-text';
    tasktext.textContent = taskname;

    checkbox.addEventListener('change', () => {
        taskitem.classList.toggle('completed', checkbox.checked);
    });

    tasklabel.append(checkbox, tasktext);
    taskitem.appendChild(tasklabel);
    tasklist.appendChild(taskitem);
    if (emptytaskmessage.parentElement === tasklist) {
        emptytaskmessage.remove();
    }
    taskinput.value = '';
    taskinput.focus();
});