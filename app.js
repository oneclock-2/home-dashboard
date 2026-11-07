const NTFY_CHANNEL = "phyjs1073080634"; 

let globalLogsData = [];
let viewingLogsData = null; 
let currentFilter = { person: '전체', category: '전체' };
const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

let logState = {
    category: null, 
    person: null,   
    subCategory: null, 
    decimal: null,  
    timeOffset: 0   
};

// --- 💾 로컬 저장소(localStorage) 자동 저장 및 불러오기 ---
function saveToLocalStorage() {
    try {
        localStorage.setItem('familyHealthActiveLogs', JSON.stringify(globalLogsData));
    } catch (e) {
        console.error("로컬 저장 실패:", e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('familyHealthActiveLogs');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                globalLogsData = parsed.map(item => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
                return true; 
            }
        }
    } catch (e) {
        console.error("로컬 데이터 로드 실패:", e);
    }
    return false; 
}

function loadMockTestData() {
    if (loadFromLocalStorage()) {
        return;
    }

    const baseTime = new Date();
    const mockItems = [
        { daysAgo: 0, hour: 8, person: '윤우', type: 'temp', subDetail: '정상', decimal: '0' },
        { daysAgo: 0, hour: 8, person: '윤서', type: 'temp', subDetail: '정상', decimal: '0' }
    ];

    mockItems.forEach(m => {
        let tDate = new Date(baseTime.getTime() - m.daysAgo * 24 * 3600000);
        tDate.setHours(m.hour, 0, 0, 0);

        let itemClass = m.type === 'fever' ? 'fever-reducer' : (m.type === 'temp' ? 'temperature' : 'general-med');
        let mMonth = String(tDate.getMonth() + 1).padStart(2, '0');
        let mDay = String(tDate.getDate()).padStart(2, '0');
        let dateFormattedStr = `${mMonth}/${mDay}(${daysOfWeek[tDate.getDay()]})`;
        let timeFormattedStr = `${String(m.hour).padStart(2, '0')}:00`;

        globalLogsData.push({
            id: Date.now() + Math.random(),
            timestamp: tDate,
            person: m.person,
            type: m.type,
            subDetail: m.subDetail,
            decimal: m.decimal || '0',
            dateStr: dateFormattedStr,
            timeStr: timeFormattedStr,
            className: itemClass,
            isFuturePending: false,
            rawPushText: `목업로그 ${m.person} | ${m.type}`
        });
    });
    
    saveToLocalStorage();
}
loadMockTestData();

// --- 📝 To Do & Shopping 리스트 관리 로직 ---
let dashboardTodoList = JSON.parse(localStorage.getItem('dashboardTodoList') || '[]');
let dashboardShopList = JSON.parse(localStorage.getItem('dashboardShopList') || '[]');

function saveDashboardLists() {
    localStorage.setItem('dashboardTodoList', JSON.stringify(dashboardTodoList));
    localStorage.setItem('dashboardShopList', JSON.stringify(dashboardShopList));
    renderDashboardLists();
}

function renderDashboardLists() {
    const todoContainer = document.getElementById('dashTodoList');
    const shopContainer = document.getElementById('dashShopList');
    if (!todoContainer || !shopContainer) return;

    todoContainer.innerHTML = '';
    dashboardTodoList.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = `dash-item-row ${item.completed ? 'completed' : ''}`;
        el.innerHTML = `
            <span onclick="toggleDashboardItem('todo', ${idx})" style="cursor:pointer; flex:1;">${item.text}</span>
            <div class="dash-item-actions">
                <button onclick="toggleDashboardItem('todo', ${idx})" style="color:#38BDF8;">${item.completed ? '취소' : '완료'}</button>
                <button onclick="deleteDashboardItem('todo', ${idx})" style="color:#EF4444;">삭제</button>
            </div>
        `;
        todoContainer.appendChild(el);
    });

    shopContainer.innerHTML = '';
    dashboardShopList.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = `dash-item-row ${item.completed ? 'completed' : ''}`;
        el.innerHTML = `
            <span onclick="toggleDashboardItem('shop', ${idx})" style="cursor:pointer; flex:1;">${item.text}</span>
            <div class="dash-item-actions">
                <button onclick="toggleDashboardItem('shop', ${idx})" style="color:#38BDF8;">${item.completed ? '취소' : '완료'}</button>
                <button onclick="deleteDashboardItem('shop', ${idx})" style="color:#EF4444;">삭제</button>
            </div>
        `;
        shopContainer.appendChild(el);
    });
}

window.addDashboardItem = function(type, customText = null) {
    let inputElem = document.getElementById(type === 'todo' ? 'dashTodoInput' : 'dashShopInput');
    let text = customText || (inputElem ? inputElem.value.trim() : '');
    if (!text) {
        if (!customText) alert("내용을 입력해 주세요.");
        return;
    }
    const newItem = { text: text, completed: false };
    if (type === 'todo') {
        dashboardTodoList.unshift(newItem);
        if (inputElem) inputElem.value = '';
    } else {
        dashboardShopList.unshift(newItem);
        if (inputElem) inputElem.value = '';
    }
    saveDashboardLists();
};

window.toggleDashboardItem = function(type, idx) {
    if (type === 'todo') {
        dashboardTodoList[idx].completed = !dashboardTodoList[idx].completed;
    } else {
        dashboardShopList[idx].completed = !dashboardShopList[idx].completed;
    }
    saveDashboardLists();
};

window.deleteDashboardItem = function(type, idx) {
    if (type === 'todo') {
        dashboardTodoList.splice(idx, 1);
    } else {
        dashboardShopList.splice(idx, 1);
    }
    saveDashboardLists();
};

document.addEventListener('DOMContentLoaded', () => {
    renderDashboardLists();
});

// --- ⏰ 시계 및 날짜, 예약 체크 ---
function updateClock() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const dayName = daysOfWeek[now.getDay()];
    const dateStr = `${month}월 ${date}일 (${dayName})`;
    
    const dateEl = document.getElementById('centerDate');
    if (dateEl) dateEl.innerText = dateStr;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('centerClock');
    if (clockEl) clockEl.innerText = `${hours}:${minutes}`;
    
    checkFutureReminders();
}
setInterval(updateClock, 1000);
updateClock();

// --- 🖼️ 배경 슬라이드쇼 ---
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
if (slides.length > 0) {
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 10 * 60 * 1000);
}

// --- 💡 화면 절전 방지(Wake Lock) ---
let wakeLock = null;
async function requestScreenWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) { console.log(err); }
}
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') await requestScreenWakeLock();
});
requestScreenWakeLock();

