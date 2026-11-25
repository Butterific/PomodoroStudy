    
const taskform = document.querySelector('#task-form');
const taskinput = document.querySelector('#task-input');
const tasklist = document.querySelector('#task-list');
const emptytaskmessage = document.querySelector('#empty-task-message');

taskform.addEventListener('submit', (event) => {
    event.preventDefault();

    const taskname = taskinput.value.trim();
    if (!taskname) return;

    const taskitem = document.createElement('li');
    taskitem.textContent = taskname;
    tasklist.appendChild(taskitem);
    emptytaskmessage.remove();
    taskinput.value = '';
    taskinput.focus();
});