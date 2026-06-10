/**
 * POMO — script.js
 * Pomodoro 기반 공부 웹서비스의 메인 스크립트
 *
 * 저장 키 (localStorage):
 *   pomo_users          — 등록된 사용자 목록
 *   pomo_current_user   — 현재 로그인한 사용자
 *   pomo_tasks          — task 배열
 *   pomo_active_task_id — 현재 active task ID
 *   pomo_records        — 날짜별 POMO 기록
 *   pomo_settings       — 사용자 설정 (향후 확장용)
 */

'use strict';

/* =====================================================
   CONSTANTS
   ===================================================== */

const STUDY_DURATION = 25 * 60; // 25분 (초)
const REST_DURATION  = 5  * 60; // 5분  (초)

// Study Theme 정의 — scene 경로는 실제 파일 위치 기준
// 추가 테마 이미지/음악은 assets 폴더에 넣고 경로를 맞춰주면 됨
const STUDY_THEMES = [
  {
    name:  'Cafe Kitchen',
    scene: 'assets/images/backgrounds/study-scene-1.png',
    music: 'assets/music/study/study-1.mp3',
  },
  {
    name:  'Library Night',
    scene: '',   // study-scene-2.png를 추가하면 연결됨
    music: 'assets/music/study/study-2.mp3',
  },
  {
    name:  'Garden Breeze',
    scene: '',
    music: 'assets/music/study/study-3.mp3',
  },
  {
    name:  'Rainy Window',
    scene: '',
    music: 'assets/music/study/study-4.mp3',
  },
];

// Rest Theme 정의
const REST_THEMES = [
  {
    name:  'Sunny Meadow',
    scene: 'assets/images/backgrounds/rest-scene-1.png',
    music: 'assets/music/rest/rest-1.mp3',
  },
  {
    name:  'Cozy Couch',
    scene: '',   // rest-scene-2.png를 추가하면 연결됨
    music: 'assets/music/rest/rest-2.mp3',
  },
  {
    name:  'Starry Night',
    scene: '',
    music: 'assets/music/rest/rest-3.mp3',
  },
  {
    name:  'Campfire',
    scene: '',
    music: 'assets/music/rest/rest-4.mp3',
  },
];

const STUDY_MESSAGES = [
  'Keep going! Keep going! Keep going!',
  'One POMO at a time.',
  'Stay focused. You got this.',
  'Tiny steps still count.',
  'Eat one more POMO!',
  'You are doing great. Keep it up!',
  'Focus now, relax later.',
  'Every minute counts.',
];

const REST_MESSAGES = [
  'You worked hard. Take a real break.',
  'Breathe in, breathe out.',
  'Step back and recharge.',
  'Rest your eyes for a moment.',
  'Break time. You earned it.',
  'Get ready for the next POMO.',
  'Close your eyes and breathe.',
  'Stretch it out. You deserve it!',
];

// 레벨 테이블
const LEVEL_TABLE = [
  { min: 0,   max: 4,   level: 'Lv. Rookie',       message: 'Still hungry for more POMOs? Keep going!' },
  { min: 5,   max: 14,  level: 'Lv. POMO Starter',  message: 'Nice start. Your POMO beat is growing!' },
  { min: 15,  max: 29,  level: 'Lv. POMO Eater',    message: 'You are getting into the rhythm!' },
  { min: 30,  max: 59,  level: 'Lv. Focus Tomato',  message: 'Your focus habit is getting stronger.' },
  { min: 60,  max: 99,  level: 'Lv. POMO Lover',    message: 'You have eaten a lot of POMOs already!' },
  { min: 100, max: Infinity, level: 'Lv. POMO Master', message: 'Amazing. You are a true POMO master!' },
];

/* =====================================================
   STATE
   ===================================================== */
let studyInterval     = null;   // Study setInterval ID
let studyRemaining    = STUDY_DURATION;
let studyIsRunning    = false;
let studyThemeIndex   = 0;

let restInterval      = null;   // Rest setInterval ID
let restRemaining     = REST_DURATION;
let restIsRunning     = false;
let restThemeIndex    = 0;

let currentModal      = null;   // 현재 열린 modal 타입
let pendingDeleteId   = null;   // 삭제 대기 task ID