// --- 🌤️ 날씨 API 연동 (안양시) ---
async function fetchWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.3943&longitude=126.9568&hourly=temperature_2m,weathercode&timezone=Asia/Seoul');
        const data = res.ok ? await res.json() : null;
        
        if (!data || !data.hourly) return;

        const times = data.hourly.time;
        const temps = data.hourly.temperature_2m;
        const codes = data.hourly.weathercode;

        const now = new Date();
        const year = now.getFullYear();
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const dayStr = String(now.getDate()).padStart(2, '0');
        const todayDateStr = `${year}-${monthStr}-${dayStr}`;

        const todayRow = document.getElementById('weatherTodayRow');
        if (todayRow) {
            const targetHours = [9, 12, 15, 18, 21, 0];
            let todayHtml = '';
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tYear = tomorrow.getFullYear();
            const tMonthStr = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const tDayStr = String(tomorrow.getDate()).padStart(2, '0');
            const tomorrowDateStr = `${tYear}-${tMonthStr}-${tDayStr}`;

            targetHours.forEach(h => {
                let matchedIdx = -1;
                let searchDate = (h === 0) ? tomorrowDateStr : todayDateStr;
                let searchHourStr = `T${String(h).padStart(2, '0')}:00`;

                for (let i = 0; i < times.length; i++) {
                    if (times[i].startsWith(searchDate) && times[i].includes(searchHourStr)) {
                        matchedIdx = i;
                        break;
                    }
                }

                let timeLabel = h === 0 ? '0시' : `${h}시`;
                if (matchedIdx !== -1) {
                    let t = Math.round(temps[matchedIdx]);
                    let icon = getWeatherIcon(codes[matchedIdx]);
                    todayHtml += `<div class="weather-cell"><span class="weather-cell-time">${timeLabel}</span><span class="weather-cell-icon">${icon}</span><span class="weather-cell-temp">${t}°</span></div>`;
                } else {
                    todayHtml += `<div class="weather-cell"><span class="weather-cell-time">${timeLabel}</span><span class="weather-cell-icon">🌡️</span><span class="weather-cell-temp">-</span></div>`;
                }
            });
            todayRow.innerHTML = todayHtml;
        }

        const dailyRow = document.getElementById('weatherDailyRow');
        if (dailyRow) {
            let dailyHtml = '';
            for (let dayOffset = 1; dayOffset <= 6; dayOffset++) {
                let targetDay = new Date(now);
                targetDay.setDate(targetDay.getDate() + dayOffset);
                let dYear = targetDay.getFullYear();
                let dMonth = targetDay.getMonth() + 1;
                let dDay = targetDay.getDate();
                let dayOfWeekName = daysOfWeek[targetDay.getDay()];
                let dDateStr = `${dYear}-${String(dMonth).padStart(2, '0')}-${String(dDay).padStart(2, '0')}`;

                let dayTemps = [];
                let dayCodes = [];
                for (let i = 0; i < times.length; i++) {
                    if (times[i].startsWith(dDateStr)) {
                        dayTemps.push(temps[i]);
                        dayCodes.push(codes[i]);
                    }
                }

                let maxT = dayTemps.length > 0 ? Math.round(Math.max(...dayTemps)) : '-';
                let minT = dayTemps.length > 0 ? Math.round(Math.min(...dayTemps)) : '-';
                let repIcon = dayCodes.length > 0 ? getWeatherIcon(dayCodes[Math.floor(dayCodes.length / 2)]) : "⛅";

                dailyHtml += `<div class="weather-cell"><span class="weather-cell-time">${dMonth}/${dDay}(${dayOfWeekName})</span><span class="weather-cell-icon">${repIcon}</span><span class="weather-cell-temp">${maxT}°</span><span class="weather-cell-subtemp">${minT}°</span></div>`;
            }
            dailyRow.innerHTML = dailyHtml;
        }
    } catch (e) { console.error(e); }
}

function getWeatherIcon(code) {
    if (code === 0) return "☀️";
    if (code >= 1 && code <= 3) return "⛅";
    if (code >= 45 && code <= 48) return "🌫️";
    if (code >= 51 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "❄️";
    if (code >= 80 && code <= 82) return "🌦️";
    if (code >= 95) return "⚡";
    return "☁️";
}
fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);

// --- 🌙 절전 모드 밝기 제어 ---
const brightnessOverlay = document.getElementById('brightnessOverlay');
let minBrightness = 0.6; 
let sleepTimer = null;

function wakeUpScreen() {
    if (brightnessOverlay) brightnessOverlay.style.opacity = '0';
    const centerClockContainer = document.getElementById('centerClockContainer');
    if (centerClockContainer) centerClockContainer.style.opacity = '1';

    if (sleepTimer) clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => {
        if (brightnessOverlay) brightnessOverlay.style.opacity = minBrightness;
        if (centerClockContainer) centerClockContainer.style.opacity = '0.35';
    }, 20000);
}
window.addEventListener('touchstart', wakeUpScreen);
window.addEventListener('mousemove', wakeUpScreen);
window.addEventListener('click', wakeUpScreen);
wakeUpScreen();

// --- ⚙️ 환경설정 제어 ---
const settingsGearBtn = document.getElementById('settingsGearBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
let alertVolumeMultiplier = 1.0; 

if (settingsGearBtn) settingsGearBtn.onclick = () => { if (settingsModal) settingsModal.classList.add('active'); };
if (settingsCloseBtn) settingsCloseBtn.onclick = () => { if (settingsModal) settingsModal.classList.remove('active'); };

window.changeAlertFontSize = function(sizeVal) {
    const styleElem = document.getElementById('dynamicAlertStyle') || document.createElement('style');
    styleElem.id = 'dynamicAlertStyle';
    styleElem.innerHTML = `.unconfirmed-msg { font-size: ${sizeVal} !important; }`;
    document.head.appendChild(styleElem);
    alert(`알림 글씨 크기가 변경되었습니다.`);
};

window.updateBrightnessLevel = function(val) { minBrightness = parseFloat(val); if (brightnessOverlay) brightnessOverlay.style.opacity = minBrightness; if (typeof applyFrameBrightness === 'function') applyFrameBrightness(); };
window.updateAlertVolume = function(val) { alertVolumeMultiplier = parseFloat(val); const lbl = document.getElementById('volumeLabel'); if (lbl) lbl.innerText = `${Math.round(alertVolumeMultiplier * 100)}%`; };

function playAlertSound() {
    try {
        const audio = new Audio('alert.mp3');
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(audio);
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = alertVolumeMultiplier;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        audio.play().catch(e => { console.log(e); });
    } catch (e) {
        try {
            const fallbackAudio = new Audio('alert.mp3');
            fallbackAudio.volume = Math.min(1.0, alertVolumeMultiplier);
            fallbackAudio.play();
        } catch(err) {}
    }
}

// --- 🚨 [푸시 알림 진단 및 수신 로직] ---
let unconfirmedList = []; 
let reminderTimeout = null;
let reminderStep = 0;
const REMINDER_INTERVALS = [10 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000, 120 * 60 * 1000];

const modal = document.getElementById('messageModal');
const unconfirmedContainer = document.getElementById('unconfirmedContainer');
const checklistBar = document.getElementById('checklistBar');
const checklistItems = document.getElementById('checklistItems');
const stickyNotesContainer = document.getElementById('stickyNotesContainer');
const myClientToken = 'tablet-' + Math.random().toString(36).substring(2, 9);

let eventSource = null;
let processedMessageIds = new Set(); 

function handleIncomingMessage(msgData) {
    try {
        if (!msgData || !msgData.message) return;
        const msgText = msgData.message;
        const msgId = msgData.id || (msgText + (msgData.time || ''));

        if (processedMessageIds.has(msgId)) return;
        processedMessageIds.add(msgId);
        if (processedMessageIds.size > 200) {
            const firstKey = processedMessageIds.values().next().value;
            processedMessageIds.delete(firstKey);
        }

        if (msgText.startsWith('[확인완료]')) return; 
        if (msgText.includes(`[token:${myClientToken}]`)) return;

        if (msgText.startsWith('로그') || msgText.includes('로그')) {
            const cleanMsg = msgText.replace(/\[token:[^\]]+\]/, '').replace(/^로그\s*/, '').trim();
            const now = new Date();
            let formattedMsg = cleanMsg.replace('아세트', '<span class="med-acet">아세트</span>').replace('부르펜', '<span class="med-ibu">부르펜</span>');
            let detectedType = cleanMsg.includes('해열제') ? 'fever-reducer' : (cleanMsg.includes('체온') ? 'temperature' : 'general-med');
            appendLogDataDirect(now, formattedMsg, detectedType, '외부폰');
            return;
        }

        if (msgText.includes('경적')) playAlertSound();
        triggerEmergencyAlert(msgText);
    } catch (e) {
        console.error("메시지 처리 오류:", e);
    }
}


// --- 🚨 ntfy 실시간 푸시 수신 로직 ---


function initNtfyEventListener() {

    // 기존 연결 정리
    if (eventSource) {
        eventSource.close();
    }

    // SSE 실시간 연결
    eventSource = new EventSource(
        `https://ntfy.sh/${NTFY_CHANNEL}/sse`
    );

    eventSource.onopen = function() {
        console.log("✅ ntfy 실시간 연결 성공");
    };

    eventSource.onmessage = function(event) {
        try {
            if (!event || !event.data) return;

            const data = JSON.parse(event.data);

            if (data.event === 'message' && data.message) {
                handleIncomingMessage(data);
            }

        } catch (e) {
            console.error("ntfy 메시지 파싱 오류:", e);
        }
    };

    // EventSource 자체 재연결 기능 사용
    // close()하거나 별도 setTimeout 재연결하지 않음
    eventSource.onerror = function() {
        console.warn("⚠️ ntfy 연결 끊김. 자동 재연결 대기 중...");
    };
}

// 최초 연결
initNtfyEventListener();

// 기존 pollNtfyMessages() 함수와
// setInterval(pollNtfyMessages, 15000)는 삭제


