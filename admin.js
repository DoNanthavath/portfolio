/* ═══════════════════════════════════════════════════════
   DO NANTHAVATH — ADMIN MEDIA MANAGER JS
════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STATUS = document.getElementById('statusMsg');
  const TOAST  = document.getElementById('toast');
  let toastTimer;

  // ── TOAST ─────────────────────────────────────────────
  function toast(msg, type = '') {
    clearTimeout(toastTimer);
    TOAST.textContent = msg;
    TOAST.className   = 'toast show ' + type;
    toastTimer = setTimeout(() => { TOAST.className = 'toast'; }, 3000);
  }

  // ── STATUS ────────────────────────────────────────────
  function setStatus(msg, cls = '') {
    STATUS.textContent = msg;
    STATUS.className   = 'adm-status ' + cls;
  }

  // ── LOAD EXISTING MEDIA ───────────────────────────────
  async function loadMedia() {
    try {
      const res  = await fetch('/api/media');
      const data = await res.json();
      let filled = 0;
      for (const [slot, info] of Object.entries(data)) {
        if (info.exists) {
          filled++;
          applyExistingMedia(slot, info);
        }
      }
      const total = Object.keys(data).length;
      setStatus(`${filled}/${total} slots filled`, filled === total ? 'ok' : '');
    } catch (e) {
      setStatus('Could not load media', 'err');
    }
  }

  function applyExistingMedia(slot, info) {
    const preview  = document.getElementById(`preview-${slot}`);
    const fname    = document.getElementById(`fname-${slot}`);
    const delBtn   = document.getElementById(`del-${slot}`);
    const slotEl   = document.querySelector(`[data-slot="${slot}"]`);
    if (!preview) return;

    const path = info.path + '?t=' + Date.now();
    const isVideo = info.ext === 'mp4' || info.ext === 'webm' || info.ext === 'mov';

    if (isVideo) {
      preview.innerHTML = `<video src="${path}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
    } else {
      preview.innerHTML = `<img src="${path}" alt="${slot}" style="width:100%;height:100%;object-fit:cover;display:block;"/>`;
    }

    const filename = info.path.split('/').pop();
    fname.textContent = filename;
    fname.classList.add('has-file');
    if (delBtn) delBtn.style.display = 'inline-block';
    if (slotEl) slotEl.classList.add('success');
  }

  // ── UPLOAD FILE ───────────────────────────────────────
  async function uploadFile(slot, file) {
    const slotEl  = document.querySelector(`[data-slot="${slot}"]`);
    const prog    = document.getElementById(`prog-${slot}`);
    const progBar = prog ? prog.querySelector('.drop-progress-bar') : null;
    const fname   = document.getElementById(`fname-${slot}`);
    const delBtn  = document.getElementById(`del-${slot}`);
    const preview = document.getElementById(`preview-${slot}`);

    const ext = file.name.split('.').pop().toLowerCase();

    // Validate type
    const accept = slotEl.dataset.accept;
    const isImg = accept.includes('image') && file.type.startsWith('image/');
    const isVid = accept.includes('video') && file.type.startsWith('video/');
    if (!isImg && !isVid) {
      toast(`Wrong file type for ${slot}`, 'err');
      return;
    }

    slotEl.classList.add('uploading');
    slotEl.classList.remove('success', 'error');
    setStatus(`Uploading ${slot}...`);

    // Animate progress bar (simulated — fetch streams don't expose upload progress easily)
    let pct = 0;
    const fakeProgress = setInterval(() => {
      pct = Math.min(pct + Math.random() * 15, 88);
      if (progBar) progBar.style.width = pct + '%';
    }, 150);

    try {
      const res  = await fetch(`/upload?slot=${slot}&ext=${ext}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      clearInterval(fakeProgress);
      if (progBar) progBar.style.width = '100%';

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Show preview
      const isVideo = file.type.startsWith('video/');
      const objUrl  = URL.createObjectURL(file);
      if (isVideo) {
        preview.innerHTML = `<video src="${objUrl}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
      } else {
        preview.innerHTML = `<img src="${objUrl}" alt="${slot}" style="width:100%;height:100%;object-fit:cover;display:block;"/>`;
      }

      fname.textContent = file.name;
      fname.classList.add('has-file');
      if (delBtn) delBtn.style.display = 'inline-block';
      slotEl.classList.remove('uploading');
      slotEl.classList.add('success');
      toast(`✓ ${slot} uploaded`, 'ok');
      setStatus('Saved — refresh portfolio to see changes', 'ok');
    } catch (err) {
      clearInterval(fakeProgress);
      if (progBar) progBar.style.width = '0%';
      slotEl.classList.remove('uploading');
      slotEl.classList.add('error');
      toast(`Upload failed: ${err.message}`, 'err');
      setStatus('Upload error', 'err');
    }
  }

  // ── DELETE FILE ───────────────────────────────────────
  window.deleteSlot = async function (slot) {
    const slotEl = document.querySelector(`[data-slot="${slot}"]`);
    const preview = document.getElementById(`preview-${slot}`);
    const fname   = document.getElementById(`fname-${slot}`);
    const delBtn  = document.getElementById(`del-${slot}`);

    try {
      await fetch(`/upload?slot=${slot}`, { method: 'DELETE' });
      // Restore empty state
      const label = slotEl.dataset.label || slot;
      const isVideo = slotEl.dataset.accept.includes('video');
      if (preview) {
        if (slot.startsWith('project-')) {
          const num = slot.split('-')[1].padStart(2, '0');
          preview.innerHTML = `<div class="slot-empty"><div class="slot-proj-num">${num}</div><div class="slot-empty-text">${label}</div></div>`;
        } else {
          preview.innerHTML = `<div class="slot-empty"><div class="slot-icon">${isVideo ? '🎬' : '🖼'}</div><div class="slot-empty-text">No file yet</div></div>`;
        }
      }
      fname.textContent = '—';
      fname.classList.remove('has-file');
      if (delBtn) delBtn.style.display = 'none';
      slotEl.classList.remove('success', 'error');
      toast(`${slot} removed`, '');
    } catch (e) {
      toast('Delete failed', 'err');
    }
  };

  // ── WIRE UP EACH SLOT ─────────────────────────────────
  document.querySelectorAll('.upload-slot').forEach(slotEl => {
    const slot    = slotEl.dataset.slot;
    const dropZone = document.getElementById(`drop-${slot}`);
    const input   = document.getElementById(`input-${slot}`);

    if (!dropZone || !input) return;

    // File input change
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) uploadFile(slot, file);
      input.value = ''; // reset so same file can be re-uploaded
    });

    // Drag over
    slotEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      slotEl.classList.add('drag-over');
    });
    slotEl.addEventListener('dragleave', (e) => {
      if (!slotEl.contains(e.relatedTarget)) {
        slotEl.classList.remove('drag-over');
      }
    });

    // Drop
    slotEl.addEventListener('drop', (e) => {
      e.preventDefault();
      slotEl.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(slot, file);
    });
  });

  // ── GLOBAL DRAG PREVENTION ────────────────────────────
  document.addEventListener('dragover',  (e) => e.preventDefault());
  document.addEventListener('drop',      (e) => e.preventDefault());

  // ── INIT ──────────────────────────────────────────────
  loadMedia();

})();
