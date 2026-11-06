(() => {
  const byId = (id) => document.getElementById(id);
  const form = byId('journey-run-form');
  if (!form) return;
  let report;
  let downloadURL;
  const status = byId('journey-run-status');
  const errorBox = byId('journey-run-error');
  const runButton = byId('journey-run-button');
  const exportButton = byId('journey-export');
  const steps = byId('journey-live-steps');
  const tour = [
    {
      title: 'Start with an honest claim.',
      body: 'This is a local quality engineering showcase. The journeys are authored examples, the application uses PostgreSQL, and no live model is called. Explain these boundaries first.',
      proof:
        'The evidence dashboard records zero model calls and separates authored fixtures from live AI provenance.',
      tab: 'journeys',
      button: 'Explore journey evidence',
      fault: '',
    },
    {
      title: 'Show durable business behavior.',
      body: 'Explain checkout, ownership, idempotent replay, cancellation and simulated refunds. Stock changes and order history persist in the database.',
      proof:
        'The V3 evidence panel contains database, browser, concurrency and rollback test results.',
      tab: 'durable',
      button: 'Explore database evidence',
      fault: '',
    },
    {
      title: 'Run a healthy journey.',
      body: 'Select the cancellation journey and run it locally. Each displayed step comes from a real HTTP response, compared with an independent reference model.',
      proof: 'The healthy journey must pass before a simulated fault is evaluated.',
      tab: 'showtime',
      button: 'Prepare healthy journey',
      fault: '',
    },
    {
      title: 'Make a defect visible.',
      body: 'Demonstrate missing stock restoration. The healthy control runs first; then the same journey runs in a separate schema with the curated fault. Inspect the first expected-versus-observed mismatch.',
      proof: 'A mismatch identifies an observed symptom. It is not an AI root-cause diagnosis.',
      tab: 'showtime',
      button: 'Prepare stock defect demo',
      fault: 'missing-restock',
    },
    {
      title: 'Leave evidence someone can reproduce.',
      body: 'Download the safe JSON evidence, point out the journey content hash, and use its replay command. Close by explaining the zero-spend policy and the framework boundaries.',
      proof:
        'Run IDs, timestamps, actual observations and a replay command make the demonstration reviewable. A five-minute guide is a suggested pacing, not a timed result.',
      tab: 'architecture',
      button: 'Explore framework design',
      fault: '',
    },
  ];
  let current = 0;
  function renderTour(focus = false) {
    byId('tour-progress').textContent = `Step ${current + 1} of ${tour.length} · about 1 minute`;
    byId('tour-title').textContent = tour[current].title;
    byId('tour-body').textContent = tour[current].body;
    byId('tour-proof').textContent = tour[current].proof;
    byId('tour-previous').disabled = current === 0;
    byId('tour-next').disabled = current === tour.length - 1;
    byId('tour-action').textContent = tour[current].button;
    if (focus) byId('tour-title').focus();
  }
  byId('tour-previous').addEventListener('click', () => {
    current = Math.max(0, current - 1);
    renderTour(true);
  });
  byId('tour-next').addEventListener('click', () => {
    current = Math.min(tour.length - 1, current + 1);
    renderTour(true);
  });
  byId('tour-action').addEventListener('click', () => {
    if (tour[current].tab === 'showtime') {
      byId('journey-choice').value = 'J-CANCEL';
      byId('journey-fault').value = tour[current].fault;
      runButton.focus();
    } else location.hash = tour[current].tab;
  });
  const presentation = byId('presentation-toggle');
  function setPresentation(active) {
    document.body.classList.toggle('presenting', active);
    presentation.setAttribute('aria-pressed', String(active));
    presentation.textContent = active ? 'Exit presentation' : 'Presentation mode';
  }
  presentation.addEventListener('click', () =>
    setPresentation(presentation.getAttribute('aria-pressed') !== 'true'),
  );
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setPresentation(false);
  });
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#showtime') setPresentation(false);
  });
  function renderReport(value) {
    report = value;
    byId('journey-result').hidden = false;
    const labels = {
      'control-passed': 'Healthy journey passed',
      'fault-detected': 'Simulated fault detected',
      'fault-survived': 'Simulated fault survived this journey',
    };
    byId('journey-result-title').textContent = labels[value.outcome] ?? 'Execution completed';
    byId('journey-result-summary').textContent =
      `${value.journey} · ${value.requirement} · ${value.origin} · ${value.generatedAt}`;
    byId('journey-run-identity').textContent =
      `Run ${value.runId} · SHA-256 ${value.hash} · Model calls: ${value.modelCalls}`;
    byId('journey-replay').textContent = value.reproduction;
    byId('journey-divergence').hidden = !value.divergence;
    byId('journey-difference').textContent = value.divergence
      ? JSON.stringify(
          {
            step: value.divergence.index,
            action: value.divergence.action,
            expected: value.divergence.expected,
            observed: value.divergence.actual,
          },
          null,
          2,
        )
      : '';
    status.textContent = labels[value.outcome] ?? 'Execution completed';
    exportButton.disabled = false;
  }
  exportButton.addEventListener('click', () => {
    if (!report) return;
    if (downloadURL) URL.revokeObjectURL(downloadURL);
    downloadURL = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2) + '\n'], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = downloadURL;
    link.download = `eai-v5-${report.runId}.json`;
    link.click();
  });
  window.addEventListener('pagehide', () => {
    if (downloadURL) URL.revokeObjectURL(downloadURL);
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    runButton.disabled = true;
    byId('journey-choice').disabled = true;
    byId('journey-fault').disabled = true;
    exportButton.disabled = true;
    report = undefined;
    errorBox.hidden = true;
    byId('journey-result').hidden = true;
    steps.replaceChildren();
    status.textContent = 'Starting a real local journey…';
    let completed = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const fault = byId('journey-fault').value;
      const response = await fetch('/api/journeys/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          journey: byId('journey-choice').value,
          ...(fault ? { fault } : {}),
        }),
      });
      if (!response.ok)
        throw new Error((await response.json()).error || 'Local runner unavailable');
      if (!response.body) throw new Error('Streaming is unavailable in this browser');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      function consume(line) {
        if (!line.trim()) return;
        const message = JSON.parse(line);
        if (message.type === 'error') throw new Error(message.message);
        if (message.type === 'started')
          status.textContent = `Running ${message.journey}. Authored example; no model calls.`;
        if (message.type === 'step') {
          const item = document.createElement('li');
          item.className = message.evidence.passed ? 'step-passed' : 'step-diverged';
          item.textContent = `${message.phase === 'control' ? 'Healthy control' : 'Fault demonstration'} · step ${message.evidence.index} · ${message.evidence.actor} / ${message.evidence.action} · ${message.evidence.passed ? 'matched' : 'diverged'}`;
          steps.append(item);
          status.textContent = item.textContent;
        }
        if (message.type === 'finished') {
          renderReport(message.report);
          completed = true;
        }
      }
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf('\n')) !== -1) {
          consume(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
        }
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
      if (!completed)
        throw new Error('Execution stream ended without a final result; no success claimed.');
    } catch (error) {
      status.textContent = 'Execution incomplete. No result accepted.';
      errorBox.textContent =
        error.name === 'AbortError'
          ? 'Local execution timed out. Check PostgreSQL and retry after the running job finishes.'
          : error.message;
      errorBox.hidden = false;
      exportButton.disabled = true;
    } finally {
      clearTimeout(timeout);
      runButton.disabled = false;
      byId('journey-choice').disabled = false;
      byId('journey-fault').disabled = false;
    }
  });
  renderTour();
  fetch('/api/journeys')
    .then(async (response) => {
      if (!response.ok) throw new Error('Journey list is unavailable');
      const data = await response.json();
      for (const journey of data.journeys) {
        const option = document.createElement('option');
        option.value = journey.id;
        option.textContent = `${journey.id} — ${journey.title}`;
        byId('journey-choice').append(option);
      }
      runButton.disabled = false;
      status.textContent = 'Ready for local execution. Authored journeys; no paid services.';
    })
    .catch((error) => {
      status.textContent = error.message;
    });
})();
