.hidden {
  display: none !important;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.65);
  display: grid;
  place-items: center;
  z-index: 9999;
  padding: 20px;
}

.modal-card {
  background: white;
  color: #1f2937;
  border-radius: 12px;
  padding: 20px;
  width: min(620px, 100%);
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
}

.wide-modal {
  width: min(760px, 100%);
}

.notes-box {
  width: 100%;
  min-height: 240px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-family: Arial, sans-serif;
  font-size: 15px;
  box-sizing: border-box;
}
