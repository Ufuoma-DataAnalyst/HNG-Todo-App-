(function () {
  "use strict";

  const storageKey = "daymark-state-v1";
  const store = window.TaskStore;
  let state = loadState();
  let toastTimeout;

  const taskList = document.getElementById("task-list");
  const notesList = document.getElementById("notes-list");
  const taskDialog = document.getElementById("task-dialog");
  const noteDialog = document.getElementById("note-dialog");
  const taskForm = document.getElementById("task-form");
  const noteForm = document.getElementById("note-form");

  function loadState() {
    try {
      const storedState = localStorage.getItem(storageKey);
      if (storedState === null) return store.createEmptyState();
      const saved = JSON.parse(storedState);
      return saved && Array.isArray(saved.tasks) && Array.isArray(saved.notes) ? saved : store.createEmptyState();
    } catch (error) {
      return store.createEmptyState();
    }
  }

  function saveState(message) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      if (message) showToast(message);
    } catch (error) {
      showToast("Could not save changes in this browser.");
    }
    render();
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2300);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  }

  function formatDate(date) {
    if (!date) return "";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
  }

  function render() {
    renderSummary();
    renderFilters();
    renderTasks();
    renderNotes();
  }

  function renderSummary() {
    const summary = store.getSummary(state);
    document.getElementById("active-count").textContent = summary.active;
    document.getElementById("completed-count").textContent = summary.completed;
    document.getElementById("nav-task-count").textContent = summary.active;
    document.getElementById("focus-copy").textContent = summary.active === 0 ? "A fresh start. Pick one thing." : `${summary.highPriority} high-priority ${summary.highPriority === 1 ? "task" : "tasks"} still open.`;
  }

  function renderTasks() {
    const filters = {
      query: document.getElementById("task-search").value,
      priority: document.getElementById("priority-filter").value,
      category: document.getElementById("category-filter").value,
      status: document.getElementById("status-filter").value
    };
    const tasks = store.filterTasks(state, filters);
    document.getElementById("visible-count").textContent = tasks.length;
    const hasFilters = Boolean(filters.query || filters.priority || filters.category || filters.status !== "all");
    document.getElementById("clear-filters").hidden = !hasFilters;
    if (tasks.length === 0) {
      taskList.innerHTML = state.tasks.length === 0
        ? '<div class="empty-state"><span class="empty-mark">✳</span><h3>A clear page is a good place to start.</h3><p>Add one task and give your day a direction.</p><button class="button button-outline" type="button" data-action="new-task">Create your first task</button></div>'
        : '<div class="empty-state compact-empty"><h3>No tasks found</h3><p>Try changing your search or filters.</p></div>';
      return;
    }
    taskList.innerHTML = tasks.map((task) => `
      <article class="task-row${task.completed ? " is-complete" : ""}" data-task-id="${escapeHtml(task.id)}">
        <button class="task-check${task.completed ? " is-checked" : ""}" type="button" data-action="toggle" aria-label="${task.completed ? "Mark incomplete" : "Mark complete"}: ${escapeHtml(task.title)}" aria-pressed="${task.completed}">${task.completed ? "✓" : ""}</button>
        <div class="task-copy"><div class="task-title-line"><h3>${escapeHtml(task.title)}</h3>${task.dueDate ? `<span class="task-date">${escapeHtml(formatDate(task.dueDate))}</span>` : ""}</div>${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}<div class="task-meta"><span class="category-label">${escapeHtml(task.category)}</span><span class="priority-label priority-${escapeHtml(task.priority)}"><span></span>${escapeHtml(task.priority)} priority</span></div></div>
        <div class="task-actions"><button type="button" data-action="edit" aria-label="Edit ${escapeHtml(task.title)}">Edit</button><button type="button" data-action="delete" aria-label="Delete ${escapeHtml(task.title)}">Delete</button></div>
      </article>`).join("");
  }

  function renderFilters() {
    const categoryFilter = document.getElementById("category-filter");
    const selected = categoryFilter.value;
    const categories = Array.from(new Set(state.tasks.map((task) => task.category))).sort((first, second) => first.localeCompare(second));
    categoryFilter.innerHTML = '<option value="">Any category</option>' + categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
    categoryFilter.value = categories.includes(selected) ? selected : "";

    const noteTask = document.getElementById("note-task");
    const selectedTask = noteTask.value;
    noteTask.innerHTML = '<option value="">Standalone note</option>' + state.tasks.map((task) => `<option value="${escapeHtml(task.id)}">${escapeHtml(task.title)}</option>`).join("");
    noteTask.value = state.tasks.some((task) => task.id === selectedTask) ? selectedTask : "";
  }

  function renderNotes() {
    document.getElementById("notes-count").textContent = `${state.notes.length} ${state.notes.length === 1 ? "note" : "notes"}`;
    if (state.notes.length === 0) {
      notesList.innerHTML = '<div class="empty-state"><span class="empty-mark">✳</span><h3>Save the useful details.</h3><p>Capture a thought, or attach notes to one of your tasks.</p><button class="button button-outline" type="button" data-action="new-note">Write a note</button></div>';
      return;
    }
    notesList.innerHTML = state.notes.slice().sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)).map((note) => {
      const relatedTask = state.tasks.find((task) => task.id === note.taskId);
      return `<article class="note-card" data-note-id="${escapeHtml(note.id)}"><div class="note-card-top"><span class="note-date">${escapeHtml(formatDate(note.updatedAt.slice(0, 10)))}</span><div class="note-actions"><button type="button" data-action="edit-note" aria-label="Edit ${escapeHtml(note.title)}">Edit</button><button type="button" data-action="delete-note" aria-label="Delete ${escapeHtml(note.title)}">Delete</button></div></div><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.content)}</p><div class="note-link">${relatedTask ? `<span class="link-dot"></span> ${escapeHtml(relatedTask.title)}` : '<span class="standalone-mark">○</span> Standalone'}</div></article>`;
    }).join("");
  }

  function openTaskEditor(task) {
    taskForm.reset();
    document.getElementById("task-id").value = task ? task.id : "";
    document.getElementById("task-title").value = task ? task.title : "";
    document.getElementById("task-description").value = task ? task.description : "";
    document.getElementById("task-category").value = task ? task.category : "Personal";
    document.getElementById("task-priority").value = task ? task.priority : "medium";
    document.getElementById("task-due-date").value = task ? task.dueDate : "";
    document.getElementById("task-dialog-title").textContent = task ? "Edit task" : "New task";
    document.getElementById("save-task-button").textContent = task ? "Save changes" : "Add task";
    taskDialog.showModal();
  }

  function openNoteEditor(note) {
    noteForm.reset();
    document.getElementById("note-id").value = note ? note.id : "";
    document.getElementById("note-title").value = note ? note.title : "";
    document.getElementById("note-content").value = note ? note.content : "";
    document.getElementById("note-task").value = note ? note.taskId || "" : "";
    document.getElementById("note-dialog-title").textContent = note ? "Edit note" : "New note";
    document.getElementById("save-note-button").textContent = note ? "Save changes" : "Save note";
    noteDialog.showModal();
  }

  function switchView(view) {
    const showingTasks = view === "tasks";
    document.getElementById("tasks-view").hidden = !showingTasks;
    document.getElementById("notes-view").hidden = showingTasks;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
    document.title = `${showingTasks ? "Ufuoma's Daily Task." : "Notes"} - DMH To-Do-List`;
    history.replaceState(null, "", `#${view}`);
  }

  document.getElementById("today-label").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase();
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  document.getElementById("new-task-button").addEventListener("click", () => openTaskEditor());
  document.getElementById("new-note-button").addEventListener("click", () => openNoteEditor());
  document.getElementById("task-search").addEventListener("input", renderTasks);
  ["priority-filter", "category-filter", "status-filter"].forEach((id) => document.getElementById(id).addEventListener("change", renderTasks));
  document.getElementById("clear-filters").addEventListener("click", () => {
    document.getElementById("task-search").value = "";
    document.getElementById("priority-filter").value = "";
    document.getElementById("category-filter").value = "";
    document.getElementById("status-filter").value = "all";
    renderTasks();
  });

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = document.getElementById("task-id").value;
    const input = {
      title: document.getElementById("task-title").value,
      description: document.getElementById("task-description").value,
      category: document.getElementById("task-category").value,
      priority: document.getElementById("task-priority").value,
      dueDate: document.getElementById("task-due-date").value
    };
    try {
      state = id ? store.updateTask(state, id, input) : store.createTask(state, input);
      taskDialog.close();
      saveState(id ? "Task updated." : "Task added.");
    } catch (error) {
      showToast(error.message);
    }
  });

  noteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = document.getElementById("note-id").value;
    const input = {
      title: document.getElementById("note-title").value,
      content: document.getElementById("note-content").value,
      taskId: document.getElementById("note-task").value || null
    };
    try {
      state = id ? store.updateNote(state, id, input) : store.createNote(state, input);
      noteDialog.close();
      saveState(id ? "Note updated." : "Note saved.");
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.close).close()));

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const taskRow = button.closest("[data-task-id]");
    const noteCard = button.closest("[data-note-id]");
    if (action === "new-task") openTaskEditor();
    if (action === "new-note") openNoteEditor();
    if (taskRow) {
      const task = state.tasks.find((item) => item.id === taskRow.dataset.taskId);
      if (!task) return;
      if (action === "toggle") state = store.toggleTask(state, task.id);
      if (action === "edit") return openTaskEditor(task);
      if (action === "delete" && window.confirm(`Delete “${task.title}”?`)) state = store.deleteTask(state, task.id);
      if (action === "toggle" || action === "delete") saveState(action === "toggle" ? (task.completed ? "Task reopened." : "Task completed.") : "Task deleted.");
    }
    if (noteCard) {
      const note = state.notes.find((item) => item.id === noteCard.dataset.noteId);
      if (!note) return;
      if (action === "edit-note") return openNoteEditor(note);
      if (action === "delete-note" && window.confirm(`Delete “${note.title}”?`)) {
        state = store.deleteNote(state, note.id);
        saveState("Note deleted.");
      }
    }
  });

  if (location.hash === "#notes") switchView("notes");
  render();
})();