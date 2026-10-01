(function (root) {
  "use strict";

  const priorities = ["low", "medium", "high"];

  function createId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") {
      return root.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function createEmptyState() {
    return { tasks: [], notes: [] };
  }

  function createState() {
    return createEmptyState();
  }

  function requireState(state) {
    if (!state || !Array.isArray(state.tasks) || !Array.isArray(state.notes)) {
      throw new TypeError("State must contain task and note arrays");
    }
  }

  function requireText(value, field, maxLength) {
    if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
      throw new TypeError(`${field} must be a non-empty string of at most ${maxLength} characters`);
    }
    return value.trim();
  }

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }

  function normalizeTaskInput(input, current) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("Task data must be an object");
    }
    const merged = Object.assign({}, current || {}, input);
    const task = {
      title: requireText(merged.title, "Title", 120),
      description: merged.description === undefined ? "" : merged.description,
      category: requireText(merged.category === undefined ? "Personal" : merged.category, "Category", 32),
      priority: merged.priority === undefined ? "medium" : merged.priority,
      dueDate: merged.dueDate === undefined ? "" : merged.dueDate,
      completed: merged.completed === undefined ? false : merged.completed
    };
    if (typeof task.description !== "string" || task.description.length > 500) {
      throw new TypeError("Details must be text of at most 500 characters");
    }
    if (!priorities.includes(task.priority)) {
      throw new TypeError("Priority must be low, medium, or high");
    }
    if (typeof task.dueDate !== "string" || (task.dueDate && !isValidDate(task.dueDate))) {
      throw new TypeError("Due date must use YYYY-MM-DD format");
    }
    if (typeof task.completed !== "boolean") {
      throw new TypeError("Completed must be a boolean");
    }
    return task;
  }

  function createTask(state, input, id, now) {
    requireState(state);
    const taskId = id || createId();
    if (state.tasks.some((task) => task.id === taskId)) {
      throw new TypeError("Task ID already exists");
    }
    const timestamp = now || new Date().toISOString();
    const task = Object.assign({ id: taskId, createdAt: timestamp, updatedAt: timestamp }, normalizeTaskInput(input));
    return Object.assign({}, state, { tasks: state.tasks.concat(task) });
  }

  function updateTask(state, id, updates, now) {
    requireState(state);
    const current = state.tasks.find((task) => task.id === id);
    if (!current) throw new RangeError("Task not found");
    const task = Object.assign({}, current, normalizeTaskInput(updates, current), { updatedAt: now || new Date().toISOString() });
    return Object.assign({}, state, { tasks: state.tasks.map((item) => item.id === id ? task : item) });
  }

  function deleteTask(state, id) {
    requireState(state);
    if (!state.tasks.some((task) => task.id === id)) throw new RangeError("Task not found");
    return Object.assign({}, state, {
      tasks: state.tasks.filter((task) => task.id !== id),
      notes: state.notes.map((note) => note.taskId === id ? Object.assign({}, note, { taskId: null }) : note)
    });
  }

  function toggleTask(state, id, now) {
    requireState(state);
    const task = state.tasks.find((item) => item.id === id);
    if (!task) throw new RangeError("Task not found");
    return updateTask(state, id, { completed: !task.completed }, now);
  }

  function normalizeNoteInput(state, input, current) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("Note data must be an object");
    }
    const merged = Object.assign({}, current || {}, input);
    const note = {
      title: requireText(merged.title, "Title", 100),
      content: requireText(merged.content, "Note", 3000),
      taskId: merged.taskId || null
    };
    if (note.taskId !== null && !state.tasks.some((task) => task.id === note.taskId)) {
      throw new RangeError("Related task not found");
    }
    return note;
  }

  function createNote(state, input, id, now) {
    requireState(state);
    const noteId = id || createId();
    if (state.notes.some((note) => note.id === noteId)) throw new TypeError("Note ID already exists");
    const timestamp = now || new Date().toISOString();
    const note = Object.assign({ id: noteId, createdAt: timestamp, updatedAt: timestamp }, normalizeNoteInput(state, input));
    return Object.assign({}, state, { notes: state.notes.concat(note) });
  }

  function updateNote(state, id, updates, now) {
    requireState(state);
    const current = state.notes.find((note) => note.id === id);
    if (!current) throw new RangeError("Note not found");
    const note = Object.assign({}, current, normalizeNoteInput(state, updates, current), { updatedAt: now || new Date().toISOString() });
    return Object.assign({}, state, { notes: state.notes.map((item) => item.id === id ? note : item) });
  }

  function deleteNote(state, id) {
    requireState(state);
    if (!state.notes.some((note) => note.id === id)) throw new RangeError("Note not found");
    return Object.assign({}, state, { notes: state.notes.filter((note) => note.id !== id) });
  }

  function filterTasks(state, filters) {
    requireState(state);
    const options = filters || {};
    const query = typeof options.query === "string" ? options.query.trim().toLowerCase() : "";
    return state.tasks.filter((task) => {
      const matchesQuery = !query || [task.title, task.description, task.category].some((value) => value.toLowerCase().includes(query));
      const matchesPriority = !options.priority || task.priority === options.priority;
      const matchesCategory = !options.category || task.category === options.category;
      const matchesStatus = !options.status || options.status === "all" || (options.status === "completed" ? task.completed : options.status === "active" ? !task.completed : true);
      return matchesQuery && matchesPriority && matchesCategory && matchesStatus;
    });
  }

  function getSummary(state) {
    requireState(state);
    const completed = state.tasks.filter((task) => task.completed).length;
    return {
      total: state.tasks.length,
      completed,
      active: state.tasks.length - completed,
      highPriority: state.tasks.filter((task) => task.priority === "high" && !task.completed).length
    };
  }

  root.TaskStore = Object.freeze({
    createId,
    createEmptyState,
    createState,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    createNote,
    updateNote,
    deleteNote,
    filterTasks,
    getSummary
  });
})(typeof window === "undefined" ? globalThis : window);