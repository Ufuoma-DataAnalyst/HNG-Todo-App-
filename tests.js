(function () {
  "use strict";

  const store = window.TaskStore;
  const results = document.getElementById("results");
  const summary = document.getElementById("summary");
  let passed = 0;
  let failed = 0;

  function equal(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
    }
  }

  function truthy(value, message) {
    if (!value) throw new Error(message);
  }

  function throws(action, errorType, message) {
    let thrown;
    try { action(); } catch (error) { thrown = error; }
    if (!(thrown instanceof errorType)) throw new Error(`${message}: expected ${errorType.name}`);
  }

  function test(name, action) {
    const item = document.createElement("li");
    try {
      action();
      passed += 1;
      item.className = "pass";
      item.textContent = name;
    } catch (error) {
      failed += 1;
      item.className = "fail";
      item.textContent = `${name}: ${error.message}`;
    }
    results.appendChild(item);
  }

  function fixture() {
    const state = store.createState();
    const withFirst = store.createTask(state, { title: "Write proposal", description: "Draft a first version", category: "Work", priority: "high" }, "task-1", "2026-01-01T09:00:00.000Z");
    const withSecond = store.createTask(withFirst, { title: "Buy tea", category: "Personal", priority: "low", completed: true }, "task-2", "2026-01-02T09:00:00.000Z");
    return store.createNote(withSecond, { title: "Proposal context", content: "Share the draft on Friday.", taskId: "task-1" }, "note-1", "2026-01-03T09:00:00.000Z");
  }

  test("createId returns distinct non-empty identifiers", () => {
    const first = store.createId();
    const second = store.createId();
    truthy(first && typeof first === "string", "identifier should be a string");
    truthy(first !== second, "identifiers should be distinct");
  });

  test("createState returns empty task and note collections", () => {
    equal(store.createState(), { tasks: [], notes: [] }, "empty state");
  });

  test("createTask applies defaults and does not mutate prior state", () => {
    const initial = store.createState();
    const next = store.createTask(initial, { title: "  Plan week  " }, "task-a", "2026-02-01T10:00:00.000Z");
    equal(initial.tasks, [], "original tasks");
    equal(next.tasks[0], { id: "task-a", createdAt: "2026-02-01T10:00:00.000Z", updatedAt: "2026-02-01T10:00:00.000Z", title: "Plan week", description: "", category: "Personal", priority: "medium", dueDate: "", completed: false }, "created task");
    throws(() => store.createTask(next, { title: "Duplicate" }, "task-a"), TypeError, "duplicate task ID");
    throws(() => store.createTask(initial, { title: "   " }, "task-b"), TypeError, "blank task title");
    throws(() => store.createTask(initial, { title: "Task", priority: "urgent" }, "task-b"), TypeError, "invalid priority");
    throws(() => store.createTask(initial, { title: "Task", dueDate: "not-a-date" }, "task-b"), TypeError, "invalid due date");
    throws(() => store.createTask(initial, { title: "Task", dueDate: "2026-02-30" }, "task-b"), TypeError, "impossible calendar date");
    throws(() => store.createTask({}, { title: "Task" }, "task-b"), TypeError, "invalid state");
  });

  test("updateTask changes fields, preserves metadata, and validates IDs and data", () => {
    const initial = fixture();
    const updated = store.updateTask(initial, "task-1", { title: "Send proposal", completed: true }, "2026-02-04T12:00:00.000Z");
    equal(updated.tasks[0].title, "Send proposal", "updated title");
    equal(updated.tasks[0].completed, true, "updated completion");
    equal(updated.tasks[0].createdAt, initial.tasks[0].createdAt, "creation timestamp");
    equal(updated.tasks[0].updatedAt, "2026-02-04T12:00:00.000Z", "update timestamp");
    equal(initial.tasks[0].title, "Write proposal", "original task remains unchanged");
    throws(() => store.updateTask(initial, "missing", { title: "Task" }), RangeError, "missing task ID");
    throws(() => store.updateTask(initial, "task-1", { priority: "urgent" }), TypeError, "invalid updated priority");
  });

  test("deleteTask removes a task and keeps its note as standalone", () => {
    const initial = fixture();
    const next = store.deleteTask(initial, "task-1");
    equal(next.tasks.map((task) => task.id), ["task-2"], "remaining tasks");
    equal(next.notes[0].taskId, null, "unlinked note");
    equal(initial.tasks.length, 2, "original state remains unchanged");
    throws(() => store.deleteTask(initial, "missing"), RangeError, "missing task ID");
  });

  test("toggleTask flips completion and updates the timestamp", () => {
    const initial = fixture();
    const completed = store.toggleTask(initial, "task-1", "2026-03-01T08:00:00.000Z");
    equal(completed.tasks[0].completed, true, "task becomes complete");
    equal(completed.tasks[0].updatedAt, "2026-03-01T08:00:00.000Z", "toggle timestamp");
    equal(store.toggleTask(completed, "task-1").tasks[0].completed, false, "task reopens");
    throws(() => store.toggleTask(initial, "missing"), RangeError, "missing task ID");
  });

  test("createNote supports standalone and related notes with validation", () => {
    const initial = fixture();
    const standalone = store.createNote(initial, { title: "Shopping", content: "Oats and apples" }, "note-2", "2026-01-04T09:00:00.000Z");
    equal(standalone.notes[1].taskId, null, "standalone note");
    const related = store.createNote(initial, { title: "Follow-up", content: "Send by Friday", taskId: "task-2" }, "note-2");
    equal(related.notes[1].taskId, "task-2", "related note");
    throws(() => store.createNote(initial, { title: "Orphan", content: "Text", taskId: "missing" }, "note-2"), RangeError, "missing related task");
    throws(() => store.createNote(initial, { title: "No content", content: " " }, "note-2"), TypeError, "blank note");
    throws(() => store.createNote(initial, { title: "Duplicate", content: "Text" }, "note-1"), TypeError, "duplicate note ID");
  });

  test("updateNote edits content and validates related tasks", () => {
    const initial = fixture();
    const next = store.updateNote(initial, "note-1", { title: "Updated context", taskId: null }, "2026-02-10T09:00:00.000Z");
    equal(next.notes[0].title, "Updated context", "updated title");
    equal(next.notes[0].taskId, null, "detached note");
    equal(next.notes[0].updatedAt, "2026-02-10T09:00:00.000Z", "updated timestamp");
    equal(initial.notes[0].title, "Proposal context", "original note remains unchanged");
    throws(() => store.updateNote(initial, "missing", { title: "Note" }), RangeError, "missing note ID");
    throws(() => store.updateNote(initial, "note-1", { taskId: "missing" }), RangeError, "invalid related task");
  });

  test("deleteNote removes the requested note and rejects missing IDs", () => {
    const initial = fixture();
    equal(store.deleteNote(initial, "note-1").notes, [], "no notes remain");
    equal(initial.notes.length, 1, "original state remains unchanged");
    throws(() => store.deleteNote(initial, "missing"), RangeError, "missing note ID");
  });

  test("filterTasks combines search, category, priority, and status", () => {
    const state = fixture();
    equal(store.filterTasks(state, { query: "PROPOSAL" }).map((task) => task.id), ["task-1"], "case-insensitive title search");
    equal(store.filterTasks(state, { query: "first version" }).map((task) => task.id), ["task-1"], "description search");
    equal(store.filterTasks(state, { priority: "high", category: "Work", status: "active" }).map((task) => task.id), ["task-1"], "combined filters");
    equal(store.filterTasks(state, { status: "completed" }).map((task) => task.id), ["task-2"], "completed filter");
    equal(store.filterTasks(state, { category: "Missing" }), [], "empty filter results");
    equal(store.filterTasks(state, { status: "all" }).length, 2, "all status");
  });

  test("getSummary counts empty, completed, active, and high-priority tasks", () => {
    equal(store.getSummary(store.createState()), { total: 0, completed: 0, active: 0, highPriority: 0 }, "empty summary");
    equal(store.getSummary(fixture()), { total: 2, completed: 1, active: 1, highPriority: 1 }, "populated summary");
  });

  summary.textContent = `${passed} passed, ${failed} failed`;
  if (failed) summary.classList.add("failed");
  document.title = `${failed ? "FAIL" : "PASS"} - Daymark unit tests`;
})();