let calendarYear      = new Date().getFullYear();
let calendarMonth     = new Date().getMonth();  // 0-indexed
let selectedDate      = null;

// Audio 엘리먼트 (한 쌍만 유지)
let studyAudio        = new Audio();
let restAudio         = new Audio();
studyAudio.loop       = true;
restAudio.loop        = true;

/* =====================================================
   UTILITY
   ===================================================== */

/** ID 생성 */
function generateId() {
  return 'task-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

/** 초 → MM:SS */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/** 로컬 날짜 YYYY-MM-DD */
function getLocalDateString() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** localStorage 안전 파싱 */
function safeJsonParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === '') return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[POMO] localStorage parse error for key "${key}"`, e);
    return fallback;
  }
}

/** localStorage 안전 저장 */
function safeJsonSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[POMO] localStorage save error for key "${key}"`, e);
  }
}

/** 이미지 로드 성공 시 표시, 실패 시 플레이스홀더 */
function tryLoadImg(imgEl, placeholderEl, src, fallbackEmoji) {
  if (!src) {
    imgEl.style.display = 'none';
    placeholderEl.textContent = fallbackEmoji;
    placeholderEl.style.display = '';
    return;
  }
  const tempImg = new Image();
  tempImg.onload = () => {
    imgEl.src = src;
    imgEl.style.display = 'block';
    placeholderEl.style.display = 'none';
  };
  tempImg.onerror = () => {
    imgEl.style.display = 'none';
    placeholderEl.textContent = fallbackEmoji;
    placeholderEl.style.display = '';
  };
  tempImg.src = src;
}

/* =====================================================
   NAVIGATION
   ===================================================== */

/** 페이지 show/hide */
function showPage(pageId) {
  // 페이지 전환 시 타이머 pause 처리
  if (studyIsRunning && pageId !== 'studyPage') {
    pauseStudyTimer();
  }
  if (restIsRunning && pageId !== 'restPage') {
    pauseRestTimer();
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active-page');
}

/** Study Timer 페이지로 이동 */
function navigateToStudy() {
  showPage('studyPage');
  document.getElementById('studyMessageBar').textContent = getRandomStudyMessage();
  renderTasks();
  renderStudyActiveLabel();
}

/** Rest Timer 페이지로 이동 */
function navigateToRest() {
  showPage('restPage');
  document.getElementById('restMessageBar').textContent = getRandomRestMessage();
}

/** 네비게이션 초기화 */
function initNavigation() {
  // header는 HTML에서 직접 onclick으로 연결됨
}

/* =====================================================
   AUTH — demo only, not secure
   ===================================================== */

function getCurrentUser() {
  return safeJsonParse('pomo_current_user', null);
}

function signUp() {
  const username = document.getElementById('signupUsername').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!username) { alert('Please enter a username.'); return; }
  if (!password) { alert('Please enter a password.'); return; }

  const users = safeJsonParse('pomo_users', {});
  if (users[username]) {
    alert('Username already exists. Please choose another.');
    return;
  }

  // demo only, not secure — 평문 저장 (교육용 데모)
  users[username] = { password };
  safeJsonSave('pomo_users', users);
  safeJsonSave('pomo_current_user', username);

  closeModal();
  updateAuthUI();
  alert(`Welcome, ${username}! You are now signed up and logged in.`);
}

function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username) { alert('Please enter your username.'); return; }
  if (!password) { alert('Please enter your password.'); return; }

  const users = safeJsonParse('pomo_users', {});

  // demo only, not secure
  if (!users[username] || users[username].password !== password) {
    alert('Invalid username or password.');
    return;
  }

  safeJsonSave('pomo_current_user', username);
  closeModal();
  updateAuthUI();
  alert(`Welcome back, ${username}!`);
}

function logout() {
  if (!confirm('Are you sure you want to log out?')) return;
  localStorage.removeItem('pomo_current_user');
  updateAuthUI();
}