function triggerEmergencyAlert(messageText) {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    unconfirmedList.push({ id: Date.now() + Math.random(), text: messageText, time: timeString });
    dismissPhotoFrame(); // 긴급 알림이 오면 액자부터 걷어냄
    playAlertSound();
    renderUnconfirmedModal();
    if (modal) modal.classList.add('active');
    requestScreenWakeLock();
    startProgressiveReminder();
}

function startProgressiveReminder() {
    if (reminderTimeout) clearTimeout(reminderTimeout);
    if (unconfirmedList.length === 0) { reminderStep = 0; return; }
    const currentDelay = REMINDER_INTERVALS[Math.min(reminderStep, REMINDER_INTERVALS.length - 1)];
    reminderTimeout = setTimeout(() => {
        if (unconfirmedList.length > 0) { playAlertSound(); requestScreenWakeLock(); reminderStep++; startProgressiveReminder(); }
    }, currentDelay);
}

function renderUnconfirmedModal() {
    if (!unconfirmedContainer) return;
    unconfirmedContainer.innerHTML = '';
    if (unconfirmedList.length === 0) {
        if (modal) modal.classList.remove('active');
        if (reminderTimeout) { clearTimeout(reminderTimeout); reminderTimeout = null; }
        reminderStep = 0;
        return;
    }
    unconfirmedList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'unconfirmed-card';
        card.innerHTML = `
            <div class="unconfirmed-time">⏰ 수신 시각: ${item.time}</div>
            <div class="unconfirmed-msg">${item.text}</div>
            <div class="modal-actions-row">
                <button class="modal-confirm-btn" onclick="confirmItem('${item.id}')">확인 완료</button>
                <button class="modal-todo-btn" onclick="sendAlertToDashboardList('todo', '${item.id}', '${item.text}')">📝 To Do 추가</button>
                <button class="modal-shop-btn" onclick="sendAlertToDashboardList('shop', '${item.id}', '${item.text}')">🛒 Shopping 추가</button>
            </div>
        `;
        unconfirmedContainer.appendChild(card);
    });
};

window.confirmItem = function(id) {
    const index = unconfirmedList.findIndex(item => item.id == id);
    if (index !== -1) {
        const confirmed = unconfirmedList.splice(index, 1)[0];
        const now = new Date();
        const confirmTimeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        addToChecklist(confirmed.text, confirmed.time, confirmTimeString);
        sendNtfyResponse(confirmed.text, confirmed.time);
        renderUnconfirmedModal();
    }
};

window.sendAlertToDashboardList = function(listType, id, text) {
    addDashboardItem(listType, text);
    alert(`"${text}" 내용이 대시보드 ${listType === 'todo' ? 'To Do List' : 'Shopping List'}에 추가되었습니다!`);
    confirmItem(id);
};

function sendNtfyResponse(text, time) {
    fetch(`https://ntfy.sh/${NTFY_CHANNEL}`, { method: 'POST', body: `[확인완료] "${text}" (수신시각: ${time}) [token:${myClientToken}]` }).catch(err => { console.log(err); });
}

// 🌟 확인한 알림 사항이 생기면 좌측상단 제일 위에 표시되도록 바를 노출하고 최상단에 렌더링
function addToChecklist(text, receiveTime, confirmTime) {
    if (checklistBar) checklistBar.style.display = 'block';
    if (!checklistItems) return;
    const itemEl = document.createElement('div');
    itemEl.className = 'check-item';
    itemEl.innerHTML = `
        <div class="item-content"><span>${text}</span><span class="item-time">수신: ${receiveTime} | 확인: ${confirmTime}</span></div>
        <div class="item-buttons">
            <button class="postit-btn" onclick="createStickyNote('${text}', '${confirmTime}')">📌 포스트잇</button>
            <button class="delete-btn" onclick="this.closest('.check-item').remove(); if(checklistItems.children.length===0 && checklistBar) checklistBar.style.display='none';">삭제</button>
        </div>
    `;
    checklistItems.prepend(itemEl); // 최상단에 추가
}

function createStickyNote(text, time) {
    if (!stickyNotesContainer) return;
    const note = document.createElement('div');
    note.className = 'sticky-note';
    note.innerHTML = `<div class="sticky-note-text">${text}</div><div class="sticky-note-footer"><span>${time} 부착됨</span><button class="sticky-note-delete" onclick="this.closest('.sticky-note').remove()">[휴지통]</button></div>`;
    stickyNotesContainer.prepend(note);
}

// --- 💊 윤우윤서 체온로그 패널 및 위자드 제어 ---
document.addEventListener('DOMContentLoaded', () => {
    const logTriggerBtn = document.getElementById('logTriggerBtn');
    const logPanelBackdrop = document.getElementById('logPanelBackdrop');
    const logHideBtn = document.getElementById('logHideBtn');
    const logTotalDeleteBtn = document.getElementById('logTotalDeleteBtn');
    const logReportBtn = document.getElementById('logReportBtn');
    const logFilterBtn = document.getElementById('logFilterBtn');
    const reportModal = document.getElementById('reportModal');
    const reportCloseBtn = document.getElementById('reportCloseBtn');

    if (logTriggerBtn) {
        logTriggerBtn.onclick = () => {
            if (logPanelBackdrop) {
                viewingLogsData = null;
                logPanelBackdrop.classList.add('active');
                resetWizard();
                updateMiniBadgeBar();
            }
        };
    }

    if (logPanelBackdrop) {
        logPanelBackdrop.onclick = (e) => {
            if (e.target === logPanelBackdrop) {
                logPanelBackdrop.classList.remove('active');
                updateMiniBadgeBar();
            }
        };
    }

    if (logHideBtn) {
        logHideBtn.onclick = () => {
            if (logPanelBackdrop) {
                viewingLogsData = null;
                logPanelBackdrop.classList.remove('active');
                updateMiniBadgeBar();
            }
        };
    }

    if (logTotalDeleteBtn) {
        logTotalDeleteBtn.onclick = () => {
            if (confirm("정말 모든 로그 기록을 삭제하시겠습니까?")) {
                globalLogsData = []; 
                viewingLogsData = null; 
                currentFilter = { person: '전체', category: '전체' };
                saveToLocalStorage(); 
                renderAllLogsUI();
                if (logPanelBackdrop) logPanelBackdrop.classList.remove('active');
                updateMiniBadgeBar();
            }
        };
    }

    window.openLogPanelFromMini = function() {
        if (logPanelBackdrop) {
            viewingLogsData = null;
            logPanelBackdrop.classList.add('active');
            resetWizard();
            updateMiniBadgeBar();
        }
    };

    if (logReportBtn) {
        logReportBtn.onclick = () => {
            isChartViewActive = true;
            const repCont = document.getElementById('reportContainer');
            const repChartCont = document.getElementById('reportChartContainer');
            const toggleRepBtn = document.getElementById('toggleReportChartBtn');
            if (repCont) repCont.style.display = 'none';
            if (repChartCont) repChartCont.style.display = 'flex';
            if (toggleRepBtn) toggleRepBtn.innerText = '📋 타임라인보기';
            renderChartForPerson(currentChartPerson);
            updateSavedLogsDropdown();
            if (reportModal) reportModal.classList.add('active');
            updateMiniBadgeBar();
        };
    }

    if (logFilterBtn) {
        logFilterBtn.onclick = () => { renderFilterWizard(); };
    }

    if (reportCloseBtn) {
        reportCloseBtn.onclick = () => {
            if (reportModal) reportModal.classList.remove('active');
            updateMiniBadgeBar();
        };
    }
});

const logMiniBadgeBar = document.getElementById('logMiniBadgeBar');
const miniBadgeCount = document.getElementById('miniBadgeCount');
const miniSummaryTexts = document.getElementById('miniSummaryTexts');
const logWizardArea = document.getElementById('logWizardArea');
const logListArea = document.getElementById('logListArea');

