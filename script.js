function toast(msg, type = 'info', icon = '·') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icon}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastIn .3s ease reverse forwards';
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

function addTodo(text, priority, category, dueDate) {
  if (!text.trim()) return false;
  todos.unshift({
    id: uid(),
    text: text.trim(),
    done: false,
    priority,
    category,
    dueDate: dueDate || '',
    createdAt: new Date().toISOString()
  });
  save(); render();
  return true;
}

function toggleTodo(id) {
  const t = todos.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  save(); render();
  toast(t.done ? 'Task completed!' : 'Task reopened.', t.done ? 'success' : 'info', t.done ? '✓' : '↩');
}

function deleteTodo(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.classList.add('removing');
    setTimeout(() => {
      todos = todos.filter(x => x.id !== id);
      selectedIds.delete(id);
      save(); render();
    }, 220);
  }
}

function editTodo(id, newText) {
  const t = todos.find(x => x.id === id);
  if (t && newText.trim()) { t.text = newText.trim(); save(); render(); }
}