function updateAuthUI() {
  const user       = getCurrentUser();
  const loginBtn   = document.getElementById('loginBtn');
  const signupBtn  = document.getElementById('signupBtn');
  const logoutBtn  = document.getElementById('logoutBtn');
  const greeting   = document.getElementById('userGreeting');

  if (user) {
    loginBtn.style.display   = 'none';
    signupBtn.style.display  = 'none';
    logoutBtn.style.display  = '';
    greeting.style.display   = '';
    greeting.textContent     = `Hi, ${user} 🍅`;
  } else {
    loginBtn.style.display   = '';
    signupBtn.style.display  = '';
    logoutBtn.style.display  = 'none';
    greeting.style.display   = 'none';
  }
}

/* =====================================================
   TASKS
   ===================================================== */

function loadTasks() {
  return safeJsonParse('pomo_tasks', []);
}

function saveTasks(tasks) {
  safeJsonSave('pomo_tasks', tasks);
}

function getActiveTaskId() {
  return safeJsonParse('pomo_active_task_id', null);
}

function setActiveTaskId(taskId) {
  safeJsonSave('pomo_active_task_id', taskId);
}

function getActiveTask() {
  const id    = getActiveTaskId();
  if (!id) return null;
  const tasks = loadTasks();
  return tasks.find(t => t.id === id) || null;
}

/** task 생성 */
function createTask(title, targetPomos) {
  const tasks = loadTasks();
  const newTask = {
    id:              generateId(),
    title:           title.trim(),
    targetPomos:     targetPomos,
    completedPomos:  0,
    createdAt:       new Date().toISOString(),
    status:          'active',
  };
  tasks.unshift(newTask); // 최신 task가 앞에
  saveTasks(tasks);
  setActiveTaskId(newTask.id);
  return newTask;
}

/** task active 설정 */
function setActiveTask(taskId) {
  const tasks = loadTasks();
  const task  = tasks.find(t => t.id === taskId);
  if (!task || task.status === 'completed') return;
  setActiveTaskId(taskId);
  renderTasks();
  renderStudyActiveLabel();
}

/** task 삭제 */
function deleteTask(taskId) {
  let tasks = loadTasks();
  tasks = tasks.filter(t => t.id !== taskId);
  saveTasks(tasks);

  // 삭제된 task가 active였으면 다음 active 선택
  if (getActiveTaskId() === taskId) {
    selectNextAvailableTask(tasks);
  }

  renderTasks();
  renderStudyActiveLabel();
}

/** 다음 사용 가능한 task 선택 */
function selectNextAvailableTask(tasks) {
  const available = (tasks || loadTasks()).filter(t => t.status !== 'completed');
  if (available.length > 0) {
    setActiveTaskId(available[0].id);
  } else {
    setActiveTaskId(null);
  }
}

/** task 진행 업데이트 (POMO 1개 완료) */
function updateTaskProgress() {
  const taskId = getActiveTaskId();
  if (!taskId) return;

  const tasks = loadTasks();
  const idx   = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;

  const task = tasks[idx];
  if (task.status === 'completed') return;

  // completedPomos가 targetPomos를 초과하지 않도록
  if (task.completedPomos < task.targetPomos) {
    task.completedPomos += 1;
  }

  if (task.completedPomos >= task.targetPomos) {
    task.status = 'completed';
  }

  tasks[idx] = task;
  saveTasks(tasks);

  // task 완료 시 다음 active 선택
  if (task.status === 'completed') {
    selectNextAvailableTask(tasks);
  }

  renderTasks();
  renderStudyActiveLabel();
}