function updateMiniBadgeBar() {
    if (!logMiniBadgeBar) return;
    
    const reportModal = document.getElementById('reportModal');
    const logPanelBackdrop = document.getElementById('logPanelBackdrop');
    const isReportOpen = reportModal && reportModal.classList.contains('active');
    const isLogPanelOpen = logPanelBackdrop && logPanelBackdrop.classList.contains('active');

    if (isReportOpen || isLogPanelOpen) {
        logMiniBadgeBar.style.display = 'none';
        const logTriggerBtn = document.getElementById('logTriggerBtn');
        if (logTriggerBtn) logTriggerBtn.style.display = 'none';
        return;
    }

    let targetLogs = viewingLogsData || globalLogsData;
    const logTriggerBtn = document.getElementById('logTriggerBtn');
    
    if (targetLogs.length > 0) {
        if (logTriggerBtn) logTriggerBtn.style.display = 'none';
        logMiniBadgeBar.style.display = 'flex';
        if (miniBadgeCount) miniBadgeCount.innerText = targetLogs.length;
        let sortedDesc = [...targetLogs].sort((a, b) => b.timestamp - a.timestamp);
        let top4Texts = sortedDesc.slice(0, 4).map(l => {
            let desc = l.type === 'fever' ? `[${l.person}] ${l.subDetail}` : (l.type === 'temp' ? `[${l.person}] 체온` : (l.type === 'general-med' ? `[${l.person}] 약(${l.subDetail})` : l.text));
            return `${l.timeStr} ${desc}`;
        });
        if (miniSummaryTexts) miniSummaryTexts.innerText = top4Texts.join(' | ');
    } else {
        if (logTriggerBtn) logTriggerBtn.style.display = 'block';
        logMiniBadgeBar.style.display = 'none';
    }
}

function resetWizard() {
    currentFilter = { person: '전체', category: '전체' };
    renderAllLogsUI();
    logState = { category: null, person: null, subCategory: null, decimal: null, timeOffset: 0 };
    renderWizardStep1();
}

function renderFilterWizard() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #93C5FD; font-size: 13px; font-weight: 800;">🔍 로그 필터링</span>
                <button class="wizard-back-btn" style="padding: 2px 8px; font-size: 11px;" onclick="resetWizard()">입력으로 복귀</button>
            </div>
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                <div style="display: flex; gap: 4px; align-items: center;">
                    <span style="font-size: 12px; color: #94A3B8; font-weight: bold;">사람:</span>
                    <button class="wizard-pill ${currentFilter.person === '전체' ? 'pill-med-acet' : ''}" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterPerson('전체')">전체</button>
                    <button class="wizard-pill pill-yoonwoo" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterPerson('윤우')">윤우</button>
                    <button class="wizard-pill pill-yoonseo" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterPerson('윤서')">윤서</button>
                    <button class="wizard-pill pill-parent" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterPerson('아빠')">아빠</button>
                    <button class="wizard-pill pill-parent" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterPerson('엄마')">엄마</button>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <span style="font-size: 12px; color: #94A3B8; font-weight: bold;">항목:</span>
                    <button class="wizard-pill ${currentFilter.category === '전체' ? 'pill-med-acet' : ''}" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterCategory('전체')">전체</button>
                    <button class="wizard-pill pill-med-ibu" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterCategory('해열제')">해열제</button>
                    <button class="wizard-pill pill-med-acet" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterCategory('약')">일반약</button>
                    <button class="wizard-pill pill-med-acet" style="padding: 4px 8px; font-size: 12px;" onclick="applyFilterCategory('체온')">체온</button>
                </div>
            </div>
        </div>
    `;
}

window.applyFilterPerson = function(person) { currentFilter.person = person; renderAllLogsUI(); renderFilterWizard(); };
window.applyFilterCategory = function(cat) { currentFilter.category = cat; renderAllLogsUI(); renderFilterWizard(); };

function renderWizardStep1() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header"><div class="wizard-step-title">1단계: 기록할 항목 선택</div></div>
        <div class="wizard-pills-container">
            <button class="wizard-pill accent" onclick="selectCategory('해열제')">💊 해열제 투약</button>
            <button class="wizard-pill" style="background: #334155; color: #F1F5F9; border: 1px solid #64748B;" onclick="selectCategory('약')">💊 약 복용</button>
            <button class="wizard-pill" onclick="selectCategory('체온')">🌡️ 체온 측정</button>
        </div>
    `;
}

window.selectCategory = function(cat) {
    logState.category = cat;
    if (cat === '해열제') renderWizardStepFeverMed();
    else if (cat === '약') renderWizardStepGeneralMed();
    else renderWizardStepTempInt();
};

function renderWizardStepFeverMed() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header"><div class="wizard-step-title">[해열제] 대상 선택</div><button class="wizard-back-btn" onclick="renderWizardStep1()">⬅️ 뒤로</button></div>
        <div class="wizard-pills-container">
            <button class="wizard-pill pill-yoonwoo" onclick="setPersonAndProceed('윤우', 'fever')">👦 윤우</button>
            <button class="wizard-pill pill-yoonseo" onclick="setPersonAndProceed('윤서', 'fever')">👧 윤서</button>
            <button class="wizard-pill pill-parent" onclick="setPersonAndProceed('아빠', 'fever')">👨 아빠</button>
            <button class="wizard-pill pill-parent" onclick="setPersonAndProceed('엄마', 'fever')">👩 엄마</button>
        </div>
    `;
}

window.setPersonAndProceed = function(person, mode) {
    logState.person = person;
    if (mode === 'fever') renderWizardStepFeverMedChoice();
    else if (mode === 'gen') renderWizardStepGeneralMedChoice();
};

function renderWizardStepFeverMedChoice() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header"><div class="wizard-step-title">[${logState.person}] 해열제 종류 선택</div><button class="wizard-back-btn" onclick="renderWizardStepFeverMed()">⬅️ 뒤로</button></div>
        <div class="wizard-pills-container">
            <button class="wizard-pill pill-med-ibu" onclick="selectFeverMed('부르펜')">부르펜</button>
            <button class="wizard-pill pill-med-acet" onclick="selectFeverMed('아세트')">아세트</button>
        </div>
    `;
}

window.selectFeverMed = function(med) { logState.subCategory = med; renderWizardStepTime('fever'); };

function renderWizardStepGeneralMed() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header"><div class="wizard-step-title">[약 복용] 대상 선택</div><button class="wizard-back-btn" onclick="renderWizardStep1()">⬅️ 뒤로</button></div>
        <div class="wizard-pills-container">
            <button class="wizard-pill pill-yoonwoo" onclick="setPersonAndProceed('윤우', 'gen')">👦 윤우</button>
            <button class="wizard-pill pill-yoonseo" onclick="setPersonAndProceed('윤서', 'gen')">👧 윤서</button>
            <button class="wizard-pill pill-parent" onclick="setPersonAndProceed('아빠', 'gen')">👨 아빠</button>
            <button class="wizard-pill pill-parent" onclick="setPersonAndProceed('엄마', 'gen')">👩 엄마</button>
        </div>
    `;
}

function renderWizardStepGeneralMedChoice() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header"><div class="wizard-step-title">[${logState.person}] 약 종류 선택 또는 직접 입력</div><button class="wizard-back-btn" onclick="renderWizardStepGeneralMed()">⬅️ 뒤로</button></div>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 6px;">
            <div class="wizard-pills-container">
                <button class="wizard-pill" style="background:#334155; color:#F1F5F9; border: 1px solid #64748B;" onclick="selectGeneralMed('항생제')">항생제</button>
                <button class="wizard-pill" style="background:#334155; color:#F1F5F9; border: 1px solid #64748B;" onclick="selectGeneralMed('유산균/비타민')">유산균/비타민</button>
                <button class="wizard-pill" style="background:#334155; color:#F1F5F9; border: 1px solid #64748B;" onclick="selectGeneralMed('처방약')">처방약</button>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 6px;">
                <input type="text" id="customMedInput" placeholder="약 이름 직접 입력..." style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 10px 14px; border-radius: 8px; font-size: 15px; font-weight: bold; flex: 1;">
                <button class="wizard-pill" style="background: #22C55E; color: white; padding: 10px 20px;" onclick="submitCustomGeneralMed()">선택/입력</button>
            </div>
        </div>
    `;
}

window.selectGeneralMed = function(medName) { logState.subCategory = medName; renderWizardStepTime('general-med'); };
window.submitCustomGeneralMed = function() {
    const inputVal = document.getElementById('customMedInput').value.trim();
    if (!inputVal) { alert("약 이름을 입력해 주세요."); return; }
    logState.subCategory = inputVal;
    renderWizardStepTime('general-med');
};

