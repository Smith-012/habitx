// Dynamically determine the backend URL based on the environment
const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:5000'
  : 'https://habitx-backend-fm5d.onrender.com';

function api (url, options = {}) {
  options.credentials = 'include'
  
  // Attach token-based auth for cross-domain support
  const token = localStorage.getItem('authToken')
  if (token) {
    options.headers = options.headers || {}
    options.headers['Authorization'] = `Bearer ${token}`
  }

  if (options.body && (!options.headers || !options.headers['Content-Type'])) {
    options.headers = options.headers || {}
    options.headers['Content-Type'] = 'application/json'
  }
  return fetch(API_BASE + url, options)
}
function updateNavbarUser (name) {
  const el = document.getElementById('currentUserName')
  if (el) el.textContent = name
}
function updateHabitStats (habitId, data) {
  const streakEl = document.querySelector(`#habit-${habitId} .streak`)
  if (streakEl) streakEl.textContent = `${data.streak} days`
  const consistencyEl = document.querySelector(`#habit-${habitId} .consistency`)
  if (consistencyEl) consistencyEl.textContent = `📈 ${data.consistency}%`
}
function updateHabitCard (habit) {
  const el = document.getElementById(`habit-${habit.id}`)
  if (!el) return
  el.classList.remove('completed', 'missed')
  if (habit.today_status === 'done') el.classList.add('completed')
  else if (habit.today_status === 'missed') el.classList.add('missed')
  const status = el.querySelector('.habit-status span')
  if (status) {
    if (habit.today_status === 'done') status.textContent = '✔ Completed today'
    else if (habit.today_status === 'missed')
      status.textContent = '✖ Missed today'
    else status.textContent = '⏳ Pending today'
  }
  const actions = el.querySelector('.habit-actions')
  if (actions && habit.today_status !== null) {
    actions.innerHTML = `
      <button class="btn-check" style="opacity:0.5;cursor:not-allowed;" disabled>
        <i class="fas fa-check"></i>
      </button>
      <button class="btn-delete" onclick="app.deleteHabit(${habit.id})">
        <i class="fas fa-trash"></i>
      </button>
    `
  }
}
const achievementsData = [
  {
    id: 'first_habit',
    icon: '🎯',
    name: 'First Step',
    description: 'Create your first habit',
    requirement: 1
  },
  {
    id: 'streak_3',
    icon: '🔥',
    name: 'On Fire',
    description: '3-day streak',
    requirement: 3
  },
  {
    id: 'streak_7',
    icon: '⚡',
    name: 'Week Warrior',
    description: '7-day streak',
    requirement: 7
  },
  {
    id: 'streak_21',
    icon: '💎',
    name: 'Habit Former',
    description: '21-day streak',
    requirement: 21
  },
  {
    id: 'streak_30',
    icon: '🏆',
    name: 'Monthly Master',
    description: '30-day streak',
    requirement: 30
  },
  {
    id: 'streak_100',
    icon: '👑',
    name: 'Century Club',
    description: '100-day streak',
    requirement: 100
  },
  {
    id: 'habits_5',
    icon: '🌟',
    name: 'Multi-tasker',
    description: 'Track 5 habits',
    requirement: 5
  },
  {
    id: 'habits_10',
    icon: '⭐',
    name: 'Habit Master',
    description: 'Track 10 habits',
    requirement: 10
  },
  {
    id: 'perfect_week',
    icon: '✨',
    name: 'Perfect Week',
    description: 'Complete all habits for 7 days',
    requirement: 7
  },
  {
    id: 'early_bird',
    icon: '🌅',
    name: 'Early Bird',
    description: 'Complete habits before 9 AM',
    requirement: 1
  }
]
const motivationMessages = [
  'Every small step counts! Keep going! 🚀',
  "You're building something amazing! 💪",
  'Consistency is the key to success! 🔑',
  "Today's efforts are tomorrow's results! ⭐",
  "You're stronger than you think! 💎",
  'Progress, not perfection! 🎯',
  'Your future self will thank you! 🌟',
  'One day at a time, one habit at a time! 🌱',
  "You're on fire! Keep the momentum! 🔥",
  'Small habits, big changes! ✨',
  "Believe in yourself! You've got this! 💫",
  'Excellence is a habit, not an act! 🏆',
  'Your dedication is inspiring! 🌈',
  'Keep pushing forward! Success is near! 🎪',
  "You're creating your best version! 🦋"
]
const streakMessages = {
  3: "🎉 3-day streak! You're on a roll!",
  7: '🔥 One week strong! Amazing dedication!',
  21: "💎 21 days! You're forming a real habit!",
  30: "🏆 30 days! You're unstoppable!",
  50: "⭐ 50 days! You're a habit master!",
  100: '👑 100 days! Legendary achievement!'
}
class HabitApp {
  constructor () {
    this.currentFilter = 'all'
    this.editingHabitId = null
    this.reminderTimers = []
    this.isGuest = false
    if (localStorage.getItem('remindersEnabled') === null) {
      localStorage.setItem('remindersEnabled', 'false')
    }
    this.init()
  }
  loadDemoData () {
    this.isGuest = true
    this.habits = [
      {
        id: 'demo1',
        habit_name: 'Morning Meditation',
        category: 'mindfulness',
        frequency: 'daily',
        current_streak: 5,
        best_streak: 12,
        consistency: 85,
        created_date: new Date().toISOString().split('T')[0],
        today_status: 'pending'
      },
      {
        id: 'demo2',
        habit_name: 'Read 20 Pages',
        category: 'study',
        frequency: 'daily',
        current_streak: 3,
        best_streak: 8,
        consistency: 70,
        created_date: new Date().toISOString().split('T')[0],
        today_status: 'done'
      },
      {
        id: 'demo3',
        habit_name: 'Workout 30 Mins',
        category: 'health',
        frequency: 'daily',
        current_streak: 0,
        best_streak: 15,
        consistency: 60,
        created_date: new Date().toISOString().split('T')[0],
        today_status: 'missed'
      }
    ]
    const banner = document.getElementById('guestBanner')
    if (banner) banner.style.display = 'block'
  }
  async init () {
    this.setupEventListeners()
    const savedUser = JSON.parse(localStorage.getItem('currentUser'))
    if (savedUser) {
      this.isGuest = false
      updateNavbarUser(savedUser.name)
      await this.loadHabitsFromServer(savedUser.id)
      this.showDashboard()
    } else {
      this.loadDemoData()
      this.showDashboard()
    }
  }
  async loadHabitsFromServer () {
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    try {
      const res = await api(`/api/habits/${user.id}`)
      if (res.status === 401 || res.status === 403) {
        console.warn('Session expired or unauthorized. Switching to Guest Mode.')
        localStorage.removeItem('currentUser')
        this.loadDemoData()
        return
      }
      const data = await res.json()
      if (!data.success) return
      this.habits = data.habits
    } catch (err) {
      console.error('Failed loading habits', err)
      this.showToast('Server unreachable ❌', 'error')
    }
  }
  async loadInsights () {
    const box = document.getElementById('insightsBox')
    if (!box) return
    if (this.isGuest) {
      box.innerHTML = `
      💪 You perform best on <b>Mondays</b><br>
      😴 You struggle most on <b>Sundays</b><br>
      🏆 Top habit: <b>Morning Meditation</b> (12 day streak)
    `
      return
    }
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    try {
      const res = await api(`/api/insights/${user.id}`)
      const data = await res.json()
      if (!data.success) return
      box.innerHTML = `
      💪 You perform best on <b>${data.best_day}</b><br>
      😴 You struggle most on <b>${data.worst_day}</b><br>
      🏆 Top habit: <b>${data.top_habit}</b> (${data.best_streak} day streak)
    `
    } catch {
      box.innerHTML = ''
    }
  }
  async loadTemplates () {
    try {
      const res = await api('/api/templates')
      const data = await res.json()
      if (data.success) {
        this.templates = data.templates
      }
    } catch (err) {
      console.error('Template load failed', err)
    }
  }
  async fetchAchievementsFromServer () {
    if (this.isGuest) {
      this.userAchievements = [
        { id: 'first_habit' },
        { id: 'streak_3' },
        { id: 'early_bird' }
      ]
      return
    }
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    try {
      const res = await api(`/api/achievements/${user.id}`)
      const data = await res.json()
      if (data.success) {
        this.userAchievements = data.achievements.map(id => ({ id }))
      }
    } catch (e) {
      console.error('Achievement fetch failed', e)
      this.userAchievements = []
    }
  }
  async loadPersonalRecords () {
    if (this.isGuest) {
      this.renderPersonalRecords({
        longest_streak: 15,
        best_day_count: 3,
        best_habit: 'Workout 30 Mins',
        best_week_percent: 85,
        consistent_habit: 'Morning Meditation'
      })
      return
    }
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    try {
      const res = await api(`/api/records/${user.id}`)
      const data = await res.json()
      if (!data.success) return
      this.renderPersonalRecords(data.records)
    } catch (e) {
      console.error('Records load failed', e)
    }
  }
  renderPersonalRecords (r) {
    const box = document.getElementById('leaderboardList')
    if (!box) return
    box.innerHTML = `
    <div class="record-item">
      🔥 Longest Streak <b>${r.longest_streak} days</b>
    </div>
    <div class="record-item">
      🏆 Best Day <b>${r.best_day_count} habits (${r.best_habit ?? '-'})</b>
    </div>
    <div class="record-item">
      📅 Best Week <b>${r.best_week_percent}%</b>
    </div>
    <div class="record-item">
      📈 Most Consistent <b>${r.consistent_habit ?? '-'}</b>
    </div>
  `
  }
  showConfirm (message) {
    return new Promise(resolve => {
      const modal = document.getElementById('confirmModal')
      const title = document.getElementById('confirmTitle')
      const msg = document.getElementById('confirmMessage')
      const ok = document.getElementById('confirmOk')
      const cancel = document.getElementById('confirmCancel')
      title.textContent = 'Confirm'
      msg.textContent = message
      ok.textContent = 'Confirm'
      cancel.style.display = 'block'
      modal.classList.add('active')
      const clean = () => {
        modal.classList.remove('active')
        ok.onclick = null
        cancel.onclick = null
      }
      ok.onclick = () => {
        clean()
        resolve(true)
      }
      cancel.onclick = () => {
        clean()
        resolve(false)
      }
    })
  }
  showAlert (message, titleText = 'Action Required') {
    return new Promise(resolve => {
      const modal = document.getElementById('confirmModal')
      const title = document.getElementById('confirmTitle')
      const msg = document.getElementById('confirmMessage')
      const ok = document.getElementById('confirmOk')
      const cancel = document.getElementById('confirmCancel')
      title.textContent = titleText
      msg.textContent = message
      ok.textContent = 'Got it!'
      cancel.style.display = 'none'
      modal.classList.add('active')
      ok.onclick = () => {
        modal.classList.remove('active')
        ok.onclick = null
        resolve()
      }
    })
  }
  async showGuestPopup (message = 'Please login to perform activities') {
    await this.showAlert(message, '🔒 Guest Mode')
  }
  async loadDashboardSummary () {
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    try {
      const res = await api(`/api/user/${user.id}/summary`)
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('currentUser')
        this.loadDemoData()
        return
      }
      const data = await res.json()
      if (!data.success) return
      const s = data.summary
      document.getElementById('currentStreak').textContent = s.current_streak
      document.getElementById('bestStreak').textContent = s.best_streak
      document.getElementById('completionRate').textContent =
        s.completion_rate + '%'
      document.getElementById('totalHabits').textContent = s.total_habits
      const badge = document.getElementById('notificationBadge')
      badge.textContent = s.unread_notifications
      badge.style.display = s.unread_notifications > 0 ? 'block' : 'none'
    } catch (err) {
      console.error('Summary load failed', err)
    }
  }
  async loadDetailedStats () {
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    try {
      const res = await api(`/api/user/${user.id}/detailed-stats`)
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('currentUser')
        this.loadDemoData()
        return
      }
      const data = await res.json()
      if (!data.success) return
      document.getElementById('daysActive').textContent = data.days_active
      document.getElementById('totalCompletions').textContent =
        data.total_completions
      document.getElementById('successRateDetailed').textContent =
        data.success_rate + '%'
      document.getElementById('achievementsCount').textContent =
        data.achievements_count
    } catch (err) {
      console.error('Detailed stats load failed', err)
    }
  }
  updateReminderIcon () {
    const btn = document.getElementById('enableReminderBtn')
    if (!btn) return
    const enabled = localStorage.getItem('remindersEnabled') === 'true'
    btn.textContent = enabled ? '🔔' : '🔕'
  }
  setupEventListeners () {
    document.getElementById('showSignup')?.addEventListener('click', e => {
      e.preventDefault()
      this.toggleAuthForm('signup')
    })
    document.getElementById('showLogin')?.addEventListener('click', e => {
      e.preventDefault()
      this.toggleAuthForm('login')
    })
    document.getElementById('showForgotModal')?.addEventListener('click', e => {
      e.preventDefault()
      this.showResetModal()
    })
    document.getElementById('closeResetModal')?.addEventListener('click', () => {
      this.hideResetModal()
    })
    document.getElementById('btnSendOTP')?.addEventListener('click', () => {
      this.handleSendOTP()
    })
    document.getElementById('btnVerifyReset')?.addEventListener('click', () => {
      this.handleVerifyReset()
    })
    document.getElementById('backToStep1')?.addEventListener('click', e => {
      e.preventDefault()
      document.getElementById('resetStep2').classList.remove('active')
      document.getElementById('resetStep1').classList.add('active')
    })
    document.getElementById('loginForm')?.addEventListener('submit', e => {
      e.preventDefault()
      this.handleLogin()
    })
    document.getElementById('loginGuestBtn')?.addEventListener('click', e => {
      e.preventDefault()
      localStorage.removeItem('currentUser')
      this.loadDemoData()
      this.showDashboard()
    })
    document.getElementById('signupForm')?.addEventListener('submit', e => {
      e.preventDefault()
      this.handleSignup()
    })
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.handleLogout()
    })
    document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
      this.handleDeleteAccount()
    })
    document.getElementById('addHabitBtn')?.addEventListener('click', async () => {
      if (this.isGuest) {
        await this.showGuestPopup()
        return
      }
      this.showAddHabitModal()
    })
    document.querySelector('.close-modal')?.addEventListener('click', () => {
      this.hideAddHabitModal()
    })
    document.getElementById('addHabitForm')?.addEventListener('submit', e => {
      e.preventDefault()
      this.handleAddHabit()
    })
    const dateInput = document.getElementById('habitStartDate')
    if (dateInput) {
      const today = new Date()
      const nextYear = new Date()
      nextYear.setFullYear(today.getFullYear() + 1)
      
      const formatDate = (d) => d.toISOString().split('T')[0]
      
      dateInput.min = formatDate(today)
      dateInput.max = formatDate(nextYear)
      dateInput.value = formatDate(today)
    }
    document.getElementById('darkModeToggle')?.addEventListener('click', () => {
      this.toggleDarkMode()
    })
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode')
      const btn = document.getElementById('darkModeToggle')
      if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>'
    }
    document
      .getElementById('notificationsBtn')
      ?.addEventListener('click', () => {
        this.toggleNotifications()
      })
    document
      .querySelector('.close-notifications')
      ?.addEventListener('click', () => {
        this.toggleNotifications()
      })
    document
      .getElementById('clearNotificationsBtn')
      ?.addEventListener('click', async () => {
        if (this.isGuest) {
          await this.showGuestPopup()
          return
        }
        const user = JSON.parse(localStorage.getItem('currentUser'))
        if (!user) return
        try {
          await api(`/api/activity/${user.id}/clear`, { method: 'DELETE' })
          document.getElementById('notificationsList').innerHTML = '<p>No activity yet</p>'
          document.getElementById('notificationBadge').style.display = 'none'
          document
            .getElementById('notificationsPanel')
            .classList.remove('active')
          this.showToast('Notifications cleared ✅', 'info')
        } catch {
          this.showToast('Failed to clear notifications ❌', 'error')
        }
      })
    document.querySelectorAll('.filter-btn')?.forEach(btn => {
      btn.addEventListener('click', e => {
        this.filterHabits(e.target.dataset.category)
      })
    })
    document.getElementById('saveNoteBtn')?.addEventListener('click', () => {
      this.saveDailyNote()
    })
    document.querySelectorAll('.btn-template')?.forEach(btn => {
      btn.addEventListener('click', e => {
        const template = e.target.closest('.template-card')?.dataset.template
        if (template) this.applyTemplate(template)
      })
    })
    document
      .getElementById('enableReminderBtn')
      ?.addEventListener('click', async () => {
        if (this.isGuest) {
          await this.showGuestPopup('Login to enable reminders!')
          return
        }
        if (!('Notification' in window)) {
          this.showToast('Notifications not supported', 'error')
          return
        }
        let enabled = localStorage.getItem('remindersEnabled') === 'true'
        if (!enabled) {
          if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
              this.showToast('Permission denied ❌', 'error')
              return
            }
          }
          localStorage.setItem('remindersEnabled', 'true')
          this.showToast('Reminders ON 🔔', 'success')
          this.scheduleAllReminders()
        } else {
          localStorage.setItem('remindersEnabled', 'false')
          this.showToast('Reminders OFF 🔕', 'info')
          this.reminderTimers.forEach(id => clearTimeout(id))
          this.reminderTimers = []
        }
        this.updateReminderIcon()
      })

    // ── Real-time input validation ──
    const nameInput = document.getElementById('signupName')
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        const val = nameInput.value
        const filtered = val.replace(/[^a-zA-Z\s]/g, '')
        if (val !== filtered) nameInput.value = filtered
        const err = document.getElementById('signupNameError')
        if (err) {
          err.textContent = filtered.length === 0 ? 'Name is required' : ''
        }
        nameInput.classList.toggle('input-invalid', filtered.length === 0 && val.length > 0)
        nameInput.classList.toggle('input-valid', filtered.length > 0)
      })
    }

    const signupEmail = document.getElementById('signupEmail')
    if (signupEmail) {
      signupEmail.addEventListener('input', async () => {
        const val = signupEmail.value.trim()
        const err = document.getElementById('signupEmailError')
        if (!val) {
          err.textContent = ''
          signupEmail.classList.remove('input-valid', 'input-invalid')
        } else if (!val.endsWith('@gmail.com')) {
          err.textContent = 'Must end with @gmail.com'
          signupEmail.classList.add('input-invalid')
          signupEmail.classList.remove('input-valid')
        } else {
          // Check if exists in DB
          try {
            const res = await api('/api/check-email-exists', {
              method: 'POST',
              body: JSON.stringify({ email: val })
            })
            const data = await res.json()
            if (data.exists) {
              err.textContent = 'Email id already registered ❌'
              signupEmail.classList.add('input-invalid')
              signupEmail.classList.remove('input-valid')
            } else {
              err.textContent = ''
              signupEmail.classList.remove('input-invalid')
              signupEmail.classList.add('input-valid')
            }
          } catch {
            err.textContent = ''
          }
        }
      })
    }

    const signupPass = document.getElementById('signupPassword')
    const panel = document.getElementById('passwordStrengthPanel')
    if (signupPass && panel) {
      signupPass.addEventListener('focus', () => {
        panel.classList.add('visible')
      })
      signupPass.addEventListener('blur', () => {
        if (!signupPass.value) panel.classList.remove('visible')
      })
      signupPass.addEventListener('input', () => {
        const val = signupPass.value
        panel.classList.add('visible')

        const rules = {
          'chk-length': val.length >= 8 && val.length <= 20,
          'chk-upper': /[A-Z]/.test(val),
          'chk-lower': /[a-z]/.test(val),
          'chk-number': /\d/.test(val),
          'chk-special': /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?~]/.test(val)
        }

        let passed = 0
        for (const [id, ok] of Object.entries(rules)) {
          const el = document.getElementById(id)
          if (!el) continue
          const icon = el.querySelector('i')
          if (ok) {
            el.classList.add('passed')
            icon.className = 'fas fa-check-square'
            passed++
          } else {
            el.classList.remove('passed')
            icon.className = 'far fa-square'
          }
        }

        const label = document.getElementById('strengthLabel')
        const bar = document.getElementById('strengthBarFill')
        bar.classList.remove('weak', 'medium', 'strong')
        if (passed <= 2) { label.textContent = 'Weak'; bar.classList.add('weak'); bar.style.width = '33%'; }
        else if (passed <= 4) { label.textContent = 'Medium'; bar.classList.add('medium'); bar.style.width = '66%'; }
        else { label.textContent = 'Strong'; bar.classList.add('strong'); bar.style.width = '100%'; }
      })
    }

    const resetEmailInput = document.getElementById('resetEmail')
    if (resetEmailInput) {
      resetEmailInput.addEventListener('input', () => {
        const val = resetEmailInput.value.trim()
        const err = document.getElementById('resetEmailError')
        if (!val) {
          err.textContent = ''
          resetEmailInput.classList.remove('input-valid', 'input-invalid')
        } else if (!val.endsWith('@gmail.com')) {
          err.textContent = 'Must end with @gmail.com'
          resetEmailInput.classList.add('input-invalid')
          resetEmailInput.classList.remove('input-valid')
        } else {
          err.textContent = ''
          resetEmailInput.classList.remove('input-invalid')
          resetEmailInput.classList.add('input-valid')
        }
      })
    }

    const resetPass = document.getElementById('resetNewPassword')
    const resetPanel = document.getElementById('resetStrengthPanel')
    if (resetPass && resetPanel) {
      resetPass.addEventListener('focus', () => resetPanel.classList.add('visible'))
      resetPass.addEventListener('blur', () => {
        if (!resetPass.value) resetPanel.classList.remove('visible')
      })
      resetPass.addEventListener('input', () => {
        const val = resetPass.value
        resetPanel.classList.add('visible')
        const rules = {
          'r-chk-length': val.length >= 8 && val.length <= 20,
          'r-chk-upper': /[A-Z]/.test(val),
          'r-chk-lower': /[a-z]/.test(val),
          'r-chk-number': /\d/.test(val),
          'r-chk-special': /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?~]/.test(val)
        }
        let passed = 0
        for (const [id, ok] of Object.entries(rules)) {
          const el = document.getElementById(id)
          if (!el) continue
          const icon = el.querySelector('i')
          if (ok) {
            el.classList.add('passed')
            icon.className = 'fas fa-check-square'
            passed++
          } else {
            el.classList.remove('passed')
            icon.className = 'far fa-square'
          }
        }
        const label = document.getElementById('resetStrengthLabel')
        const bar = document.getElementById('resetStrengthBar')
        bar.classList.remove('weak', 'medium', 'strong')
        if (passed <= 2) { label.textContent = 'Weak'; bar.classList.add('weak'); bar.style.width = '33%'; }
        else if (passed <= 4) { label.textContent = 'Medium'; bar.classList.add('medium'); bar.style.width = '66%'; }
        else { label.textContent = 'Strong'; bar.classList.add('strong'); bar.style.width = '100%'; }
      })
    }

    const resetConfirm = document.getElementById('resetConfirmPassword')
    if (resetConfirm) {
      resetConfirm.addEventListener('input', () => {
        const pass = document.getElementById('resetNewPassword').value
        const conf = resetConfirm.value
        const err = document.getElementById('resetConfirmError')
        if (conf && pass !== conf) {
          err.textContent = 'Passwords do not match ❌'
          resetConfirm.classList.add('input-invalid')
        } else {
          err.textContent = ''
          resetConfirm.classList.remove('input-invalid')
          if (conf) resetConfirm.classList.add('input-valid')
        }
      })
    }

    const loginEmail = document.getElementById('loginEmail')
    if (loginEmail) {
      loginEmail.addEventListener('input', () => {
        const val = loginEmail.value.trim()
        const err = document.getElementById('loginEmailError')
        if (!val) {
          err.textContent = ''
          loginEmail.classList.remove('input-valid', 'input-invalid')
        } else {
          // Only show validation on submit, but clear errors if user clears input
          err.textContent = ''
          loginEmail.classList.remove('input-invalid')
        }
      })
    }

    const loginPass = document.getElementById('loginPassword')
    if (loginPass) {
      loginPass.addEventListener('input', () => {
        const val = loginPass.value
        const err = document.getElementById('loginPasswordError')
        if (!val) {
          err.textContent = ''
          loginPass.classList.remove('input-valid', 'input-invalid')
        } else {
          // Silent validation while typing to avoid annoyance
          err.textContent = ''
          loginPass.classList.remove('input-invalid')
        }
      })
    }

    // ── Password show/hide toggle ──
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target')
        const input = document.getElementById(targetId)
        if (!input) return
        const icon = btn.querySelector('i')
        if (input.type === 'password') {
          input.type = 'text'
          icon.className = 'fas fa-eye-slash'
        } else {
          input.type = 'password'
          icon.className = 'fas fa-eye'
        }
      })
    })
  }
  toggleAuthForm (form) {
    const loginForm = document.getElementById('loginForm')
    const signupForm = document.getElementById('signupForm')
    if (form === 'signup') {
      loginForm.classList.remove('active')
      signupForm.classList.add('active')
    } else {
      signupForm.classList.remove('active')
      loginForm.classList.add('active')
    }
  }
  async handleLogin () {
    const email = document.getElementById('loginEmail').value.trim()
    const password = document.getElementById('loginPassword').value
    
    if (!email.endsWith('@gmail.com')) {
      this.showToast('Email must end with @gmail.com', 'error');
      return;
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,20}$/;
    if (!passwordRegex.test(password)) {
      this.showToast('Invalid password format', 'error');
      return;
    }

    try {
      const res = await api('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!data.success) {
        this.showToast(data.message || 'Login failed ❌', 'error')
        return
      }
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      localStorage.setItem('authToken', data.token)
      this.isGuest = false
      const banner = document.getElementById('guestBanner')
      if (banner) banner.style.display = 'none'
      updateNavbarUser(data.user.name)
      await this.loadHabitsFromServer(data.user.id)
      this.showToast('Welcome back! 🎉')
      this.showDashboard()
    } catch (err) {
      console.error(err)
      this.showToast('Server not reachable ❌', 'error')
    }
  }
  async handleSignup () {
    const name = document.getElementById('signupName').value.trim()
    const email = document.getElementById('signupEmail').value.trim()
    const password = document.getElementById('signupPassword').value

    if (!/^[a-zA-Z\s]+$/.test(name)) {
      this.showToast('Name can only contain letters and spaces', 'error');
      return;
    }
    
    if (!email.endsWith('@gmail.com')) {
      this.showToast('Email must end with @gmail.com', 'error');
      return;
    }
    
    // Block if email is already registered (from live check)
    const emailErr = document.getElementById('signupEmailError')
    if (emailErr && emailErr.textContent.includes('already registered')) {
      this.showToast('Please use a different email', 'error')
      return
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,20}$/;
    if (!passwordRegex.test(password)) {
      this.showToast('Password is too weak', 'error');
      return;
    }

    try {
      const res = await api('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()
      if (data.success) {
        this.showToast('Account created! Now login 👍', 'success')
        this.clearAuthForms()
        this.toggleAuthForm('login')
      } else {
        this.showToast(data.message, 'error')
      }
    } catch (err) {
      this.showToast('Server not reachable', 'error')
    }
  }
  async handleLogout () {
    try {
      await api('/api/logout', { method: 'POST' })
    } catch (err) {
      console.error('Logout failed', err)
    }
    localStorage.removeItem('currentUser')
    localStorage.removeItem('authToken')
    this.isGuest = true
    this.showToast('Logged out 👋', 'info')
    setTimeout(() => {
      this.clearAuthForms()
      this.loadDemoData()
      this.showAuth()
    }, 400)
  }
  async handleDeleteAccount () {
    if (this.isGuest) {
      this.showToast('Guests cannot delete account.', 'error')
      return
    }
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return

    const confirm1 = await this.showConfirm('Are you sure you want to permanently delete your account? All habits, tracking records, and reflections will be deleted forever.')
    if (!confirm1) return

    const confirm2 = await this.showConfirm('This action is irreversible. You will need to re-register to use the system again. Proceed with deletion?')
    if (!confirm2) return

    try {
      const res = await api(`/api/user/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        this.showToast('Account permanently deleted 👋', 'success')
        localStorage.removeItem('currentUser')
        localStorage.removeItem('authToken')
        this.isGuest = true
        setTimeout(() => {
          this.clearAuthForms()
          this.loadDemoData()
          this.showAuth()
        }, 400)
      } else {
        this.showToast(data.message || 'Deletion failed', 'error')
      }
    } catch (err) {
      console.error(err)
      this.showToast('Server not reachable ❌', 'error')
    }
  }
  showAuth () {
    // Force light mode on auth screens
    document.body.classList.remove('dark-mode')
    const dmBtn = document.getElementById('darkModeToggle')
    if (dmBtn) dmBtn.innerHTML = '<i class="fas fa-moon"></i>'
    document.getElementById('authScreen').classList.add('active')
    document.getElementById('dashboardScreen').classList.remove('active')
  }
  clearAuthForms () {
    const loginForm = document.getElementById('loginForm')
    const signupForm = document.getElementById('signupForm')
    if (loginForm) loginForm.reset()
    if (signupForm) signupForm.reset()
    document.getElementById('resetEmail').value = ''
    document.getElementById('resetOTP').value = ''
    document.getElementById('resetNewPassword').value = ''
    document.getElementById('resetConfirmPassword').value = ''
  }
  showResetModal () {
    document.getElementById('resetModal').classList.add('active')
    document.getElementById('resetStep1').classList.add('active')
    document.getElementById('resetStep2').classList.remove('active')
  }
  hideResetModal () {
    document.getElementById('resetModal').classList.remove('active')
    this.clearAuthForms()
  }
  async handleSendOTP () {
    const email = document.getElementById('resetEmail').value.trim()
    if (!email.endsWith('@gmail.com')) {
      this.showToast('Please enter a valid @gmail.com email', 'error')
      return
    }
    
    try {
      const res = await api('/api/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        this.showToast('Enter OTP 123456 for test 📧', 'success')
        document.getElementById('resetStep1').classList.remove('active')
        document.getElementById('resetStep2').classList.add('active')
      } else {
        this.showToast('Check email ID ❌', 'error')
      }
    } catch (err) {
      this.showToast('Error verifying email', 'error')
    }
  }
  async handleVerifyReset () {
    const email = document.getElementById('resetEmail').value.trim()
    const otp = document.getElementById('resetOTP').value
    const pass = document.getElementById('resetNewPassword').value
    const confirm = document.getElementById('resetConfirmPassword').value
    
    if (otp.length !== 6) {
      this.showToast('Invalid OTP format (6 digits required)', 'error')
      return
    }
    if (pass !== confirm) {
      this.showToast('Passwords do not match ❌', 'error')
      return
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,20}$/;
    if (!passwordRegex.test(pass)) {
      this.showToast('Password must meet all security requirements', 'error')
      return
    }

    try {
      const res = await api('/api/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass })
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        this.showToast('Password reset successful! 🎉', 'success')
        this.hideResetModal()
        this.toggleAuthForm('login')
      } else {
        this.showToast(data.message || 'Reset failed ❌', 'error')
      }
    } catch (err) {
      this.showToast('Reset failed ❌', 'error')
    }
  }
  showDashboard () {
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user && !this.isGuest) {
      this.showAuth()
      return
    }
    // Restore dark mode preference on dashboard
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode')
      const btn = document.getElementById('darkModeToggle')
      if (btn) btn.innerHTML = '<i class="fas fa-sun"></i>'
    }
    
    // Toggle Danger Zone block visibility based on guest status
    const dz = document.querySelector('.danger-zone-section')
    if (dz) {
      dz.style.display = this.isGuest ? 'none' : 'block'
    }
    
    updateNavbarUser(user ? user.name : 'Guest')
    document.getElementById('authScreen').classList.remove('active')
    document.getElementById('dashboardScreen').classList.add('active')
    this.loadDashboard()
  }
  async loadDashboard () {
    await this.loadTemplates()
    if (!this.isGuest) await this.loadHabitsFromServer()
    await this.renderWeeklyChart()
    await this.renderStreakCalendar()
    await this.renderAchievements()
    this.prevAchievements = this.userAchievements?.map(a => a.id) || []
    if (!this.isGuest) {
      await this.loadDailyNote()
      await this.loadDashboardSummary()
      await this.loadDetailedStats()
    } else {
      // Mock stats for demo
      document.getElementById('currentStreak').textContent = '5'
      document.getElementById('bestStreak').textContent = '15'
      document.getElementById('completionRate').textContent = '66%'
      document.getElementById('totalHabits').textContent = '3'
    }
    this.startMotivationCycling()
    this.updateProgressCircle()
    this.renderHabits()
    this.updateReminderIcon()
    this.initReminders()
    this.loadInsights()
    await this.loadPersonalRecords()
  }
  getVisibleHabits () {
    if (!this.habits) return []
    if (this.currentFilter === 'all') return this.habits
    return this.habits.filter(h => h.category === this.currentFilter)
  }
  startMotivationCycling () {
    if (this.motivationInterval) clearInterval(this.motivationInterval)
    this.motivationIndex = 0
    this.showMotivation()
    this.motivationInterval = setInterval(() => {
      this.motivationIndex++
      this.showMotivation()
    }, 3000)
  }
  showMotivation () {
    const habits = this.getVisibleHabits() || []
    const streaks = habits
      .map(h => streakMessages[h.current_streak])
      .filter(Boolean)
    
    // Total messages = motivationMessages + current streaks
    const allMessages = [...motivationMessages, ...streaks]
    if (allMessages.length === 0) return

    if (this.motivationIndex >= allMessages.length) {
      this.motivationIndex = 0
    }
    
    const message = allMessages[this.motivationIndex]
    const el = document.getElementById('motivationText')
    if (el) {
      el.style.opacity = '0'
      setTimeout(() => {
        el.textContent = message
        el.style.opacity = '1'
      }, 300)
    }
  }
  updateProgressCircle () {
    const habits = this.getVisibleHabits()
    const today = new Date().toISOString().split('T')[0]
    let completedToday = 0
    habits.forEach(habit => {
      if (habit.today_status === 'done') {
        completedToday++
      }
    })
    const percentage =
      habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0
    const circumference = 2 * Math.PI * 85
    const offset = circumference - (percentage / 100) * circumference
    const circle = document.querySelector('.progress-ring-circle')
    circle.style.strokeDashoffset = offset
    document.getElementById('progressPercent').textContent = percentage + '%'
  }
  async markHabit (habitId, status) {
    if (this.isGuest) {
      await this.showGuestPopup()
      return
    }
    if (this.loading) return
    this.loading = true
    try {
      const res = await api(`/api/habits/${habitId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!data.success) {
        this.showToast(data.message || 'Update failed ❌', 'error')
        return
      }
      if (status === 'done')
        this.showToast('Great job! Habit completed! ✅', 'success')
      else this.showToast('Marked as missed. Try again tomorrow! 💪', 'info')
      const habit = this.habits.find(h => h.id === habitId)
      if (habit) {
        habit.current_streak = data.streak
        habit.best_streak = data.best_streak
        habit.consistency = data.consistency
        habit.today_status = status
        updateHabitStats(habitId, data)
        updateHabitCard(habit)
      }
      this.renderHabits()
      await this.loadDashboardSummary()
      this.updateProgressCircle()
      const before = this.prevAchievements || []
      await this.renderAchievements()
      const after = this.userAchievements?.map(a => a.id) || []
      const unlocked = after.filter(id => !before.includes(id))
      if (unlocked.length > 0) {
        const a = achievementsData.find(x => x.id === unlocked[0])
        if (a) this.showAchievementPopup(a.name)
      }
      this.prevAchievements = after
      await this.loadPersonalRecords()
      await this.renderWeeklyChart()
      await this.renderStreakCalendar()
    } catch (err) {
      console.error(err)
      this.showToast('Server unreachable ❌', 'error')
    } finally {
      this.loading = false
    }
  }
  async deleteHabit (habitId) {
    if (this.isGuest) {
      await this.showGuestPopup()
      return
    }
    const ok = await this.showConfirm('Delete this habit?')
    if (!ok) return
    try {
      const res = await api(`/api/habits/${habitId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!data.success) {
        this.showToast('Delete failed ❌', 'error')
        return
      }
      this.showToast('Habit deleted 🗑️', 'info')
      await this.loadDashboard()
    } catch {
      this.showToast('Server unreachable ❌', 'error')
    }
  }
  showAddHabitModal () {
    document.getElementById('addHabitModal').classList.add('active')
  }
  async openEditHabit (habitId) {
    if (this.isGuest) {
      await this.showGuestPopup()
      return
    }
    const habit = this.habits.find(h => h.id === habitId)
    if (!habit) return
    this.editingHabitId = habitId
    document.getElementById('habitName').value = habit.habit_name
    document.getElementById('habitCategory').value = habit.category
    document.getElementById('habitFrequency').value = habit.frequency
    document.getElementById('habitReminder').value = habit.reminder_time || ''
    document.getElementById('habitStartDate').value = habit.created_date
    document.querySelector('#addHabitModal h2').textContent = 'Edit Habit'
    document.querySelector('#addHabitForm button[type="submit"]').textContent =
      'Update Habit'
    this.showAddHabitModal()
  }
  hideAddHabitModal () {
    document.getElementById('addHabitModal').classList.remove('active')
    document.getElementById('addHabitForm').reset()
    document.getElementById('habitStartDate').value = new Date().toISOString().split('T')[0]
    this.editingHabitId = null
    document.querySelector('#addHabitModal h2').textContent = 'Add New Habit'
    document.querySelector('#addHabitForm button[type="submit"]').textContent =
      'Save Habit'
  }
  async handleAddHabit () {
    if (this.isGuest) {
      this.hideAddHabitModal()
      await this.showGuestPopup()
      return
    }
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) {
      this.showToast('Login expired. Please login again.', 'error')
      return
    }
    const habitData = {
      name: document.getElementById('habitName').value,
      category: document.getElementById('habitCategory').value,
      frequency: document.getElementById('habitFrequency').value,
      reminder: document.getElementById('habitReminder').value,
      startDate: document.getElementById('habitStartDate').value
    }
    if (this.editingHabitId) {
      try {
        const res = await api(`/api/habits/${this.editingHabitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habitData)
        })
        const data = await res.json()
        if (!data.success) {
          this.showToast('Update failed ❌', 'error')
          return
        }
        const habit = this.habits.find(h => h.id === this.editingHabitId)
        if (habit) {
          habit.habit_name = habitData.name
          habit.category = habitData.category
          habit.frequency = habitData.frequency
          habit.reminder_time = habitData.reminder
          habit.created_date = habitData.startDate
        }
        this.showToast('Habit updated ✏️', 'success')
        this.editingHabitId = null
        this.hideAddHabitModal()
        this.renderHabits()
        await this.loadDashboardSummary()
        this.updateProgressCircle()
        await this.loadPersonalRecords()
        await this.renderWeeklyChart()
        await this.renderStreakCalendar()
        return
      } catch {
        this.showToast('Server error ❌', 'error')
        return
      }
    }
    try {
      const res = await api('/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(habitData)
      })
      const data = await res.json()
      if (!data.success) {
        this.showToast(data.message || 'Failed to add habit ❌', 'error')
        return
      }
      this.showToast('Habit saved!', 'success')
      this.hideAddHabitModal()
      await this.loadHabitsFromServer()
      this.renderHabits()
      await this.loadDashboardSummary()
      this.updateProgressCircle()
      await this.loadPersonalRecords()
    } catch {
      this.showToast('Server not reachable ❌', 'error')
    }
  }
  async renderWeeklyChart () {
    const canvas = document.getElementById('progressChart')
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = 300
    const user = JSON.parse(localStorage.getItem('currentUser'))
    let weekly = {}
    if (this.isGuest) {
      weekly = { Sun: 40, Mon: 85, Tue: 70, Wed: 90, Thu: 60, Fri: 80, Sat: 50 }
    } else {
      const res = await api(`/api/user/${user.id}/weekly`)
      weekly = await res.json()
    }
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const data = days.map(d => weekly[d] ?? 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const barWidth = canvas.width / 7 - 20
    const maxHeight = canvas.height - 60
    data.forEach((value, index) => {
      const x = index * (barWidth + 20) + 10
      const maxHabits = Math.max(...data, 1)
      const height = (value / maxHabits) * maxHeight
      const y = canvas.height - height - 40
      const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - 40)
      gradient.addColorStop(0, '#667eea')
      gradient.addColorStop(1, '#764ba2')
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth, height)
      const isDark = document.body.classList.contains('dark-mode')
      ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(value + '%', x + barWidth / 2, y - 10)
      ctx.fillStyle = isDark ? '#cbd5e1' : '#0f172a'
      ctx.font = '12px Arial'
      ctx.fillText(days[index], x + barWidth / 2, canvas.height - 15)
    })
  }
  async renderStreakCalendar () {
    const calendar = document.getElementById('streakCalendar')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const year = today.getFullYear()
    const month = today.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    const historyCache = {}
    if (this.isGuest) {
      // Mock some history for demo
      const todayNum = today.getDate()
      for (const habit of this.habits || []) {
        historyCache[habit.id] = {}
        for (let d = 1; d <= todayNum; d++) {
          const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          if (Math.random() > 0.3) historyCache[habit.id][dStr] = 'done'
          else if (Math.random() > 0.5) historyCache[habit.id][dStr] = 'missed'
        }
      }
    } else {
      const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
        daysInMonth
      ).padStart(2, '0')}`
      for (const habit of this.habits || []) {
        const res = await api(
          `/api/habit/${habit.id}/history?from=${firstDayStr}&to=${lastDayStr}`
        )
        historyCache[habit.id] = await res.json()
      }
    }
    const todayStr =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    let html = ''
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    dayHeaders.forEach(day => {
      html += `<div style="text-align:center;font-weight:600;color:var(--gray);padding:10px;">${day}</div>`
    })
    for (let i = 0; i < startingDayOfWeek; i++) html += '<div></div>'
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      date.setHours(0, 0, 0, 0)
      const dateStr =
        date.getFullYear() +
        '-' +
        String(date.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date.getDate()).padStart(2, '0')
      const isToday = date.getTime() === today.getTime()
      let doneCount = 0
      let activeHabits = 0
      this.habits.forEach(habit => {
        const parts = habit.created_date.split('-')
        const startDate = new Date(parts[0], parts[1] - 1, parts[2])
        startDate.setHours(0, 0, 0, 0)
        if (date < startDate) return
        activeHabits++
        const status = historyCache[habit.id]?.[dateStr]
        if (status === 'done') doneCount++
      })
      let className = 'calendar-day'
      if (isToday) className += ' today'
      if (date > today) {
      } else if (isToday) {
        if (doneCount === activeHabits && activeHabits > 0)
          className += ' completed'
        else if (doneCount > 0) className += ' partial'
      } else {
        if (activeHabits === 0) {
        } else if (doneCount === activeHabits) {
          className += ' completed'
        } else {
          className += ' missed'
        }
      }
      html += `<div class="${className}">${day}</div>`
    }
    calendar.innerHTML = html
  }
  showToast (message, type = 'success') {
    const toast = document.getElementById('toast')
    const toastMessage = document.getElementById('toastMessage')
    const icon = toast.querySelector('i')
    toastMessage.textContent = message
    toast.classList.remove('success', 'error', 'info')
    if (type === 'error') {
      icon.className = 'fas fa-times-circle'
      toast.classList.add('error')
    } else if (type === 'info') {
      icon.className = 'fas fa-info-circle'
      toast.classList.add('info')
    } else {
      icon.className = 'fas fa-check-circle'
      toast.classList.add('success')
    }
    toast.classList.add('show')
    setTimeout(() => {
      toast.classList.remove('show')
    }, 3000)
  }
  async toggleDarkMode () {
    document.body.classList.toggle('dark-mode')
    const isDark = document.body.classList.contains('dark-mode')
    localStorage.setItem('darkMode', isDark)
    const icon = document.getElementById('darkModeToggle').querySelector('i')
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon'
    this.showToast(isDark ? 'Dark mode enabled 🌙' : 'Light mode enabled ☀️')
    await this.renderWeeklyChart()
  }
  async toggleNotifications () {
    const panel = document.getElementById('notificationsPanel')
    panel.classList.toggle('active')
    if (!panel.classList.contains('active')) return
    if (this.isGuest) {
      const list = document.getElementById('notificationsList')
      list.innerHTML = '<p>Login to see activity</p>'
      return
    }
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    const res = await api(`/api/activity/${user.id}`)
    const data = await res.json()
    const list = document.getElementById('notificationsList')
    const badge = document.getElementById('notificationBadge')
    const unread = data.activities.filter(a => a.is_read === 0).length
    badge.textContent = unread
    badge.style.display = unread > 0 ? 'block' : 'none'
    if (data.activities.length === 0) {
      list.innerHTML = '<p>No activity yet</p>'
    } else {
      list.innerHTML = data.activities
        .map(
          a => `
      <div class="notification-item">
        <div class="time">${new Date(a.created_at).toLocaleTimeString()}</div>
        <div class="message">
          <strong>${a.title}</strong><br>
          ${a.description || ''}
        </div>
      </div>
    `
        )
        .join('')
    }
    await api(`/api/activity/${user.id}/read`, { method: 'POST' })
  }
  filterHabits (category) {
    this.currentFilter = category
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active')
      if (btn.dataset.category === category) btn.classList.add('active')
    })
    this.renderHabits()
    this.loadDashboardSummary()
    this.updateProgressCircle()
    this.showMotivation()
  }
  renderHabits () {
    const habitsList = document.getElementById('habitsList')
    let habits = this.habits || []
    if (this.currentFilter !== 'all') {
      habits = habits.filter(h => h.category === this.currentFilter)
    }
    const emptyState = document.getElementById('emptyHabitState')
    if (habits.length === 0) {
      if (emptyState) emptyState.style.display = 'block'
      habitsList.innerHTML = ''
      document.getElementById('currentStreak').textContent = '0'
      document.getElementById('bestStreak').textContent = '0'
      document.getElementById('completionRate').textContent = '0%'
      document.getElementById('totalHabits').textContent = '0'
      document.getElementById('progressPercent').textContent = '0%'
      document.getElementById('motivationText').textContent =
        'Start by creating your first habit 🚀'
      return
    } else {
      if (emptyState) emptyState.style.display = 'none'
    }
    habitsList.innerHTML = habits
      .map(habit => {
        const isCompleted = habit.today_status === 'done'
        const isMissed = habit.today_status === 'missed'
        const categoryIcons = {
          health: '🏃',
          study: '📚',
          productivity: '💼',
          mindfulness: '🧘',
          custom: '✨'
        }
        return `