/** Task Desk 렌더링 */
function renderTasks() {
  const grid    = document.getElementById('taskGrid');
  const emptyEl = document.getElementById('taskEmpty');
  if (!grid) return;

  const tasks    = loadTasks();
  const activeId = getActiveTaskId();

  // 기존 task 카드만 제거 (empty 메시지는 남김)
  Array.from(grid.querySelectorAll('.task-card')).forEach(el => el.remove());

  if (tasks.length === 0) {
    emptyEl.style.display = '';
    return;
  }

  emptyEl.style.display = 'none';

  tasks.forEach((task, i) => {
    const card = document.createElement('div');
    card.className = 'task-card';
    if (task.id === activeId)        card.classList.add('active');
    if (task.status === 'completed') card.classList.add('completed');

    // targetPomos 개수에 맞는 이미지 (task-1.png ~ task-4.png)
    const imgN   = Math.min(Math.max(task.targetPomos, 1), 4);
    const imgSrc = `assets/images/tasks/task-${imgN}.png`;

    card.innerHTML = `
      <button class="task-delete-btn" title="Delete task" aria-label="Delete task">✕</button>
      <img src="${imgSrc}" alt="${task.targetPomos} POMOs" class="task-tomato-img" />
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="task-progress">${task.completedPomos} / ${task.targetPomos} POMOs</div>
      ${task.status === 'completed' ? '<div class="task-status-badge">✓ Done</div>' : ''}
    `;

    // 삭제 버튼 클릭 — 이벤트 전파 차단
    card.querySelector('.task-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      pendingDeleteId = task.id;
      document.getElementById('deleteTaskName').textContent = `"${task.title}"`;
      openModal('deleteTask');
    });

    // 카드 단일 클릭 → active task 설정
    if (task.status !== 'completed') {
      card.addEventListener('click', () => {
        setActiveTask(task.id);
      });
    }

    grid.appendChild(card);
  });
}

/** HTML 이스케이프 (XSS 방지) */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Active Task 레이블 + POMO 카운트 갱신 */
function renderStudyActiveLabel() {
  const label   = document.getElementById('studyActiveTaskLabel');
  const countEl = document.getElementById('studyPomoCount');
  const task    = getActiveTask();

  if (label) label.textContent = task ? `▶ ${task.title}` : 'No task selected';
  if (countEl) {
    const c = task ? task.completedPomos : 0;
    const t = task ? task.targetPomos    : 1;
    countEl.textContent = `${c}/${t}`;
  }
}

/** Study 타이머 진행바 갱신 */
function updateStudyProgress() {
  const fillEl = document.getElementById('studyProgressFill');
  if (!fillEl) return;
  const elapsed = STUDY_DURATION - studyRemaining;
  fillEl.style.width = ((elapsed / STUDY_DURATION) * 100) + '%';
}

/* =====================================================
   ORDER FORM
   ===================================================== */

let selectedPomoCount = 1;

function selectPomoCount(count) {
  selectedPomoCount = count;
  document.querySelectorAll('.pomo-option').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.value) === count);
  });
}

function submitOrderForm() {
  const titleInput = document.getElementById('taskTitleInput');
  const title      = titleInput.value.trim();

  if (!title) {
    alert('Please fill in your task name!');
    titleInput.focus();
    return;
  }

  createTask(title, selectedPomoCount);
  closeModal();
  renderTasks();
  renderStudyActiveLabel();

  // 입력 초기화
  titleInput.value  = '';
  selectedPomoCount = 1;
  selectPomoCount(1);
}

/* =====================================================
   STUDY TIMER
   ===================================================== */

function initStudyTimer() {
  studyRemaining = STUDY_DURATION;
  studyIsRunning = false;
  renderStudyTime();
  const fillEl = document.getElementById('studyProgressFill');
  if (fillEl) fillEl.style.width = '0%';
  loadStudyTheme(studyThemeIndex);
}

function renderStudyTime() {
  const el = document.getElementById('studyTimerDisplay');
  if (el) el.textContent = formatTime(studyRemaining);
}

function startStudyTimer() {
  if (studyIsRunning) return;  // 중복 방지

  // active task 확인
  const task = getActiveTask();
  if (!task) {
    alert('Please create a task first.');
    return;
  }

  studyIsRunning = true;
  updateLpState('study', true);

  // music 재생 (user click 이후이므로 autoplay 정책 문제 없음)
  playStudyMusic();

  studyInterval = setInterval(() => {
    studyRemaining -= 1;
    renderStudyTime();
    updateStudyProgress();

    if (studyRemaining <= 0) {
      clearInterval(studyInterval);
      studyInterval  = null;
      studyIsRunning = false;
      finishStudyPomo();
    }
  }, 1000);
}

function pauseStudyTimer() {
  if (!studyIsRunning) return;
  clearInterval(studyInterval);
  studyInterval  = null;
  studyIsRunning = false;
  updateLpState('study', false);
  pauseStudyMusic();
}