function renderWizardStepTempInt() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header"><div class="wizard-step-title">[체온 측정] 대상 선택</div><button class="wizard-back-btn" onclick="renderWizardStep1()">⬅️ 뒤로</button></div>
        <div class="wizard-pills-container">
            <button class="wizard-pill pill-yoonwoo" onclick="setPersonAndTempTarget('윤우')">👦 윤우</button>
            <button class="wizard-pill pill-yoonseo" onclick="setPersonAndTempTarget('윤서')">👧 윤서</button>
            <button class="wizard-pill pill-parent" onclick="setPersonAndTempTarget('아빠')">👨 아빠</button>
            <button class="wizard-pill pill-parent" onclick="setPersonAndTempTarget('엄마')">👩 엄마</button>
        </div>
    `;
}

window.setPersonAndTempTarget = function(person) { logState.person = person; renderWizardStepTempIntChoice(); };

function renderWizardStepTempIntChoice() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header"><div class="wizard-step-title">[${logState.person}] 체온 정수 선택</div><button class="wizard-back-btn" onclick="renderWizardStepTempInt()">⬅️ 뒤로</button></div>
        <div class="wizard-pills-container">
            <button class="wizard-pill" onclick="selectTempInt('정상')">정상</button>
            <button class="wizard-pill" onclick="selectTempInt('37')">37°</button>
            <button class="wizard-pill" onclick="selectTempInt('38')">38°</button>
            <button class="wizard-pill" onclick="selectTempInt('39')">39°</button>
            <button class="wizard-pill" onclick="selectTempInt('40')">40°</button>
        </div>
    `;
}

window.selectTempInt = function(val) {
    logState.subCategory = val;
    if (val === '정상') { logState.decimal = '0'; renderWizardStepTime('temp'); }
    else { renderWizardStepTempDec(); }
};

function renderWizardStepTempDec() {
    if (!logWizardArea) return;
    let btnsHTML = '';
    for (let i = 0; i <= 9; i++) { btnsHTML += `<button class="wizard-pill" onclick="selectTempDec('${i}')">.${i}</button>`; }
    logWizardArea.innerHTML = `
        <div class="wizard-step-header"><div class="wizard-step-title">[${logState.person}] 체온 소수점 선택 (${logState.subCategory}.X)</div><button class="wizard-back-btn" onclick="renderWizardStepTempIntChoice()">⬅️ 뒤로</button></div>
        <div class="wizard-pills-container">${btnsHTML}</div>
    `;
}

window.selectTempDec = function(dec) { logState.decimal = dec; renderWizardStepTime('temp'); };

function renderWizardStepTime(type) {
    if (!logWizardArea) return;
    let backFunc = 'renderWizardStep1();';
    if (type === 'fever') backFunc = 'renderWizardStepFeverMedChoice();';
    else if (type === 'general-med') backFunc = 'renderWizardStepGeneralMedChoice();';
    else if (type === 'temp') backFunc = logState.subCategory === '정상' ? 'renderWizardStepTempIntChoice();' : 'renderWizardStepTempDec();';

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultDateStr = `${year}-${month}-${day}`;
    
    let currentH = now.getHours();
    const currentM = Math.floor(now.getMinutes() / 10) * 10;

    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">투약/측정 날짜 및 시간 선택</div>
            <button class="wizard-back-btn" onclick="${backFunc}">⬅️ 뒤로</button>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="wizard-pill" style="background: #3B82F6; color: white; font-size: 16px; padding: 12px; text-align: center; border-radius: 10px; width: 100%; border: none; font-weight: 900; box-shadow: 0 4px 12px rgba(59,130,246,0.4);" onclick="finalizeLog('${type}', 0)">⭐ 현재 시간으로 바로 기록</button>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="wizard-pill" style="padding: 6px 10px; font-size: 12px;" onclick="finalizeLog('${type}', 0.5)">30분 전</button>
                <button class="wizard-pill" style="padding: 6px 10px; font-size: 12px;" onclick="finalizeLog('${type}', 1)">1시간 전</button>
                <button class="wizard-pill" style="padding: 6px 10px; font-size: 12px;" onclick="finalizeLog('${type}', 2)">2시간 전</button>
                <button class="wizard-pill" style="background: #7F1D1D; color: #FCA5A5; border: 1px solid #EF4444; padding: 6px 10px; font-size: 12px;" onclick="finalizeLog('${type}', -0.5)">30분 후(예약)</button>
                <button class="wizard-pill" style="background: #7F1D1D; color: #FCA5A5; border: 1px solid #EF4444; padding: 6px 10px; font-size: 12px;" onclick="finalizeLog('${type}', -1)">1시간 후(예약)</button>
            </div>
        </div>

        <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px; background: rgba(255,255,255,0.06); padding: 10px; border-radius: 10px;">
            <div style="color: #93C5FD; font-size: 13px; font-weight: 700;">📅 직접 날짜/시간 지정:</div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <input type="date" id="customDateInput" value="${defaultDateStr}" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 6px 8px; border-radius: 6px; font-size: 13px; font-weight: bold; flex: 1;">
                <select id="customHour24Input" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 6px 8px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                    ${generate24HourOptions(currentH)}
                </select>
                <span style="color: white; font-size: 13px;">시</span>
                <select id="customMinuteInput" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 6px 8px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                    <option value="00" ${currentM === 0 ? 'selected' : ''}>00분</option>
                    <option value="10" ${currentM === 10 ? 'selected' : ''}>10분</option>
                    <option value="20" ${currentM === 20 ? 'selected' : ''}>20분</option>
                    <option value="30" ${currentM === 30 ? 'selected' : ''}>30분</option>
                    <option value="40" ${currentM === 40 ? 'selected' : ''}>40분</option>
                    <option value="50" ${currentM === 50 ? 'selected' : ''}>50분</option>
                </select>
                <button class="wizard-pill" style="padding: 6px 12px; font-size: 13px; background: #22C55E; color: white;" onclick="finalizeLogCustom('${type}')">적용</button>
            </div>
        </div>
    `;
}

function generate24HourOptions(selectedH) {
    let html = '';
    for (let i = 0; i < 24; i++) {
        let str = String(i).padStart(2, '0');
        html += `<option value="${i}" ${i === selectedH ? 'selected' : ''}>${str}시</option>`;
    }
    return html;
}

window.finalizeLog = function(type, offsetHours) {
    let targetDate = new Date(Date.now() - offsetHours * 3600000);
    let m = targetDate.getMinutes();
    let flooredM = Math.floor(m / 10) * 10;
    targetDate.setMinutes(flooredM, 0, 0);
    processAndSaveLog(type, targetDate);
};

window.finalizeLogCustom = function(type) {
    const dateInputVal = document.getElementById('customDateInput').value;
    const hourVal = parseInt(document.getElementById('customHour24Input').value, 10);
    const minuteVal = parseInt(document.getElementById('customMinuteInput').value, 10);

    if (!dateInputVal) { alert("날짜를 올바르게 선택해 주세요."); return; }

    const [year, month, day] = dateInputVal.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day, hourVal, minuteVal, 0, 0);
    processAndSaveLog(type, targetDate);
};

function processAndSaveLog(type, targetDate) {
    const now = new Date();
    const isFuture = targetDate > now;
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const dayName = daysOfWeek[targetDate.getDay()];
    const hours = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');
    
    const dateStr = `${m}/${d}(${dayName})`;
    const timeStr = `${hours}:${minutes}`;
    let itemClass = type === 'temp' ? 'temperature' : 'fever-reducer';
    let detailVal = logState.subCategory;

    let typeDescStr = '';
    if (type === 'fever') typeDescStr = `해열제 투약 (${detailVal})`;
    else if (type === 'temp') typeDescStr = `체온 측정 (${detailVal === '정상' ? '정상 체온' : detailVal + '.' + logState.decimal + '°C'})`;
    else if (type === 'general-med') typeDescStr = `약 복용 (${detailVal})`;

    let rawPushText = `로그 ${logState.person} | ${typeDescStr} [${dateStr} ${timeStr}] [token:${myClientToken}]`;
    if (!isFuture) sendNtfyLog(rawPushText);

    globalLogsData.push({
        id: Date.now() + Math.random(),
        timestamp: targetDate,
        person: logState.person,
        type: type, 
        subDetail: detailVal,
        decimal: logState.decimal,
        dateStr: dateStr,
        timeStr: timeStr,
        className: itemClass,
        isFuturePending: isFuture,
        rawPushText: rawPushText
    });

    saveToLocalStorage();
    renderAllLogsUI();
    updateMiniBadgeBar();
    resetWizard();
    if (isFuture) alert(`[미래 예약 로그 등록 완료]\n지정한 시간이 되면 알림이 발송되도록 예약되었습니다.`);
}

function checkFutureReminders() {
    const now = new Date();
    globalLogsData.forEach(log => {
        if (log.isFuturePending && log.reminderScheduled && !log.hasTriggered) {
            if (now >= log.timestamp) {
                log.hasTriggered = true;
                sendNtfyLog(log.rawPushText);
                triggerEmergencyAlert(`[예약알림] ${log.person} - ${log.subDetail || '일정'} 도래 (${log.dateStr} ${log.timeStr})`);
            }
        }
    });
}

function renderAllLogsUI() {
    if (!logListArea) return;
    logListArea.innerHTML = '';
    
    let targetLogs = viewingLogsData || globalLogsData;
    let chronologicalLogs = [...targetLogs].sort((a, b) => a.timestamp - b.timestamp);

    chronologicalLogs.forEach((log) => {
        let sameMedIntervalStr = '';
        let crossMedIntervalStr = '';

        if (log.type === 'fever' && !log.isFuturePending) {
            let prevSameMedLog = chronologicalLogs
                .filter(l => l.timestamp < log.timestamp && l.person === log.person && l.type === 'fever' && l.subDetail === log.subDetail && !l.isFuturePending)
                .pop();
            if (prevSameMedLog) {
                let diffMins = Math.round((log.timestamp - prevSameMedLog.timestamp) / 60000);
                let h = Math.floor(diffMins / 60); let m = diffMins % 60;
                sameMedIntervalStr = `⏳ ${log.subDetail} 간격: ${h > 0 ? h + '시간 ' : ''}${m}분`;
            }

            let otherMedName = log.subDetail === '부르펜' ? '아세트' : '부르펜';
            let prevCrossMedLog = chronologicalLogs
                .filter(l => l.timestamp < log.timestamp && l.person === log.person && l.type === 'fever' && l.subDetail === otherMedName && !l.isFuturePending)
                .pop();
            if (prevCrossMedLog) {
                let diffMins = Math.round((log.timestamp - prevCrossMedLog.timestamp) / 60000);
                let h = Math.floor(diffMins / 60); let m = diffMins % 60;
                crossMedIntervalStr = `⏳ (${otherMedName} 교차: ${h > 0 ? h + '시간 ' : ''}${m}분)`;
            }
        }
        log.sameMedIntervalStr = sameMedIntervalStr;
        log.crossMedIntervalStr = crossMedIntervalStr;
    });

    let filteredLogs = chronologicalLogs.filter(log => {
        if (currentFilter.person !== '전체' && log.person !== currentFilter.person) return false;
        if (currentFilter.category !== '전체') {
            if (currentFilter.category === '해열제' && log.type !== 'fever') return false;
            if (currentFilter.category === '약' && log.type !== 'general-med') return false;
            if (currentFilter.category === '체온' && log.type !== 'temp') return false;
        }
        return true;
    });

    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    let groupedByDate = {};
    filteredLogs.forEach(log => {
        if (!groupedByDate[log.dateStr]) groupedByDate[log.dateStr] = [];
        groupedByDate[log.dateStr].push(log);
    });

    for (let dateKey in groupedByDate) {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'log-date-group-header';
        dateHeader.innerHTML = `📅 ${dateKey}`;
        logListArea.appendChild(dateHeader);

        groupedByDate[dateKey].forEach(log => {
            const item = document.createElement('div');
            item.className = `log-item ${log.className}`;

            let personClass = 'parent'; let personIcon = '👤';
            if (log.person === '윤우') { personClass = 'yoonwoo'; personIcon = '👦'; }
            else if (log.person === '윤서') { personClass = 'yoonseo'; personIcon = '👧'; }
            else if (log.person === '아빠') personIcon = '👨';
            else if (log.person === '엄마') personIcon = '👩';

            let bodyText = '';
            if (log.type === 'fever') {
                let medSpanClass = log.subDetail === '아세트' ? 'med-acet' : 'med-ibu';
                bodyText = `해열제 투약 (<span class="${medSpanClass}">${log.subDetail}</span>)`;
            } else if (log.type === 'temp') {
                let tempVal = log.subDetail === '정상' ? '정상 체온' : `${log.subDetail}.${log.decimal}°C`;
                bodyText = `체온 측정 (${tempVal})`;
            } else if (log.type === 'general-med') {
                bodyText = `약 복용 (<span style="color: #93C5FD; font-weight:800;">${log.subDetail}</span>)`;
            } else {
                bodyText = log.text || '';
            }

            let intervalHTML = '';
            if (!log.isFuturePending && log.type !== 'temp' && (log.sameMedIntervalStr || log.crossMedIntervalStr)) {
                intervalHTML = `
                    <div class="interval-badge-group">
                        ${log.sameMedIntervalStr ? `<span class="interval-badge same-med">${log.sameMedIntervalStr}</span>` : ''}
                        ${log.crossMedIntervalStr ? `<span class="interval-badge cross-med">${log.crossMedIntervalStr}</span>` : ''}
                    </div>
                `;
            }

            item.innerHTML = `
                <div class="log-item-left">
                    <span class="log-time-badge">⏰ ${log.timeStr}</span>
                    <span class="person-badge ${personClass}">${personIcon} ${log.person}</span>
                </div>
                <div class="log-item-center">
                    <div>${bodyText}</div>
                    ${intervalHTML}
                </div>
                <button class="log-item-delete" onclick="deleteLogItem('${log.id}')">×</button>
            `;
            logListArea.appendChild(item);
        });
    }
}

window.deleteLogItem = function(id) {
    if (viewingLogsData) {
        viewingLogsData = viewingLogsData.filter(l => l.id != id);
    } else {
        globalLogsData = globalLogsData.filter(l => l.id != id);
        saveToLocalStorage(); 
    }
    renderAllLogsUI();
    updateMiniBadgeBar();
};

function sendNtfyLog(text) {
    fetch(`https://ntfy.sh/${NTFY_CHANNEL}`, { method: 'POST', body: text }).catch(err => { console.log(err); });
}

