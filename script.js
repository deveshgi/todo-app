const STORAGE_KEY = 'taskflow_v2';
let todos = [];
let filter = 'all';
let sort = 'newest';
let search = '';
let selectedIds = new Set();

function load() {
  try { todos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { todos = []; }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dueClass(dateStr) {
  if (!dateStr) return '';
  if (dateStr < today()) return 'overdue';
  if (dateStr === today()) return 'today';
  return '';
}

function priOrder(p) { 
  return { high: 0, medium: 1, low: 2 }[p] ?? 1; 
}

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

function getVisible() {
  let list = [...todos];
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(t => t.text.toLowerCase().includes(q) || t.category?.includes(q));
  }
  if (filter === 'active') list = list.filter(t => !t.done);
  if (filter === 'completed') list = list.filter(t => t.done);
  if (filter === 'high') list = list.filter(t => t.priority === 'high');
  list.sort((a, b) => {
    if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === 'priority') return priOrder(a.priority) - priOrder(b.priority);
    if (sort === 'due') return (a.dueDate || 'zzz').localeCompare(b.dueDate || 'zzz');
    if (sort === 'alpha') return a.text.localeCompare(b.text);
    return new Date(b.createdAt) - new Date(a.createdAt); // newest
  });
  return list;
}

function render() {
  const list = getVisible();
  const container = document.getElementById('todoList');

  // Stats
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const active = total - done;
  const high = todos.filter(t => t.priority === 'high' && !t.done).length;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statActive').textContent = active;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statHigh').textContent = high;
  const pct = total ? Math.round(done / total * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct + '%';

  // Bulk bar
  const bulkBar = document.getElementById('bulkBar');
  if (selectedIds.size > 0) {
    bulkBar.classList.add('visible');
    document.getElementById('bulkCount').textContent = `${selectedIds.size} selected`;
  } else {
    bulkBar.classList.remove('visible');
  }

  // Footer
  const footer = document.getElementById('footer');
  footer.style.display = total ? 'flex' : 'none';
  document.getElementById('footerInfo').textContent =
    `${active} task${active !== 1 ? 's' : ''} left`;

  // Empty state
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="emoji">${search ? '🔍' : filter === 'completed' ? '🎉' : '✦'}</div>
      <p>${search ? 'No tasks match your search.' : filter === 'completed' ? 'No completed tasks yet.' : 'All clear! Add a task above.'}</p>
    </div>`;
    return;
  }

  container.innerHTML = '';
  list.forEach(t => {
    const el = document.createElement('div');
    el.className = `todo-item p-${t.priority}${t.done ? ' done' : ''}${selectedIds.has(t.id) ? ' selected' : ''}`;
    el.dataset.id = t.id;

    const dc = dueClass(t.dueDate);
    const dueBadge = t.dueDate
      ? `<span class="due-tag ${dc}">📅 ${dc === 'overdue' ? 'Overdue · ' : dc === 'today' ? 'Today · ' : ''}${fmt(t.dueDate)}</span>`
      : '';

    el.innerHTML = `
      <div class="todo-checkbox-wrap">
        <input class="bulk-check" type="checkbox" title="Select" ${selectedIds.has(t.id) ? 'checked' : ''} />
        <div class="todo-check ${t.done ? 'checked' : ''}"></div>
      </div>
      <div class="todo-body">
        <div class="todo-text" title="Double-click to edit">${escHtml(t.text)}</div>
        <div class="todo-meta">
          <span class="tag cat-${t.category}">${catLabel(t.category)}</span>
          <span class="tag" style="background:var(--border2);color:var(--muted)">${priLabel(t.priority)}</span>
          ${dueBadge}
        </div>
        <div class="created-at">${fmtCreated(t.createdAt)}</div>
      </div>
      <div class="todo-actions">
        <button class="action-btn edit" title="Edit">✎</button>
        <button class="action-btn del"  title="Delete">✕</button>
      </div>`;

    // Check toggle
    el.querySelector('.todo-check').addEventListener('click', () => {
      el.querySelector('.todo-check').classList.add('check-pop');
      setTimeout(() => toggleTodo(t.id), 150);
    });

    // Bulk select
    el.querySelector('.bulk-check').addEventListener('change', e => {
      if (e.target.checked) selectedIds.add(t.id);
      else selectedIds.delete(t.id);
      render();
    });

    // Edit
    el.querySelector('.action-btn.edit').addEventListener('click', () => startEdit(el, t));
    el.querySelector('.todo-text').addEventListener('dblclick', () => startEdit(el, t));

    // Delete
    el.querySelector('.action-btn.del').addEventListener('click', () => deleteTodo(t.id));

    container.appendChild(el);
  });
}

function startEdit(el, t) {
  const textEl = el.querySelector('.todo-text');
  if (textEl.contentEditable === 'true') return;
  textEl.contentEditable = 'true';
  textEl.focus();
  // move cursor to end
  const range = document.createRange();
  range.selectNodeContents(textEl);
  range.collapse(false);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);

  function commit() {
    textEl.contentEditable = 'false';
    editTodo(t.id, textEl.textContent);
    toast('Task updated.', 'info', '✎');
  }
  textEl.addEventListener('blur', commit, { once: true });
  textEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); textEl.blur(); }
    if (e.key === 'Escape') { textEl.contentEditable = 'false'; render(); }
  }, { once: true });
}

function catLabel(c) {
  return { work: '💼 Work', personal: '🏠 Personal', study: '📚 Study', health: '❤️ Health', other: '📌 Other' }[c] || c;
}

function priLabel(p) {
  return { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[p] || p;
}

function fmtCreated(iso) {
  const d = new Date(iso);
  return `Added ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function doAdd() {
  const text = document.getElementById('taskInput').value;
  const priority = document.getElementById('prioritySelect').value;
  const category = document.getElementById('categorySelect').value;
  const dueDate = document.getElementById('dueDateInput').value;
  if (addTodo(text, priority, category, dueDate)) {
    document.getElementById('taskInput').value = '';
    document.getElementById('dueDateInput').value = '';
    toast('Task added!', 'success', '✦');
  } else {
    toast('Please enter a task.', 'error', '!');
  }
}

document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doAdd();
});