function resetStudyTimer() {
  clearInterval(studyInterval);
  studyInterval  = null;
  studyIsRunning = false;
  studyRemaining = STUDY_DURATION;
  renderStudyTime();
  updateLpState('study', false);
  pauseStudyMusic();
  const fillEl = document.getElementById('studyProgressFill');
  if (fillEl) fillEl.style.width = '0%';
}

/** Play/Pause 토글 */
function toggleStudyTimer() {
  if (studyIsRunning) {
    pauseStudyTimer();
  } else {
    startStudyTimer();
  }
}

/** 25분 완료 처리 */
function finishStudyPomo() {
  pauseStudyMusic();
  updateLpState('study', false);

  // 기록 저장
  updateTaskProgress();
  addCompletedPomoToToday();

  // Study Complete modal
  const task = getActiveTask();
  const desc = task
    ? `Task: "${task.title}" — ${task.completedPomos} / ${task.targetPomos} POMOs done`
    : 'Great work!';
  document.getElementById('studyCompleteDesc').textContent = desc;
  openModal('studyComplete');
}

/** Study Complete modal → Continue 클릭 후 Skip Rest modal 표시 */
function afterPomoComplete() {
  closeModal();
  setTimeout(() => openModal('skipRest'), 200);
}

/* =====================================================
   STUDY THEME
   ===================================================== */

function changeStudyTheme(direction) {
  if (direction === 'prev') {
    studyThemeIndex = (studyThemeIndex - 1 + STUDY_THEMES.length) % STUDY_THEMES.length;
  } else {
    studyThemeIndex = (studyThemeIndex + 1) % STUDY_THEMES.length;
  }
  loadStudyTheme(studyThemeIndex);
}

function loadStudyTheme(index) {
  const theme = STUDY_THEMES[index];
  if (!theme) return;

  // 씬 박스 배경 이미지 교체
  const sceneBox = document.getElementById('studySceneBox');
  if (sceneBox && theme.scene) {
    const tmp = new Image();
    tmp.onload  = () => { sceneBox.style.backgroundImage = `url('${theme.scene}')`; };
    tmp.onerror = () => {};
    tmp.src = theme.scene;
  }

  // 음악 교체 (timer 초기화 없음)
  const wasPlaying = studyIsRunning;
  studyAudio.pause();
  studyAudio.src = theme.music;
  studyAudio.load();
  if (wasPlaying) studyAudio.play().catch(() => {});
}

/* =====================================================
   STUDY MUSIC
   ===================================================== */

function playStudyMusic() {
  const theme = STUDY_THEMES[studyThemeIndex];
  if (!studyAudio.src || !studyAudio.src.includes(theme.music.split('/').pop())) {
    studyAudio.src = theme.music;
    studyAudio.load();
  }
  studyAudio.play().catch(() => {
    // 브라우저 autoplay 정책 — user click 이후이므로 일반적으로 재생됨
    // 파일이 없는 경우에만 실패
  });
}

function pauseStudyMusic() {
  studyAudio.pause();
}

/* =====================================================
   LP 이미지 애니메이션 (CSS .playing 클래스로 spin 제어)
   ===================================================== */

function updateLpState(type, isPlaying) {
  const img = document.getElementById(type === 'study' ? 'studyLpImg' : 'restLpImg');
  if (img) img.classList.toggle('playing', isPlaying);

  const playBtnId = type === 'study' ? 'studyPlayBtn' : 'restPlayBtn';
  const playBtn   = document.getElementById(playBtnId);
  if (playBtn) playBtn.textContent = isPlaying ? '⏸' : '▶';
}

/* =====================================================
   REST TIMER
   ===================================================== */

function initRestTimer() {
  restRemaining = REST_DURATION;
  restIsRunning = false;
  renderRestTime();
  loadRestTheme(restThemeIndex);
}

function renderRestTime() {
  const el = document.getElementById('restTimerDisplay');
  if (el) el.textContent = formatTime(restRemaining);
}

function startRestTimer() {
  if (restIsRunning) return;

  restIsRunning = true;
  updateLpState('rest', true);
  playRestMusic();

  restInterval = setInterval(() => {
    restRemaining -= 1;
    renderRestTime();

    if (restRemaining <= 0) {
      clearInterval(restInterval);
      restInterval  = null;
      restIsRunning = false;
      finishRestTimer();
    }
  }, 1000);
}