function appendLogDataDirect(dateObj, text, className, sourceLabel) {
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dayName = daysOfWeek[dateObj.getDay()];
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    globalLogsData.push({
        id: Date.now() + Math.random(),
        timestamp: dateObj,
        person: sourceLabel,
        type: 'sync',
        subDetail: '',
        text: text,
        dateStr: `${m}/${d}(${dayName})`,
        timeStr: `${hours}:${minutes}`,
        className: className,
        isFuturePending: false
    });
    saveToLocalStorage(); 
    renderAllLogsUI();
    updateMiniBadgeBar();
}

window.promptAndSaveCurrentLogs = function() {
    let targetLogs = viewingLogsData || globalLogsData;
    if (targetLogs.length === 0) { alert("저장할 로그가 없습니다."); return; }
    
    let eventTitle = prompt("저장할 이벤트 제목을 입력해 주세요 (예: 윤우 독감 고열 기록):", "윤우윤서 체온 기록");
    if (!eventTitle) return;

    let sorted = [...targetLogs].sort((a, b) => a.timestamp - b.timestamp);
    let sMonth = sorted[0].timestamp.getMonth() + 1;
    let sDay = sorted[0].timestamp.getDate();
    let eMonth = sorted[sorted.length - 1].timestamp.getMonth() + 1;
    let eDay = sorted[sorted.length - 1].timestamp.getDate();

    let titleStr = `[${eventTitle}] ${sMonth}/${sDay} ~ ${eMonth}/${eDay} (${targetLogs.length}건)`;
    let savedList = JSON.parse(localStorage.getItem('familyHealthSavedLogs') || '[]');
    let logPayload = { id: 'save_' + Date.now(), title: titleStr, createdAt: new Date().toLocaleString(), logs: targetLogs };
    savedList.push(logPayload);
    localStorage.setItem('familyHealthSavedLogs', JSON.stringify(savedList));

    try {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logPayload, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${eventTitle.replace(/\s+/g, '_')}_로그.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    } catch (e) { console.error(e); }

    alert(`[로그 저장 완료]\n"${titleStr}" 제목으로 저장되었으며, 태블릿 다운로드 폴더에도 백업 파일이 저장되었습니다.`);
    updateSavedLogsDropdown();
};

function updateSavedLogsDropdown() {
    const selectEl = document.getElementById('savedLogsSelect');
    if (!selectEl) return;
    selectEl.innerHTML = '';
    let savedList = JSON.parse(localStorage.getItem('familyHealthSavedLogs') || '[]');
    if (savedList.length === 0) {
        selectEl.innerHTML = `<option value="">-- 저장된 기록이 없습니다 --</option>`;
        return;
    }
    savedList.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item.id;
        opt.innerText = `${item.title} (저장시각: ${item.createdAt})`;
        selectEl.appendChild(opt);
    });
}