document.getElementById('addBtn').addEventListener('click', doAdd);

document.getElementById('searchInput').addEventListener('input', e => {
  search = e.target.value; render();
});

document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});

document.getElementById('sortSelect').addEventListener('change', e => {
  sort = e.target.value; render();
});

// Footer actions
document.getElementById('completeAllBtn').addEventListener('click', () => {
  todos.forEach(t => t.done = true);
  save(); render();
  toast('All tasks completed!', 'success', '✓');
});

document.getElementById('clearDoneBtn').addEventListener('click', () => {
  const n = todos.filter(t => t.done).length;
  todos = todos.filter(t => !t.done);
  selectedIds = new Set([...selectedIds].filter(id => todos.some(t => t.id === id)));
  save(); render();
  toast(`Cleared ${n} completed task${n !== 1 ? 's' : ''}.`, 'info', '🗑');
});

// Bulk actions
document.getElementById('bulkComplete').addEventListener('click', () => {
  selectedIds.forEach(id => { const t = todos.find(x => x.id === id); if (t) t.done = true; });
  selectedIds.clear(); save(); render();
  toast('Selected tasks completed.', 'success', '✓');
});

document.getElementById('bulkIncomplete').addEventListener('click', () => {
  selectedIds.forEach(id => { const t = todos.find(x => x.id === id); if (t) t.done = false; });
  selectedIds.clear(); save(); render();
});

document.getElementById('bulkDelete').addEventListener('click', () => {
  const n = selectedIds.size;
  todos = todos.filter(t => !selectedIds.has(t.id));
  selectedIds.clear(); save(); render();
  toast(`Deleted ${n} task${n !== 1 ? 's' : ''}.`, 'error', '🗑');
});

document.getElementById('bulkDeselect').addEventListener('click', () => {
  selectedIds.clear(); render();
});

// Theme toggle
let isDark = true;
document.getElementById('themeBtn').addEventListener('click', () => {
  isDark = !isDark;
  document.body.classList.toggle('light', !isDark);
  document.getElementById('themeBtn').textContent = isDark ? '🌙' : '☀️';
});

// Export
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(todos, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `taskflow_${today()}.json`;
  a.click();
  toast('Exported tasks!', 'info', '⬇');
});

// Shortcuts modal
document.getElementById('shortcutsBtn').addEventListener('click', () => {
  document.getElementById('shortcutsModal').classList.add('open');
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('shortcutsModal').classList.remove('open');
});

document.getElementById('shortcutsModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

// Global keyboard shortcuts
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement.contentEditable === 'true';

  if (e.key === 'Escape') {
    document.getElementById('shortcutsModal').classList.remove('open');
    selectedIds.clear(); render();
    return;
  }
  if (e.key === '?' && !isInput) {
    document.getElementById('shortcutsModal').classList.add('open'); return;
  }
  if (!e.ctrlKey && !e.metaKey) return;
  if (e.key === 'f') { e.preventDefault(); document.getElementById('searchInput').focus(); }
  if (e.key === 'n') { e.preventDefault(); document.getElementById('taskInput').focus(); }
  if (e.key === 'd') { e.preventDefault(); document.getElementById('themeBtn').click(); }
  if (e.key === 'e') { e.preventDefault(); document.getElementById('exportBtn').click(); }
  if (e.key === 'a') { e.preventDefault(); document.getElementById('completeAllBtn').click(); }
  if (e.key === 'Backspace') { e.preventDefault(); document.getElementById('clearDoneBtn').click(); }
});

load();

// Seed with sample data on first run
if (todos.length === 0) {
  const samples = [
    { text: 'Review project roadmap for Q3', priority: 'high', category: 'work', dueDate: today() },
    { text: 'Complete JavaScript advanced module', priority: 'high', category: 'study', dueDate: '' },
    { text: 'Morning jog — 5km', priority: 'medium', category: 'health', dueDate: '' },
    { text: 'Buy groceries: eggs, milk, bread', priority: 'low', category: 'personal', dueDate: '' },
    { text: 'Read "Clean Code" chapter 4', priority: 'medium', category: 'study', dueDate: '' },
  ];
  samples.reverse().forEach(s => {
    todos.unshift({ id: uid(), text: s.text, done: false, ...s, createdAt: new Date().toISOString() });
  });
  todos[2].done = true; 
  save();
}

render();