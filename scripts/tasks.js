    
const taskform = document.querySelector('#task-form');
const taskinput = document.querySelector('#task-input');
const tasklist = document.querySelector('#task-list');
const emptytaskmessage = document.querySelector('#empty-task-message');

function updateemptytaskmessage() {
    const hastasks = tasklist.querySelector('.task-item') !== null;

    if (hastasks) {
        emptytaskmessage.remove();
    } else if (emptytaskmessage.parentElement !== tasklist) {
        tasklist.appendChild(emptytaskmessage);
    }
}

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

    const deletebutton = document.createElement('button');
    deletebutton.className = 'delete-task-button';
    deletebutton.type = 'button';
    deletebutton.textContent = 'Delete';
    deletebutton.setAttribute('aria-label', `Delete task: ${taskname}`);

    deletebutton.addEventListener('click', () => {
        taskitem.remove();
        updateemptytaskmessage();
    });

    tasklabel.append(checkbox, tasktext);
    taskitem.appendChild(tasklabel);
    taskitem.appendChild(deletebutton);
    tasklist.appendChild(taskitem);
    updateemptytaskmessage();
    taskinput.value = '';
    taskinput.focus();
});