function pauseRestTimer() {
  if (!restIsRunning) return;
  clearInterval(restInterval);
  restInterval  = null;
  restIsRunning = false;
  updateLpState('rest', false);
  pauseRestMusic();
}

function resetRestTimer() {
  clearInterval(restInterval);
  restInterval  = null;
  restIsRunning = false;
  restRemaining = REST_DURATION;
  renderRestTime();
  updateLpState('rest', false);
  pauseRestMusic();
}

function toggleRestTimer() {
  if (restIsRunning) {
    pauseRestTimer();
  } else {
    startRestTimer();
  }
}

/** 5분 휴식 완료 처리 */
function finishRestTimer() {
  pauseRestMusic();
  updateLpState('rest', false);
  openModal('breakComplete');
}

/* =====================================================
   REST THEME
   ===================================================== */

function changeRestTheme(direction) {
  if (direction === 'prev') {
    restThemeIndex = (restThemeIndex - 1 + REST_THEMES.length) % REST_THEMES.length;
  } else {
    restThemeIndex = (restThemeIndex + 1) % REST_THEMES.length;
  }
  loadRestTheme(restThemeIndex);
}

function loadRestTheme(index) {
  const theme = REST_THEMES[index];
  if (!theme) return;

  // 씬 박스 배경 이미지 교체
  const sceneBox = document.getElementById('restSceneBox');
  if (sceneBox && theme.scene) {
    const tmp = new Image();
    tmp.onload  = () => { sceneBox.style.backgroundImage = `url('${theme.scene}')`; };
    tmp.onerror = () => {};
    tmp.src = theme.scene;
  }

  // 음악 교체 (timer 초기화 없음)
  const wasPlaying = restIsRunning;
  restAudio.pause();
  restAudio.src = theme.music;
  restAudio.load();

  if (wasPlaying) {
    restAudio.play().catch(() => {});
  }
}

/* =====================================================
   REST MUSIC
   ===================================================== */

function playRestMusic() {
  const theme = REST_THEMES[restThemeIndex];
  if (!restAudio.src || !restAudio.src.includes(theme.music.split('/').pop())) {
    restAudio.src = theme.music;
    restAudio.load();
  }
  restAudio.play().catch(() => {});
}

function pauseRestMusic() {
  restAudio.pause();
}

/* =====================================================
   RECORDS
   ===================================================== */

function loadRecords() {
  return safeJsonParse('pomo_records', {});
}

function saveRecords(records) {
  safeJsonSave('pomo_records', records);
}

/** 오늘 날짜에 POMO 1개 + 25분 추가 */
function addCompletedPomoToToday() {
  const records = loadRecords();
  const today   = getLocalDateString();

  if (!records[today]) {
    records[today] = { completedPomos: 0, focusMinutes: 0 };
  }

  records[today].completedPomos += 1;
  records[today].focusMinutes   += 25;
  saveRecords(records);
}

/** 전체 누적 POMO 수 */
function getTotalPomos() {
  const records = loadRecords();
  return Object.values(records).reduce((sum, day) => sum + (day.completedPomos || 0), 0);
}

/** 레벨 정보 반환 */
function getLevelInfo(totalPomos) {
  for (const entry of LEVEL_TABLE) {
    if (totalPomos >= entry.min && totalPomos <= entry.max) {
      return { level: entry.level, message: entry.message };
    }
  }
  return LEVEL_TABLE[LEVEL_TABLE.length - 1];
}

/** Record Page 전체 렌더링 */
function renderRecordPage() {
  const total     = getTotalPomos();
  const levelInfo = getLevelInfo(total);
  const user      = getCurrentUser();

  // 레벨 카드
  const nameEl = document.getElementById('profileName');
  if (nameEl) nameEl.textContent = user || 'Guest';
  document.getElementById('profileLevel').textContent = levelInfo.level;
  document.getElementById('profileTotal').textContent = `You've eaten a total of ${total} POMOs so far.`;
  document.getElementById('speechBubble').textContent = levelInfo.message;

  // 달력
  renderCalendar(calendarYear, calendarMonth);

  // 선택된 날짜가 없으면 오늘 날짜
  if (!selectedDate) {
    selectedDate = getLocalDateString();
  }
  selectCalendarDate(selectedDate);
}

