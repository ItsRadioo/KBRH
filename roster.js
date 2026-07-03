function addClientNote() {
  const client = rosterState.roster.find(item => item.id === notesClientId);
  if (!client) return;

  const author = getInputValue("noteAuthor");
  const text = getInputValue("newNoteText");

  if (!author) {
    alert("Please enter your name.");
    return;
  }

  if (!text) {
    alert("Enter a note first.");
    return;
  }

  client.notes = Array.isArray(client.notes) ? client.notes : [];

  client.notes.unshift({
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: new Date().toISOString()
  });

  document.getElementById("noteAuthor").value = "";
  document.getElementById("newNoteText").value = "";

  renderNotesModal(client);
  renderRoster();
  saveRoster();
}

function deleteClientNote(noteId) {
  const client = rosterState.roster.find(item => item.id === notesClientId);
  if (!client) return;

  if (!confirm("Delete this note?")) return;

  client.notes = Array.isArray(client.notes)
    ? client.notes.filter(note => note.id !== noteId)
    : [];

  renderNotesModal(client);
  renderRoster();
  saveRoster();
}

function renderNotesModal(client) {
  const list = document.getElementById("notesList");
  if (!list) return;

  const notes = Array.isArray(client.notes) ? client.notes : [];

  list.innerHTML = notes.length
    ? notes.map(note => `
        <li class="note-item">
          <div>
            <div><strong>${escapeHtml(note.author || "Unknown")}</strong></div>
            <div>• ${escapeHtml(note.text)}</div>
            <small>${escapeHtml(formatDateTime(note.createdAt))}</small>
          </div>
          <button type="button" class="danger" onclick="deleteClientNote('${note.id}')">Delete</button>
        </li>
      `).join("")
    : `<li class="empty">No notes yet.</li>`;
}

function renderNotesModal(client) {
  const list = document.getElementById("notesList");
  if (!list) return;

  const notes = Array.isArray(client.notes) ? client.notes : [];

  list.innerHTML = notes.length
    ? notes.map(note => `
        <li class="note-item">
          <div>
            <div><strong>${escapeHtml(note.author || "Unknown")}</strong></div>
            <div>• ${escapeHtml(note.text)}</div>
            <small>${escapeHtml(formatDateTime(note.createdAt))}</small>
          </div>
          <button type="button" class="danger" onclick="deleteClientNote('${note.id}')">Delete</button>
        </li>
      `).join("")
    : `<li class="empty">No notes yet.</li>`;
}