<div class="habit-item ${isCompleted ? 'completed' : isMissed ? 'missed' : ''}"
     id="habit-${habit.id}"
     data-habit-id="${habit.id}">
          <div class="habit-info">
              <div class="habit-icon">${
                categoryIcons[habit.category] || '✨'
              }</div>
              <div class="habit-details">
                  <h3>${habit.habit_name}</h3>
<p class="habit-meta">
  ${habit.category} • ${habit.frequency}
</p>
<p class="habit-meta">
  📅 Start: ${habit.created_date}
</p>
${
  habit.reminder_time
    ? `<p class="habit-meta">⏰ Reminder: ${habit.reminder_time}</p>`
    : ''
}
<div class="habit-status">
    ${
      isCompleted
        ? '<span class="status-done">✔ Completed today</span>'
        : isMissed
        ? '<span class="status-missed">✖ Missed today</span>'
        : '<span class="status-pending">⏳ Pending today</span>'
    }
</div>
              </div>
<div class="habit-streak">
    <i class="fas fa-fire"></i>
    <span class="streak">${habit.current_streak} days</span>
</div>
<div class="habit-consistency">
    <i class="fas fa-chart-line"></i>
    <span class="consistency">${habit.consistency ?? 0}%</span>
</div>
          </div>
          <div class="habit-actions">
              ${
                !isCompleted && !isMissed
                  ? `
                  <button class="btn-check" onclick="app.markHabit(${habit.id}, 'done')">
                      <i class="fas fa-check"></i>
                  </button>
                  <button class="btn-skip" onclick="app.markHabit(${habit.id}, 'missed')">
                      <i class="fas fa-times"></i>
                  </button>
                `
                  : `
                  <button class="btn-check" style="opacity:0.5;cursor:not-allowed;" disabled>
                      <i class="fas fa-check"></i>
                  </button>
                `
              }
              <button class="btn-delete" onclick="app.deleteHabit(${habit.id})">
                  <i class="fas fa-trash"></i>
              </button>
              <button class="btn-edit" onclick="app.openEditHabit(${habit.id})">
  <i class="fas fa-pen"></i>
