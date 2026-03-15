// UI rendering — three screens: home, day detail, timer

const UI = {

  // ── Helpers ──────────────────────────────────────────────────

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  // Sanitize text to prevent HTML injection from localStorage
  esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  // Motivational message based on completed days
  getMotivation(daysCompleted) {
    if (daysCompleted === 0) return null;
    if (daysCompleted === 1) return { text: '1 day done. You\'ve got this!', icon: '&#x1F331;' };
    if (daysCompleted <= 3) return { text: `${daysCompleted} days done. Great start!`, icon: '&#x1F4AA;' };
    if (daysCompleted <= 6) return { text: `${daysCompleted} days done. Building momentum!`, icon: '&#x1F525;' };
    if (daysCompleted <= 9) return { text: `${daysCompleted} days done. Keep pushing!`, icon: '&#x26A1;' };
    if (daysCompleted === 10) return { text: '10 days done. Almost halfway!', icon: '&#x1F3AF;' };
    if (daysCompleted <= 13) return { text: `${daysCompleted} days done. Halfway there!`, icon: '&#x2B50;' };
    if (daysCompleted <= 16) return { text: `${daysCompleted} days done. Over the hill!`, icon: '&#x1F680;' };
    if (daysCompleted <= 18) return { text: `${daysCompleted} days done. The end is in sight!`, icon: '&#x1F3C3;' };
    if (daysCompleted === 19) return { text: '19 days done. So close!', icon: '&#x1F4AB;' };
    if (daysCompleted === 20) return { text: '20 days done. You\'ve worked so hard, finish strong!', icon: '&#x1F525;' };
    return { text: '21 days. You did it!', icon: '&#x1F3C6;' };
  },

  // ── Home Screen ──────────────────────────────────────────────

  renderHome() {
    const currentDay = Progress.getCurrentDay();
    const allComplete = CHALLENGE_DATA.every(d => Progress.isDayComplete(d.day));
    const daysCompleted = CHALLENGE_DATA.filter(d => Progress.isDayComplete(d.day)).length;
    const motivation = this.getMotivation(daysCompleted);

    let motivationHTML = '';
    if (motivation) {
      motivationHTML = `
        <div class="streak-badge" role="status" aria-label="${motivation.text}">
          <span class="streak-fire" aria-hidden="true">${motivation.icon}</span>
          <span class="streak-count">${motivation.text}</span>
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
      let ariaLabel = `Day ${dayData.day}`;
      if (done) {
        statusClass = 'day-done';
        ariaLabel += ', completed';
      } else if (isCurrent) {
        statusClass = 'day-current';
        ariaLabel += ', current day';
      }
      if (hasProgress) ariaLabel += `, ${completedCount} of ${totalCount} poses done`;

      daysHTML += `
        <button class="day-card ${statusClass}" data-nav="day" data-day="${dayData.day}" aria-label="${ariaLabel}">
          <span class="day-number" aria-hidden="true">${dayData.day}</span>
          ${done ? '<span class="day-check" aria-hidden="true">&#x2713;</span>' : ''}
          ${hasProgress ? `<span class="day-partial" aria-hidden="true">${completedCount}/${totalCount}</span>` : ''}
          ${isCurrent ? '<span class="day-today" aria-hidden="true">TODAY</span>' : ''}
        </button>`;
    }

    return `
      <div class="screen home-screen" role="main" aria-label="Challenge overview">
        <header class="app-header">
          <h1>21-Day Hip Opening Challenge</h1>
          ${motivationHTML}
        </header>
        ${allComplete ? `
          <div class="all-complete-banner" role="status">
            <span aria-hidden="true">&#x1F3C6;</span> Challenge Complete! Amazing work!
          </div>` : ''}
        <nav class="day-grid" aria-label="Challenge days">${daysHTML}</nav>
        <button class="reset-btn" data-action="reset-all">Reset All Progress</button>
      </div>`;
  },

  // ── Day Detail Screen ────────────────────────────────────────

  renderDay(dayNumber) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    if (!dayData) return '<div role="main">Day not found</div>';

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
      const poseName = this.esc(pose.name);

      posesHTML += `
        <div class="pose-card ${done ? 'pose-done' : ''}" role="listitem">
          <div class="pose-image-wrap">
            ${imgSrc ? `<img class="pose-image" src="${imgSrc}" alt="${poseName}" loading="lazy">` : '<div class="pose-image-placeholder" role="img" aria-label="No image available"></div>'}
            ${done ? '<div class="pose-done-overlay" aria-hidden="true">&#x2713;</div>' : ''}
          </div>
          <div class="pose-info">
            <h3 class="pose-name">${poseName}</h3>
            <span class="pose-duration">${this.formatTime(pose.duration)}</span>
          </div>
          <div class="pose-action">
            ${done
              ? `<span class="pose-complete-label" aria-label="${poseName}, completed">Done</span>`
              : isActive
                ? `<button class="btn-start" data-nav="timer" data-day="${dayNumber}" data-pose="${i}" aria-label="Start ${poseName}">Start</button>`
                : '<span class="pose-locked-label" aria-label="Locked">&mdash;</span>'
            }
          </div>
        </div>`;
    }

    return `
      <div class="screen day-screen" role="main" aria-label="Day ${dayNumber} detail">
        <header class="day-header">
          <button class="btn-back" data-nav="home" aria-label="Back to overview">&#x2190;</button>
          <nav class="day-nav" aria-label="Day navigation">
            ${dayNumber > 1 ? `<button class="btn-nav-arrow" data-nav="day" data-day="${dayNumber - 1}" aria-label="Previous day">&#x25C0;</button>` : '<span class="btn-nav-spacer"></span>'}
            <h2>Day ${dayNumber}</h2>
            ${dayNumber < 21 ? `<button class="btn-nav-arrow" data-nav="day" data-day="${dayNumber + 1}" aria-label="Next day">&#x25B6;</button>` : '<span class="btn-nav-spacer"></span>'}
          </nav>
          <div class="day-progress-wrap" role="progressbar" aria-valuenow="${completedCount}" aria-valuemin="0" aria-valuemax="${totalCount}" aria-label="Day progress: ${completedCount} of ${totalCount} poses">
            <div class="day-progress-bar">
              <div class="day-progress-fill" style="width:${progressPct}%"></div>
            </div>
            <span class="day-progress-text">${completedCount}/${totalCount} poses</span>
          </div>
        </header>
        ${isDone ? `
          <div class="day-done-banner" role="status">
            <span aria-hidden="true">&#x2705;</span> Day ${dayNumber} Complete!
          </div>` : ''}
        ${!isActive && !isDone ? `
          <div class="day-preview-banner" role="status">
            Preview &mdash; Complete Day ${currentDay} first
          </div>` : ''}
        <div class="pose-list" role="list" aria-label="Poses for day ${dayNumber}">${posesHTML}</div>
      </div>`;
  },

  // ── Timer Screen ─────────────────────────────────────────────

  renderTimer(dayNumber, poseIndex) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    const pose = dayData.poses[poseIndex];
    const imgSrc = typeof IMAGES !== 'undefined' ? IMAGES[pose.imageKey] : '';
    const poseName = this.esc(pose.name);

    return `
      <div class="screen timer-screen" role="main" aria-label="Timer for ${poseName}">
        <button class="btn-back-timer" data-nav="day" data-day="${dayNumber}" aria-label="Back to day ${dayNumber}">&#x2190; Back</button>
        <div class="timer-pose-name">${poseName}</div>
        <div class="timer-image-wrap" data-action="zoom-image" role="button" aria-label="Zoom image of ${poseName}">
          ${imgSrc ? `<img class="timer-image" src="${imgSrc}" alt="${poseName}">` : ''}
        </div>
        <div class="image-lightbox" id="image-lightbox" data-action="close-lightbox" role="dialog" aria-label="Enlarged image of ${poseName}" aria-modal="true" tabindex="-1">
          ${imgSrc ? `<img class="lightbox-image" src="${imgSrc}" alt="${poseName}">` : ''}
        </div>
        <div class="timer-ring-wrap" role="timer" aria-label="Countdown timer">
          <svg class="timer-ring" viewBox="0 0 200 200" aria-hidden="true">
            <circle class="timer-ring-bg" cx="100" cy="100" r="90" />
            <circle class="timer-ring-fg" cx="100" cy="100" r="90"
              stroke-dasharray="${2 * Math.PI * 90}"
              stroke-dashoffset="0" />
          </svg>
          <div class="timer-display" id="timer-display" aria-live="polite" aria-atomic="true">${this.formatTime(pose.duration)}</div>
        </div>
        <div class="timer-controls">
          <button class="btn-timer-toggle" id="btn-timer-toggle" aria-label="Start timer">Start</button>
          <button class="btn-timer-skip" id="btn-timer-skip" aria-label="Skip this pose">Skip</button>
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
    if (btn) {
      const label = isRunning ? 'Pause' : 'Resume';
      btn.textContent = label;
      btn.setAttribute('aria-label', label + ' timer');
    }
  },

  // ── Congratulations Modal ────────────────────────────────────

  renderCongrats(dayNumber) {
    const daysCompleted = CHALLENGE_DATA.filter(d => Progress.isDayComplete(d.day)).length;
    const motivation = this.getMotivation(daysCompleted);
    const confettiPieces = Array.from({ length: 12 }, () => '<div class="confetti-piece"></div>').join('');
    return `
      <div class="congrats-overlay" id="congrats-overlay" role="dialog" aria-label="Day ${dayNumber} complete" aria-modal="true">
        <div class="congrats-content">
          <div class="congrats-confetti" aria-hidden="true">${confettiPieces}</div>
          <div class="congrats-icon" aria-hidden="true">&#x1F389;</div>
          <h2>Day ${dayNumber} Complete!</h2>
          ${motivation ? `<p class="congrats-streak" role="status">${motivation.icon} ${motivation.text}</p>` : ''}
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
};