/* =====================================================
   CALENDAR
   ===================================================== */

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderCalendar(year, month) {
  const label = document.getElementById('calMonthLabel');
  const grid  = document.getElementById('recordCalendar');
  if (!label || !grid) return;

  label.textContent = MONTH_NAMES[month];
  grid.innerHTML    = '';

  const records  = loadRecords();
  const today    = getLocalDateString();

  // 1일의 요일 (0=일)
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();

  // 빈 칸 (1일 전 요일 수)
  for (let i = 0; i < firstDayOfWeek; i++) {
    const empty = document.createElement('button');
    empty.className = 'record-day empty';
    grid.appendChild(empty);
  }

  // 날짜 버튼 (plate-front.png 사용)
  for (let d = 1; d <= daysInMonth; d++) {
    const mm      = String(month + 1).padStart(2, '0');
    const dd      = String(d).padStart(2, '0');
    const dateStr = `${year}-${mm}-${dd}`;
    const dayData = records[dateStr];

    const btn = document.createElement('button');
    btn.className    = 'record-day';
    btn.dataset.date = dateStr;

    // 접시 이미지 + 날짜 숫자 오버레이
    const plateWrap = document.createElement('div');
    plateWrap.className = 'day-plate-wrap';

    const plateImg = document.createElement('img');
    plateImg.src = 'assets/images/characters/plate-front.png';
    plateImg.alt = '';
    plateImg.className = 'day-plate';
    plateImg.setAttribute('aria-hidden', 'true');

    const numSpan = document.createElement('span');
    numSpan.className   = 'day-num';
    numSpan.textContent = d;

    plateWrap.appendChild(plateImg);
    plateWrap.appendChild(numSpan);
    btn.appendChild(plateWrap);

    if (dayData && dayData.completedPomos > 0) {
      btn.classList.add('has-record');
      const dot = document.createElement('div');
      dot.className   = 'day-pomo-dot';
      dot.textContent = '🍅'.repeat(Math.min(dayData.completedPomos, 3));
      btn.appendChild(dot);
    }

    if (dateStr === today)        btn.classList.add('today');
    if (dateStr === selectedDate) btn.classList.add('selected-day');

    btn.addEventListener('click', () => selectCalendarDate(dateStr));
    grid.appendChild(btn);
  }
}

/** 날짜 선택 */
function selectCalendarDate(dateStr) {
  selectedDate = dateStr;

  // 선택 표시 갱신
  document.querySelectorAll('.record-day').forEach(btn => {
    btn.classList.toggle('selected-day', btn.dataset.date === dateStr);
  });

  // 기록 카드 갱신
  const records = loadRecords();
  const dayData = records[dateStr];
  const pomos   = dayData ? (dayData.completedPomos || 0) : 0;
  const mins    = dayData ? (dayData.focusMinutes   || 0) : 0;

  document.getElementById('dayPomoCount').textContent  = pomos;
  document.getElementById('dayFocusTime').textContent  = `Total Focus Time: ${mins} min`;
}

function changeCalendarMonth(delta) {
  calendarMonth += delta;
  if (calendarMonth > 11) { calendarMonth = 0;  calendarYear += 1; }
  if (calendarMonth < 0)  { calendarMonth = 11; calendarYear -= 1; }
  renderCalendar(calendarYear, calendarMonth);
}

/* =====================================================
   MESSAGES
   ===================================================== */

function getRandomStudyMessage() {
  return STUDY_MESSAGES[Math.floor(Math.random() * STUDY_MESSAGES.length)];
}

function getRandomRestMessage() {
  return REST_MESSAGES[Math.floor(Math.random() * REST_MESSAGES.length)];
}

/* =====================================================
   MODALS
   ===================================================== */

/**
 * type: 'orderForm' | 'deleteTask' | 'studyComplete' | 'skipRest' |
 *       'breakComplete' | 'login' | 'signup'
 */