window.loadSelectedSavedLogs = function() {
    const selectEl = document.getElementById('savedLogsSelect');
    if (!selectEl || !selectEl.value) { alert("불러올 저장 기록을 선택해 주세요."); return; }
    let savedList = JSON.parse(localStorage.getItem('familyHealthSavedLogs') || '[]');
    let found = savedList.find(i => i.id === selectEl.value);
    if (found) {
        viewingLogsData = found.logs.map(l => ({ ...l, timestamp: new Date(l.timestamp) }));
        
        isChartViewActive = true;
        const repCont = document.getElementById('reportContainer');
        const repChartCont = document.getElementById('reportChartContainer');
        const toggleRepBtn = document.getElementById('toggleReportChartBtn');
        if (repCont) repCont.style.display = 'none';
        if (repChartCont) repChartCont.style.display = 'flex';
        if (toggleRepBtn) toggleRepBtn.innerText = '📋 타임라인보기';
        
        renderChartForPerson(currentChartPerson);
        updateMiniBadgeBar();
        alert(`"${found.title}" 기록을 불러와 차트를 즉시 표시합니다!`);
    }
};

window.deleteSelectedSavedLog = function() {
    const selectEl = document.getElementById('savedLogsSelect');
    if (!selectEl || !selectEl.value) { alert("삭제할 저장 기록을 선택해 주세요."); return; }
    if (confirm("정말 이 저장 기록을 삭제하시겠습니까?")) {
        let savedList = JSON.parse(localStorage.getItem('familyHealthSavedLogs') || '[]');
        savedList = savedList.filter(i => i.id !== selectEl.value);
        localStorage.setItem('familyHealthSavedLogs', JSON.stringify(savedList));
        updateSavedLogsDropdown();
        alert("삭제되었습니다.");
    }
};

let isChartViewActive = true; 
let currentChartPerson = '윤우';
let healthChartInstance = null;

window.toggleReportView = function() {
    isChartViewActive = !isChartViewActive;
    const reportBody = document.getElementById('reportContainer');
    const reportChart = document.getElementById('reportChartContainer');
    const toggleBtn = document.getElementById('toggleReportChartBtn');

    if (isChartViewActive) {
        if (reportBody) reportBody.style.display = 'none';
        if (reportChart) reportChart.style.display = 'flex';
        if (toggleBtn) toggleBtn.innerText = '📋 타임라인보기';
        renderChartForPerson(currentChartPerson);
    } else {
        if (reportBody) reportBody.style.display = 'flex';
        if (reportChart) reportChart.style.display = 'none';
        if (toggleBtn) toggleBtn.innerText = '📈 차트보기';
        buildTimelineReport();
    }
};

