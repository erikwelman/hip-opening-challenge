// UI rendering — three screens: home, day detail, timer

const UI = {

  // ── Home Screen ──────────────────────────────────────────────

  renderHome() {
    const streak = Progress.getStreak();
    const currentDay = Progress.getCurrentDay();
    const allComplete = CHALLENGE_DATA.every(d => Progress.isDayComplete(d.day));

    let streakHTML = '';
    if (streak.current > 0) {
      streakHTML = `
        <div class="streak-badge">
          <span class="streak-fire">&#x1F525;</span>
          <span class="streak-count">${streak.current}-day streak</span>
        </div>`;
    }

    let daysHTML = '';
    for (const dayData of CHALLENGE_DATA) {
      const done = Progress.isDayComplete(dayData.day);
      const isCurrent = dayData.day === currentDay && !allComplete;
      const completedCount = Progress.completedPosesForDay(dayData.day);
      const totalCount = dayData.poses.length;
      const hasProgress = completedCount > 0 && !done;

      let statusClass = '';
      if (done) statusClass = 'day-done';
      else if (isCurrent) statusClass = 'day-current';

      daysHTML += `
        <button class="day-card ${statusClass}" data-nav="day" data-day="${dayData.day}">
          <span class="day-number">${dayData.day}</span>
          ${done ? '<span class="day-check">&#x2713;</span>' : ''}
          ${hasProgress ? `<span class="day-partial">${completedCount}/${totalCount}</span>` : ''}
          ${isCurrent ? '<span class="day-today">TODAY</span>' : ''}
        </button>`;
    }

    return `
      <div class="screen home-screen">
        <header class="app-header">
          <h1>21-Day Hip Opening Challenge</h1>
          ${streakHTML}
        </header>
        ${allComplete ? `
          <div class="all-complete-banner">
            <span>&#x1F3C6;</span> Challenge Complete! Amazing work!
          </div>` : ''}
        <div class="day-grid">${daysHTML}</div>
        <button class="reset-btn" data-action="reset-all">Reset All Progress</button>
      </div>`;
  },

  // ── Day Detail Screen ────────────────────────────────────────

  renderDay(dayNumber) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    if (!dayData) return '<div>Day not found</div>';

    const currentDay = Progress.getCurrentDay();
    const isActive = dayNumber === currentDay;
    const isDone = Progress.isDayComplete(dayNumber);
    const completedCount = Progress.completedPosesForDay(dayNumber);
    const totalCount = dayData.poses.length;
    const progressPct = (completedCount / totalCount) * 100;

    let posesHTML = '';
    for (let i = 0; i < dayData.poses.length; i++) {
      const pose = dayData.poses[i];
      const done = Progress.isPoseDone(pose.id);
      const imgSrc = typeof IMAGES !== 'undefined' ? IMAGES[pose.imageKey] : '';

      posesHTML += `
        <div class="pose-card ${done ? 'pose-done' : ''}">
          <div class="pose-image-wrap">
            ${imgSrc ? `<img class="pose-image" src="${imgSrc}" alt="${pose.name}" loading="lazy">` : '<div class="pose-image-placeholder"></div>'}
            ${done ? '<div class="pose-done-overlay">&#x2713;</div>' : ''}
          </div>
          <div class="pose-info">
            <h3 class="pose-name">${pose.name}</h3>
            <span class="pose-duration">${this.formatTime(pose.duration)}</span>
          </div>
          <div class="pose-action">
            ${done
              ? '<span class="pose-complete-label">Done</span>'
              : isActive
                ? `<button class="btn-start" data-nav="timer" data-day="${dayNumber}" data-pose="${i}">Start</button>`
                : '<span class="pose-locked-label">—</span>'
            }
          </div>
        </div>`;
    }

    return `
      <div class="screen day-screen">
        <header class="day-header">
          <button class="btn-back" data-nav="home">&#x2190;</button>
          <div class="day-nav">
            ${dayNumber > 1 ? `<button class="btn-nav-arrow" data-nav="day" data-day="${dayNumber - 1}">&#x25C0;</button>` : '<span class="btn-nav-spacer"></span>'}
            <h2>Day ${dayNumber}</h2>
            ${dayNumber < 21 ? `<button class="btn-nav-arrow" data-nav="day" data-day="${dayNumber + 1}">&#x25B6;</button>` : '<span class="btn-nav-spacer"></span>'}
          </div>
          <div class="day-progress-wrap">
            <div class="day-progress-bar">
              <div class="day-progress-fill" style="width:${progressPct}%"></div>
            </div>
            <span class="day-progress-text">${completedCount}/${totalCount} poses</span>
          </div>
        </header>
        ${isDone ? `
          <div class="day-done-banner">
            <span>&#x2705;</span> Day ${dayNumber} Complete!
          </div>` : ''}
        ${!isActive && !isDone ? `
          <div class="day-preview-banner">
            Preview — Complete Day ${currentDay} first
          </div>` : ''}
        <div class="pose-list">${posesHTML}</div>
      </div>`;
  },

  // ── Timer Screen ─────────────────────────────────────────────

  renderTimer(dayNumber, poseIndex) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    const pose = dayData.poses[poseIndex];
    const imgSrc = typeof IMAGES !== 'undefined' ? IMAGES[pose.imageKey] : '';

    return `
      <div class="screen timer-screen">
        <button class="btn-back-timer" data-nav="day" data-day="${dayNumber}">&#x2190; Back</button>
        <div class="timer-pose-name">${pose.name}</div>
        <div class="timer-image-wrap" data-action="zoom-image">
          ${imgSrc ? `<img class="timer-image" src="${imgSrc}" alt="${pose.name}">` : ''}
        </div>
        <div class="image-lightbox" id="image-lightbox" data-action="close-lightbox">
          ${imgSrc ? `<img class="lightbox-image" src="${imgSrc}" alt="${pose.name}">` : ''}
        </div>
        <div class="timer-ring-wrap">
          <svg class="timer-ring" viewBox="0 0 200 200">
            <circle class="timer-ring-bg" cx="100" cy="100" r="90" />
            <circle class="timer-ring-fg" cx="100" cy="100" r="90"
              stroke-dasharray="${2 * Math.PI * 90}"
              stroke-dashoffset="0" />
          </svg>
          <div class="timer-display" id="timer-display">${this.formatTime(pose.duration)}</div>
        </div>
        <div class="timer-controls">
          <button class="btn-timer-toggle" id="btn-timer-toggle">Start</button>
          <button class="btn-timer-skip" id="btn-timer-skip">Skip</button>
        </div>
      </div>`;
  },

  // Updates just the timer display and ring (called every tick, no full re-render)
  updateTimer(remaining, progress, isRunning) {
    const display = document.getElementById('timer-display');
    if (display) display.textContent = this.formatTime(Math.ceil(remaining));

    const ring = document.querySelector('.timer-ring-fg');
    if (ring) {
      const circumference = 2 * Math.PI * 90;
      ring.style.strokeDashoffset = circumference * progress;
    }

    const btn = document.getElementById('btn-timer-toggle');
    if (btn) btn.textContent = isRunning ? 'Pause' : 'Resume';
  },

  // ── Congratulations Modal ────────────────────────────────────

  renderCongrats(dayNumber) {
    const streak = Progress.getStreak();
    return `
      <div class="congrats-overlay" id="congrats-overlay">
        <div class="congrats-content">
          <div class="congrats-confetti"></div>
          <div class="congrats-icon">&#x1F389;</div>
          <h2>Day ${dayNumber} Complete!</h2>
          ${streak.current > 0 ? `<p class="congrats-streak">&#x1F525; ${streak.current}-day streak</p>` : ''}
          <div class="congrats-buttons">
            ${dayNumber < 21
              ? `<button class="btn-congrats-next" data-nav="day" data-day="${dayNumber + 1}">Next Day &#x2192;</button>`
              : `<button class="btn-congrats-next" data-nav="home">&#x1F3C6; Challenge Complete!</button>`
            }
            <button class="btn-congrats-home" data-nav="home">Home</button>
          </div>
        </div>
      </div>`;
  },

  // ── Helpers ──────────────────────────────────────────────────

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
};
