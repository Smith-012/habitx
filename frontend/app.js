const API_BASE = 'http://127.0.0.1:5000'
function api (url, options = {}) {
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
    if (localStorage.getItem('remindersEnabled') === null) {
      localStorage.setItem('remindersEnabled', 'false')
    }
    this.init()
  }
  async init () {
    this.setupEventListeners()
    const savedUser = JSON.parse(localStorage.getItem('currentUser'))
    if (savedUser) {
      updateNavbarUser(savedUser.name)
      await this.loadHabitsFromServer(savedUser.id)
      this.showDashboard()
    } else {
      this.showAuth()
    }
  }
  async loadHabitsFromServer () {
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    try {
      const res = await api(`/api/habits/${user.id}`)
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
      const msg = document.getElementById('confirmMessage')
      const ok = document.getElementById('confirmOk')
      const cancel = document.getElementById('confirmCancel')
      msg.textContent = message
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
  async loadDashboardSummary () {
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) return
    try {
      const res = await api(`/api/user/${user.id}/summary`)
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
    document.getElementById('loginForm')?.addEventListener('submit', e => {
      e.preventDefault()
      this.handleLogin()
    })
    document.getElementById('signupForm')?.addEventListener('submit', e => {
      e.preventDefault()
      this.handleSignup()
    })
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.handleLogout()
    })
    document.getElementById('addHabitBtn')?.addEventListener('click', () => {
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
    if (dateInput) dateInput.valueAsDate = new Date()
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
        const user = JSON.parse(localStorage.getItem('currentUser'))
        if (!user) return
        try {
          await api(`/api/activity/${user.id}/read`, { method: 'POST' })
          await this.loadDashboardSummary()
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
    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value
    try {
      const res = await api('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!data.success) {
        this.showToast(data.message || 'Login failed ❌')
        return
      }
      localStorage.setItem('currentUser', JSON.stringify(data.user))
      updateNavbarUser(data.user.name)
      await this.loadHabitsFromServer(data.user.id)
      this.showToast('Welcome back! 🎉')
      this.showDashboard()
    } catch (err) {
      console.error(err)
      this.showToast('Server not reachable ❌')
    }
  }
  async handleSignup () {
    const name = document.getElementById('signupName').value
    const email = document.getElementById('signupEmail').value
    const password = document.getElementById('signupPassword').value
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
  handleLogout () {
    localStorage.removeItem('currentUser')
    this.showToast('Logged out 👋', 'info')
    setTimeout(() => {
      this.clearAuthForms()
      this.showAuth()
    }, 400)
  }
  showAuth () {
    document.getElementById('authScreen').classList.add('active')
    document.getElementById('dashboardScreen').classList.remove('active')
  }
  clearAuthForms () {
    const loginForm = document.getElementById('loginForm')
    const signupForm = document.getElementById('signupForm')
    if (loginForm) loginForm.reset()
    if (signupForm) signupForm.reset()
  }
  showDashboard () {
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) {
      this.showAuth()
      return
    }
    updateNavbarUser(user.name)
    document.getElementById('authScreen').classList.remove('active')
    document.getElementById('dashboardScreen').classList.add('active')
    this.loadDashboard()
  }
  async loadDashboard () {
    await this.loadTemplates()
    await this.loadHabitsFromServer()
    await this.renderWeeklyChart()
    await this.renderStreakCalendar()
    await this.renderAchievements()
    await this.loadDailyNote()
    await this.loadDashboardSummary()
    await this.loadDetailedStats()
    this.showMotivation()
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
  showMotivation () {
    const habits = this.getVisibleHabits()
    let message =
      motivationMessages[Math.floor(Math.random() * motivationMessages.length)]
    habits.forEach(habit => {
      if (streakMessages[habit.current_streak]) {
        message = streakMessages[habit.current_streak]
      }
    })
    document.getElementById('motivationText').textContent = message
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
  openEditHabit (habitId) {
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
    document.getElementById('habitStartDate').valueAsDate = new Date()
    this.editingHabitId = null
    document.querySelector('#addHabitModal h2').textContent = 'Add New Habit'
    document.querySelector('#addHabitForm button[type="submit"]').textContent =
      'Save Habit'
  }
  async handleAddHabit () {
    const user = JSON.parse(localStorage.getItem('currentUser'))
    if (!user) {
      this.showToast('Login expired. Please login again.', 'error')
      return
    }
    const habitData = {
      user_id: user.id,
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
    const res = await api(`/api/user/${user.id}/weekly`)
    const weekly = await res.json()
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
  applyTemplate (group) {
    if (!this.templates || !this.templates[group]) return
    const items = this.templates[group]
    const random = items[Math.floor(Math.random() * items.length)]
    document.getElementById('habitName').value = random.name
    document.getElementById('habitCategory').value = random.category
    this.showAddHabitModal()
  }
}
let app
document.addEventListener('DOMContentLoaded', () => {
  app = new HabitApp()
})