window.renderChartForPerson = function(personName) {
    currentChartPerson = personName;
    const targetNameEl = document.getElementById('chartTargetName');
    if (targetNameEl) targetNameEl.innerText = `(현재: ${personName})`;

    let activeLogs = viewingLogsData || globalLogsData;
    let pLogs = activeLogs.filter(l => l.person === personName && !l.isFuturePending);
    pLogs.sort((a, b) => a.timestamp - b.timestamp);

    let scatterValues = [];
    let medicationAnnotations = [];

    pLogs.forEach((log) => {
        let timeVal = log.timestamp.getTime();

        if (log.type === 'temp') {
            let tempVal = log.subDetail === '정상' ? 36.5 : parseFloat(`${log.subDetail}.${log.decimal}`);
            scatterValues.push({ x: timeVal, y: tempVal });
        } else {
            scatterValues.push({ x: timeVal, y: null });
        }

        if (log.type === 'fever' || log.type === 'general-med') {
            medicationAnnotations.push({ time: timeVal, name: log.subDetail });
        }
    });

    const canvasElem = document.getElementById('healthChartCanvas');
    if (!canvasElem) return;
    const canvasCtx = canvasElem.getContext('2d');
    if (healthChartInstance) healthChartInstance.destroy();

    const dayNightBackgroundPlugin = {
        id: 'dayNightBackgroundPlugin',
        beforeDraw(chart) {
            const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
            if (!x || !y) return;

            ctx.save();
            let minX = x.min;
            let maxX = x.max;

            let curTime = new Date(minX).setHours(0,0,0,0);
            while (curTime <= maxX) {
                let dayStart = new Date(curTime).setHours(6,0,0,0);
                let nightStart = new Date(curTime).setHours(18,0,0,0);
                let nextDay = curTime + 24 * 3600 * 1000;

                let n1Start = curTime;
                let n1End = Math.min(dayStart, maxX);
                if (n1End > n1Start) {
                    let x1 = x.getPixelForValue(n1Start);
                    let x2 = x.getPixelForValue(n1End);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
                    ctx.fillRect(Math.max(left, x1), top, Math.min(right, x2) - Math.max(left, x1), bottom - top);
                }

                let dStart = Math.max(dayStart, minX);
                let dEnd = Math.min(nightStart, maxX);
                if (dEnd > dStart) {
                    let x1 = x.getPixelForValue(dStart);
                    let x2 = x.getPixelForValue(dEnd);
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
                    ctx.fillRect(Math.max(left, x1), top, Math.min(right, x2) - Math.max(left, x1), bottom - top);
                }

                let n2Start = Math.max(nightStart, minX);
                let n2End = Math.min(nextDay, maxX);
                if (n2End > n2Start) {
                    let x1 = x.getPixelForValue(n2Start);
                    let x2 = x.getPixelForValue(n2End);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
                    ctx.fillRect(Math.max(left, x1), top, Math.min(right, x2) - Math.max(left, x1), bottom - top);
                }

                curTime = nextDay;
            }

            let y38Coord = y.getPixelForValue(38.0);
            if (y38Coord < bottom && y38Coord > top) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
                ctx.fillRect(left, top, right - left, Math.max(0, y38Coord - top));
            }

            ctx.restore();
        }
    };

    const thresholdLinePlugin = {
        id: 'thresholdLinePlugin',
        afterDraw(chart) {
            const { ctx, chartArea: { left, right, top, bottom }, scales: { y } } = chart;
            if (!y) return;

            let yCoord = y.getPixelForValue(38.0);
            if (yCoord >= top && yCoord <= bottom) {
                ctx.save();
                ctx.beginPath();
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#EF4444';
                ctx.setLineDash([6, 4]);
                ctx.moveTo(left, yCoord);
                ctx.lineTo(right, yCoord);
                ctx.stroke();

                ctx.fillStyle = '#EF4444';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText('⚠️ 위험 기준선 (38.0°C)', right - 10, yCoord - 6);
                ctx.restore();
            }
        }
    };

    const medicationPlugin = {
        id: 'medicationPlugin',
        afterDatasetsDraw(chart) {
            const { ctx, scales: { x, y } } = chart;
            ctx.save();
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';

            medicationAnnotations.forEach(ann => {
                let xCoor = x.getPixelForValue(ann.time);
                let yCoor = y.getPixelForValue(40.2); 

                if (xCoor >= x.left && xCoor <= x.right) {
                    ctx.fillStyle = ann.name === '부르펜' ? '#FFFFFF' : (ann.name === '아세트' ? '#DC2626' : '#22C55E');
                    ctx.fillRect(xCoor - 30, yCoor - 18, 60, 24);

                    ctx.fillStyle = ann.name === '부르펜' ? '#0F172A' : '#FFFFFF';
                    ctx.fillText(ann.name, xCoor, yCoor - 2);
                }
            });
            ctx.restore();
        }
    };

    healthChartInstance = new Chart(canvasCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: `${personName} 체온 (°C) 및 투약 기록`,
                data: scatterValues,
                borderColor: '#38BDF8',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                borderWidth: 3,
                pointRadius: 6,
                pointBackgroundColor: '#FACC15',
                tension: 0.2,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 35.5,
                    max: 40.5,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#94A3B8', font: { size: 14, weight: 'bold' } }
                },
                x: {
                    type: 'linear',
                    position: 'bottom',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94A3B8',
                        font: { size: 12 },
                        callback: function(value) {
                            let d = new Date(value);
                            let m = String(d.getMonth() + 1).padStart(2, '0');
                            let day = String(d.getDate()).padStart(2, '0');
                            let wName = daysOfWeek[d.getDay()];
                            let h = String(d.getHours()).padStart(2, '0');
                            let min = String(d.getMinutes()).padStart(2, '0');
                            return `${m}/${day}(${wName}) ${h}:${min}`;
                        }
                    }
                }
            },
            plugins: {
                legend: { labels: { color: 'white', font: { size: 16, weight: 'bold' } } },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            let d = new Date(context[0].parsed.x);
                            let wName = daysOfWeek[d.getDay()];
                            return `${d.getMonth() + 1}/${d.getDate()}(${wName}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                        },
                        label: function(context) {
                            let temp = context.parsed.y;
                            return `체온: ${temp !== null ? temp + '°C' : '기록 없음 (투약)'}`;
                        }
                    }
                }
            }
        },
        plugins: [dayNightBackgroundPlugin, thresholdLinePlugin, medicationPlugin]
    });
};

function buildTimelineReport() {
    const reportContainer = document.getElementById('reportContainer');
    if (!reportContainer) return;
    reportContainer.innerHTML = '';

    let activeLogs = viewingLogsData || globalLogsData;
    if (activeLogs.length === 0) {
        reportContainer.innerHTML = `<div style="color: #94A3B8; font-size: 24px; text-align: center; margin-top: 100px;">기록된 로그가 없습니다. 로그를 먼저 입력해 주세요.</div>`;
        return;
    }

    let personsMap = {};
    let chronologicalLogs = [...activeLogs].sort((a, b) => a.timestamp - b.timestamp);

    chronologicalLogs.forEach(log => {
        let pName = log.person || '기타';
        if (!personsMap[pName]) personsMap[pName] = [];
        personsMap[pName].push(log);
    });

    for (let person in personsMap) {
        let pLogs = personsMap[person];
        let dateMap = {};

        pLogs.forEach(log => {
            if (!dateMap[log.dateStr]) dateMap[log.dateStr] = [];
            dateMap[log.dateStr].push(log);
        });

        let columnsHTML = '';
        let sortedDateKeys = Object.keys(dateMap).sort((a, b) => new Date(a.substring(0, 5)) - new Date(b.substring(0, 5)));

        sortedDateKeys.forEach(dateKey => {
            let dayLogs = dateMap[dateKey];
            dayLogs.sort((a, b) => b.timestamp - a.timestamp);
            let rowsHTML = '';

            dayLogs.forEach(log => {
                let reportIntervalText = log.isFuturePending ? '⏰ 예약 대기중' : (log.type === 'temp' ? '' : (log.sameMedIntervalStr || log.crossMedIntervalStr || '✨ 첫 기록'));

                let contentDesc = '';
                if (log.type === 'fever') {
                    let medSpanClass = log.subDetail === '아세트' ? 'med-acet' : 'med-ibu';
                    contentDesc = `<span class="report-keyword-fever">해열제 투약</span> (<span class="${medSpanClass}">${log.subDetail}</span>)`;
                } else if (log.type === 'temp') {
                    let tempVal = log.subDetail === '정상' ? '정상 체온' : `${log.subDetail}.${log.decimal}°C`;
                    contentDesc = `<span class="report-keyword-temp">체온 측정</span> (${tempVal})`;
                } else if (log.type === 'general-med') {
                    contentDesc = `<span style="background:#334155; color:#F1F5F9; padding:3px 8px; border-radius:6px; font-weight:800; border:1px solid #64748B;">약 복용</span> (${log.subDetail})`;
                } else {
                    contentDesc = log.text.replace('아세트', '<span class="med-acet">아세트</span>').replace('부르펜', '<span class="med-ibu">부르펜</span>');
                }

                rowsHTML += `
                    <div class="timeline-row">
                        <span class="timeline-time">${log.timeStr}</span>
                        <span class="timeline-content">${contentDesc}</span>
                        <span class="timeline-interval">${reportIntervalText}</span>
                    </div>
                `;
            });

            columnsHTML += `
                <div class="report-date-column">
                    <div class="report-date-header">📅 ${dateKey}</div>
                    <div class="timeline-events-list">${rowsHTML}</div>
                </div>
            `;
        });

        let card = document.createElement('div');
        card.className = 'report-timeline-card';
        card.innerHTML = `
            <div class="report-person-title">👤 ${person} 상세 타임라인 리포트</div>
            <div class="report-columns-grid">${columnsHTML}</div>
        `;
        reportContainer.appendChild(card);
    }
}

// --- 🖼️ 액자 모드 (30초간 터치 없으면 전체화면 사진, 30분마다 photo3 ↔ photo4 교체) ---
const FRAME_IDLE_MS = 15 * 1000;
const FRAME_PHOTOS = ['photo3.jpg', 'photo4.jpg'];
const FRAME_SWAP_MS = 30 * 60 * 1000;
const photoFrame = document.getElementById('photoFrame');
const photoFrameDim = document.getElementById('photoFrameDim');
const photoFrameCredit = document.getElementById('photoFrameCredit');
let frameTimer = null;
const framePhotoLoaded = FRAME_PHOTOS.map(() => false);
let frameShownIndex = -1;

// 사진 미리 불러오기 (캐시에 올려두면 전환 시 깜빡임 없음)
FRAME_PHOTOS.forEach((src, i) => {
    const img = new Image();
    img.onload = () => { framePhotoLoaded[i] = true; updateFramePhoto(); };
    img.onerror = () => console.warn(`⚠️ 액자 사진(${src})을 불러오지 못했습니다. 파일명/경로를 확인하세요.`);
    img.src = src;
});

// 하단 크레딧 문구: 대시보드에 있는 문구를 그대로 복사 (index.html을 고치면 액자에도 자동 반영)
if (photoFrameCredit) {
    const dad = document.querySelector('.dad-credit-large');
    const ver = document.querySelector('.version-info');
    photoFrameCredit.innerHTML = (dad ? dad.outerHTML : '') + (ver ? ver.outerHTML : '');
}

// 환경설정의 '절전 모드 최소 밝기'를 액자에도 적용
function applyFrameBrightness() {
    if (photoFrameDim) photoFrameDim.style.opacity = minBrightness;
}

// 현재 시각 기준 30분 단위로 사진 선택 (정각~29분: photo3, 30~59분: photo4 ...)
function getFramePhotoIndex() {
    return Math.floor(Date.now() / FRAME_SWAP_MS) % FRAME_PHOTOS.length;
}

function updateFramePhoto() {
    if (!photoFrame) return;
    let idx = getFramePhotoIndex();
    if (!framePhotoLoaded[idx]) idx = framePhotoLoaded.findIndex(Boolean); // 한쪽이 없으면 있는 사진 사용
    if (idx < 0 || idx === frameShownIndex) return;
    photoFrame.style.backgroundImage = `url('${FRAME_PHOTOS[idx]}')`;
    frameShownIndex = idx;
}
setInterval(updateFramePhoto, 30 * 1000); // 30분 경계를 지나면 자동 교체

function showPhotoFrame() {
    const alertModal = document.getElementById('messageModal');
    const alertActive = (alertModal && alertModal.classList.contains('active')) ||
                        (typeof unconfirmedList !== 'undefined' && unconfirmedList.length > 0);
    // 사진이 아직 없거나, 확인 안 한 긴급 알림이 있으면 액자를 켜지 않고 타이머만 다시 시작
    if (!photoFrame || !framePhotoLoaded.some(Boolean) || alertActive) { resetFrameTimer(); return; }
    updateFramePhoto();
    applyFrameBrightness();
    photoFrame.classList.add('active');
}

function dismissPhotoFrame() {
    const frame = document.getElementById('photoFrame');
    if (frame) frame.classList.remove('active');
}

function resetFrameTimer() {
    clearTimeout(frameTimer);
    frameTimer = setTimeout(showPhotoFrame, FRAME_IDLE_MS);
}

function onFrameUserActivity() {
    dismissPhotoFrame();
    resetFrameTimer();
}

['touchstart', 'pointerdown', 'mousedown', 'mousemove', 'keydown', 'wheel'].forEach(evt =>
    window.addEventListener(evt, onFrameUserActivity, { passive: true })
);

// 액자를 닫는 터치가 아래 버튼까지 눌리지 않도록 클릭은 액자에서 차단
if (photoFrame) {
    photoFrame.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); }, true);
}

applyFrameBrightness();
resetFrameTimer();