</button>
          </div>
      </div>
      `
      })
      .join('')
  }
  async renderAchievements () {
    await this.fetchAchievementsFromServer()
    const list = document.getElementById('achievementsList')
    if (!list) return
    list.innerHTML = achievementsData
      .map(achievement => {
        const isUnlocked = this.userAchievements?.find(
          a => a.id === achievement.id
        )
        return `
        <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="icon">${achievement.icon}</div>
          <h4>${achievement.name}</h4>
          <p>${achievement.description}</p>
        </div>
      `
      })
      .join('')
  }
  showAchievementPopup (achievementName) {
    const popup = document.getElementById('achievementPopup')
    const text = document.getElementById('achievementText')
    text.textContent = achievementName
    popup.classList.add('active')
  }
  closeAchievementPopup () {
    document.getElementById('achievementPopup').classList.remove('active')
  }
  renderLeaderboard () {
    const list = document.getElementById('leaderboardList')
    const habits = this.habits || []
    if (habits.length === 0) {
      list.innerHTML =
        '<p style="text-align: center; color: var(--gray);">No habits to display</p>'
      return
    }
    const sorted = habits
      .sort((a, b) => b.best_streak - a.best_streak)
      .slice(0, 5)
    list.innerHTML = sorted
      .map((habit, index) => {
        const medals = ['🥇', '🥈', '🥉']
        const rank = medals[index] || `#${index + 1}`
        return `
                <div class="leaderboard-item">
                    <div class="rank">${rank}</div>
                    <div class="info">
                        <h4>${habit.habit_name}</h4>
                        <p>Best Streak</p>
                    </div>
                    <div class="score">${habit.best_streak}</div>
                </div>
            `
      })
      .join('')
  }
  async saveDailyNote () {
    if (this.isGuest) {
      await this.showGuestPopup()
      return
    }
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const textarea = document.getElementById('dailyNote')
    if (!textarea) return
    try {
      await api(`/api/daily-note/${user.id}/${today}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textarea.value })
      })
      this.showToast('Note saved ✨', 'success')
    } catch (err) {
      console.error('Save note failed', err)
    }
  }
  async loadDailyNote () {
    if (this.isGuest) {
      const textarea = document.getElementById('dailyNote')
      if (textarea) textarea.value = "Great start to the day! Meditated for 10 minutes and finished my reading goal. Feeling productive! 🚀"
      return
    }
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    try {
      const res = await api(`/api/daily-note/${user.id}/${today}`)
      const data = await res.json()
      if (data.success) {
        const textarea = document.getElementById('dailyNote')
        if (textarea) textarea.value = data.content || ''
      }
    } catch (err) {
      console.error('Load note failed', err)
    }
  }
  updateDetailedStats () {
    return
  }
  initReminders () {
    const enabled = localStorage.getItem('remindersEnabled') === 'true'
    if (!enabled) return
    if (Notification.permission !== 'granted') return
    this.scheduleAllReminders()
  }
  scheduleAllReminders () {
    this.reminderTimers.forEach(id => clearTimeout(id))
    this.reminderTimers = []
    if (localStorage.getItem('remindersEnabled') !== 'true') return
    if (!this.habits) return
    this.habits.forEach(habit => {
      if (!habit.reminder_time) return
      const [hour, minute] = habit.reminder_time.split(':').map(Number)
      const now = new Date()
      const reminder = new Date()
      reminder.setHours(hour, minute, 0, 0)
      if (reminder <= now) reminder.setDate(reminder.getDate() + 1)
      const delay = reminder - now
      const id = setTimeout(() => this.showReminder(habit), delay)
      this.reminderTimers.push(id)
    })
  }
  showReminder (habit) {
    if (Notification.permission !== 'granted') return
    new Notification('Habit Reminder', {
      body: `Time for: ${habit.habit_name}`
    })
  }
  async applyTemplate (group) {
    if (this.isGuest) {
      await this.showGuestPopup()
      return
    }
    if (!this.templates || !this.templates[group]) return
    const items = this.templates[group]
    const list = document.getElementById('templateHabitsList')
    const modal = document.getElementById('templateModal')
    document.getElementById('templateModalTitle').textContent = 
      group.charAt(0).toUpperCase() + group.slice(1).replace(/_/g, ' ')
    
    list.innerHTML = items.map(item => `
      <div class="template-habit-item" onclick="app.selectTemplateHabit('${item.name.replace(/'/g, "\\'")}', '${item.category}')">
        <div class="info">
          <strong>${item.name}</strong>
          <span>${item.category}</span>
        </div>
        <i class="fas fa-plus"></i>
      </div>
    `).join('')
    
    modal.classList.add('active')
  }
  selectTemplateHabit(name, category) {
    document.getElementById('templateModal').classList.remove('active')
    document.getElementById('habitName').value = name
    document.getElementById('habitCategory').value = category
    this.showAddHabitModal()
  }
}
let app
document.addEventListener('DOMContentLoaded', () => {
  app = new HabitApp()
})