function openModal(type) {
  currentModal = type;

  const overlay  = document.getElementById('modalOverlay');
  const modalBox = document.getElementById('modalBox');
  overlay.classList.add('open');

  // 모달 스타일 클래스 적용
  modalBox.classList.toggle('modal-order-bg',    type === 'orderForm');
  modalBox.classList.toggle('modal-study-style', ['deleteTask','studyComplete','skipRest'].includes(type));
  modalBox.classList.toggle('modal-break-style', type === 'breakComplete');

  // 모든 modal-content 숨김
  document.querySelectorAll('.modal-content').forEach(el => el.style.display = 'none');

  const map = {
    orderForm:     'modalOrderForm',
    deleteTask:    'modalDeleteTask',
    studyComplete: 'modalStudyComplete',
    skipRest:      'modalSkipRest',
    breakComplete: 'modalBreakComplete',
    login:         'modalLogin',
    signup:        'modalSignup',
  };

  const targetId = map[type];
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) el.style.display = 'flex';
  }

  // Order Form 초기화
  if (type === 'orderForm') {
    document.getElementById('taskTitleInput').value = '';
    selectedPomoCount = 1;
    selectPomoCount(1);
    setTimeout(() => document.getElementById('taskTitleInput').focus(), 100);
  }

  // Login/Signup 입력 초기화
  if (type === 'login') {
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    setTimeout(() => document.getElementById('loginUsername').focus(), 100);
  }
  if (type === 'signup') {
    document.getElementById('signupUsername').value = '';
    document.getElementById('signupPassword').value = '';
    setTimeout(() => document.getElementById('signupUsername').focus(), 100);
  }
}

function closeModal() {
  const overlay  = document.getElementById('modalOverlay');
  const modalBox = document.getElementById('modalBox');
  overlay.classList.remove('open');
  modalBox.classList.remove('modal-order-bg', 'modal-study-style', 'modal-break-style');
  currentModal    = null;
  pendingDeleteId = null;
}

/** overlay 클릭 시 modal 닫기 (modal-box 내부 클릭은 제외) */
function handleOverlayClick(event) {
  if (event.target === document.getElementById('modalOverlay')) {
    // skipRest, breakComplete, studyComplete는 overlay 클릭으로 닫지 않음
    const locked = ['skipRest', 'breakComplete', 'studyComplete'];
    if (!locked.includes(currentModal)) {
      closeModal();
    }
  }
}

/** Delete Task 확인 */
function confirmDeleteTask() {
  if (!pendingDeleteId) return;
  deleteTask(pendingDeleteId);
  closeModal();
}

/** Skip Rest 처리 */
function confirmSkipRest(skip) {
  closeModal();
  resetStudyTimer();

  if (skip) {
    // Rest 건너뜀 — Study 페이지 유지, 타이머 초기화
    document.getElementById('studyMessageBar').textContent = getRandomStudyMessage();
  } else {
    // Rest Timer 페이지로 이동
    resetRestTimer();
    navigateToRest();
    // Rest 타이머 자동 시작 (사용자가 No를 클릭 = 이미 user interaction)
    startRestTimer();
  }
}

/** Break Complete 처리 */
function confirmBreakComplete(autoStart) {
  closeModal();
  resetRestTimer();
  navigateToStudy();

  if (autoStart) {
    // Yes → 자동 시작 (이미 user interaction)
    const task = getActiveTask();
    if (task) {
      startStudyTimer();
    }
  }
  // No → Study 페이지로 이동만, 자동 시작 안 함
}

/* =====================================================
   KEYBOARD 이벤트
   ===================================================== */

document.addEventListener('keydown', (e) => {
  // ESC로 modal 닫기 (locked modal 제외)
  if (e.key === 'Escape') {
    const locked = ['skipRest', 'breakComplete', 'studyComplete'];
    if (currentModal && !locked.includes(currentModal)) {
      closeModal();
    }
  }

  // Enter로 Order Form 제출
  if (e.key === 'Enter' && currentModal === 'orderForm') {
    submitOrderForm();
  }
});

/* =====================================================
   INIT
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 페이지 초기화
  showPage('mainPage');

  // Study/Rest Timer 초기화
  initStudyTimer();
  initRestTimer();

  // Auth UI 갱신
  updateAuthUI();

  // 달력 초기 날짜 설정
  const now    = new Date();
  calendarYear = now.getFullYear();
  calendarMonth = now.getMonth();
  selectedDate  = getLocalDateString();

  console.log('[POMO] App initialized.');
});
