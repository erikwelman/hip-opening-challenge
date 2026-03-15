// App controller — navigation, events, timer management

const App = {
  currentTimer: null,
  currentDay: 1,
  currentPoseIndex: 0,

  init() {
    Progress.load();
    this.currentDay = Progress.getCurrentDay();
    this.render('home');
    this.bindGlobalEvents();
  },

  render(screen, params) {
    const app = document.getElementById('app');

    // Clean up timer if leaving timer screen
    if (this.currentTimer) {
      this.currentTimer.destroy();
      this.currentTimer = null;
    }

    switch (screen) {
      case 'home':
        app.innerHTML = UI.renderHome();
        break;
      case 'day':
        this.currentDay = params.day;
        app.innerHTML = UI.renderDay(params.day);
        break;
      case 'timer':
        this.currentDay = params.day;
        this.currentPoseIndex = params.pose;
        app.innerHTML = UI.renderTimer(params.day, params.pose);
        this.initTimer(params.day, params.pose);
        break;
    }
  },

  bindGlobalEvents() {
    // Event delegation on #app
    document.getElementById('app').addEventListener('click', (e) => {
      const target = e.target.closest('[data-nav]');
      if (target) {
        const nav = target.dataset.nav;
        if (nav === 'home') {
          this.render('home');
        } else if (nav === 'day') {
          this.render('day', { day: parseInt(target.dataset.day) });
        } else if (nav === 'timer') {
          this.render('timer', {
            day: parseInt(target.dataset.day),
            pose: parseInt(target.dataset.pose)
          });
        }
        return;
      }

      // Image lightbox
      if (e.target.closest('[data-action="zoom-image"]')) {
        const lb = document.getElementById('image-lightbox');
        if (lb) {
          lb.classList.add('active');
          lb.focus();
        }
        return;
      }
      if (e.target.closest('[data-action="close-lightbox"]')) {
        this._closeLightbox();
        return;
      }

      // Timer controls
      if (e.target.id === 'btn-timer-toggle') {
        if (this.currentTimer) {
          this.currentTimer.toggle();
          const btn = document.getElementById('btn-timer-toggle');
          if (btn) {
            const label = this.currentTimer.isRunning ? 'Pause' : 'Resume';
            btn.textContent = label;
            btn.setAttribute('aria-label', label + ' timer');
          }
        }
        return;
      }
      if (e.target.id === 'btn-timer-skip') {
        if (this.currentTimer) this.currentTimer.skip();
        return;
      }

      // Pose complete — continue button
      if (e.target.closest('[data-action="pose-continue"]')) {
        const btn = e.target.closest('[data-action="pose-continue"]');
        const day = parseInt(btn.dataset.day);
        const pose = parseInt(btn.dataset.pose);
        this.render('timer', { day, pose });
        return;
      }

      // Reset all
      if (e.target.closest('[data-action="reset-all"]')) {
        if (confirm('Reset all progress? This cannot be undone.')) {
          Progress.resetAll();
          this.render('home');
        }
      }
    });

    // Global keyboard handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close lightbox if open
        const lb = document.getElementById('image-lightbox');
        if (lb && lb.classList.contains('active')) {
          this._closeLightbox();
          return;
        }

        // Close congrats overlay if open
        const congrats = document.getElementById('congrats-overlay');
        if (congrats && congrats.classList.contains('active')) {
          this.render('home');
          return;
        }

        // Close pose-complete overlay if open
        const poseOverlay = document.querySelector('.pose-complete-overlay');
        if (poseOverlay) {
          poseOverlay.remove();
          return;
        }
      }

      // Spacebar to toggle timer when on timer screen
      if (e.key === ' ' && document.getElementById('btn-timer-toggle')) {
        // Only if not focused on a button (to avoid double-firing)
        if (e.target === document.body || e.target === document.getElementById('app')) {
          e.preventDefault();
          if (this.currentTimer) {
            this.currentTimer.toggle();
            const btn = document.getElementById('btn-timer-toggle');
            if (btn) {
              const label = this.currentTimer.isRunning ? 'Pause' : 'Resume';
              btn.textContent = label;
              btn.setAttribute('aria-label', label + ' timer');
            }
          }
        }
      }
    });
  },

  _closeLightbox() {
    const lb = document.getElementById('image-lightbox');
    if (lb) {
      lb.classList.remove('active');
      // Return focus to the image trigger
      const trigger = document.querySelector('[data-action="zoom-image"]');
      if (trigger) trigger.focus();
    }
  },

  initTimer(dayNumber, poseIndex) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    const pose = dayData.poses[poseIndex];

    this.currentTimer = new PoseTimer(
      pose.duration,
      // onTick
      (remaining) => {
        UI.updateTimer(remaining, this.currentTimer.progress, this.currentTimer.isRunning);
      },
      // onComplete
      () => {
        this.onPoseComplete(dayNumber, poseIndex);
      }
    );
  },

  onPoseComplete(dayNumber, poseIndex) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    const pose = dayData.poses[poseIndex];

    // Vibrate if available
    if (navigator.vibrate) navigator.vibrate(200);

    // Mark pose done
    Progress.markPoseDone(pose.id);

    // Check if day is complete
    if (Progress.isDayComplete(dayNumber)) {
      Progress.markDayComplete(dayNumber);
      this.showCongrats(dayNumber);
    } else {
      // Find next incomplete pose
      const nextIndex = dayData.poses.findIndex((p, i) => i > poseIndex && !Progress.isPoseDone(p.id));
      if (nextIndex !== -1) {
        // Show completion with Continue button (user-controlled advance)
        this.showPoseComplete(pose.name, dayNumber, nextIndex);
      } else {
        // All remaining poses are done
        this.render('day', { day: dayNumber });
      }
    }
  },

  showPoseComplete(poseName, dayNumber, nextPoseIndex) {
    const app = document.getElementById('app');
    const overlay = document.createElement('div');
    overlay.className = 'pose-complete-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', `${poseName} complete`);
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="pose-complete-content">
        <div class="pose-complete-check" aria-hidden="true">&#x2713;</div>
        <p>${UI.esc(poseName)}</p>
        <p class="pose-complete-next">Up next...</p>
        <button class="btn-pose-continue" data-action="pose-continue" data-day="${dayNumber}" data-pose="${nextPoseIndex}">Continue</button>
      </div>`;
    app.appendChild(overlay);

    // Move focus to the Continue button
    requestAnimationFrame(() => {
      const btn = overlay.querySelector('.btn-pose-continue');
      if (btn) btn.focus();
    });
  },

  showCongrats(dayNumber) {
    const app = document.getElementById('app');
    app.insertAdjacentHTML('beforeend', UI.renderCongrats(dayNumber));

    // Trigger animation and manage focus
    requestAnimationFrame(() => {
      const overlay = document.getElementById('congrats-overlay');
      if (overlay) {
        overlay.classList.add('active');
        // Move focus to the first action button
        const firstBtn = overlay.querySelector('.btn-congrats-next');
        if (firstBtn) firstBtn.focus();
      }
    });
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
