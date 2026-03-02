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
        if (lb) lb.classList.add('active');
        return;
      }
      if (e.target.closest('[data-action="close-lightbox"]')) {
        const lb = document.getElementById('image-lightbox');
        if (lb) lb.classList.remove('active');
        return;
      }

      // Timer controls
      if (e.target.id === 'btn-timer-toggle') {
        if (this.currentTimer) this.currentTimer.toggle();
        return;
      }
      if (e.target.id === 'btn-timer-skip') {
        if (this.currentTimer) this.currentTimer.skip();
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
        // Brief delay then advance to next pose
        setTimeout(() => {
          this.render('timer', { day: dayNumber, pose: nextIndex });
        }, 1500);
        // Show completion feedback
        this.showPoseComplete(pose.name);
      } else {
        // All remaining poses are done (shouldn't happen since we checked day complete above)
        this.render('day', { day: dayNumber });
      }
    }
  },

  showPoseComplete(poseName) {
    const app = document.getElementById('app');
    const overlay = document.createElement('div');
    overlay.className = 'pose-complete-overlay';
    overlay.innerHTML = `
      <div class="pose-complete-content">
        <div class="pose-complete-check">&#x2713;</div>
        <p>${poseName}</p>
        <p class="pose-complete-next">Next pose...</p>
      </div>`;
    app.appendChild(overlay);
  },

  showCongrats(dayNumber) {
    const app = document.getElementById('app');
    app.insertAdjacentHTML('beforeend', UI.renderCongrats(dayNumber));

    // Trigger animation
    requestAnimationFrame(() => {
      const overlay = document.getElementById('congrats-overlay');
      if (overlay) overlay.classList.add('active');
    });
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
