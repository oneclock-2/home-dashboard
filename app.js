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

// --- 🌟 목업 데이터 ---
function loadMockTestData() {
    const baseTime = new Date();
    const mockItems = [
        { daysAgo: 5, hour: 9, person: '윤우', type: 'temp', subDetail: '39', decimal: '2' },
        { daysAgo: 5, hour: 9, person: '윤우', type: 'fever', subDetail: '부르펜' },
        { daysAgo: 5, hour: 13, person: '윤우', type: 'temp', subDetail: '38', decimal: '5' },
        { daysAgo: 5, hour: 17, person: '윤우', type: 'general-med', subDetail: '항생제' },
        { daysAgo: 5, hour: 21, person: '윤우', type: 'fever', subDetail: '아세트' },

        { daysAgo: 4, hour: 8, person: '윤우', type: 'temp', subDetail: '37', decimal: '5' },
        { daysAgo: 4, hour: 10, person: '윤서', type: 'temp', subDetail: '39', decimal: '0' },
        { daysAgo: 4, hour: 10, person: '윤서', type: 'fever', subDetail: '부르펜' },
        { daysAgo: 4, hour: 15, person: '윤서', type: 'temp', subDetail: '38', decimal: '2' },
        { daysAgo: 4, hour: 20, person: '윤서', type: 'general-med', subDetail: '유산균/비타민' },

        { daysAgo: 3, hour: 9, person: '윤우', type: 'temp', subDetail: '정상', decimal: '0' },
        { daysAgo: 3, hour: 9, person: '윤서', type: 'temp', subDetail: '38', decimal: '1' },
        { daysAgo: 3, hour: 14, person: '윤서', type: 'fever', subDetail: '아세트' },
        { daysAgo: 3, hour: 19, person: '윤서', type: 'temp', subDetail: '37', decimal: '4' },

        { daysAgo: 2, hour: 10, person: '윤서', type: 'temp', subDetail: '정상', decimal: '0' },
        { daysAgo: 2, hour: 14, person: '윤우', type: 'general-med', subDetail: '처방약' },

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
}
loadMockTestData();

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('centerClock');
    if (clockEl) clockEl.innerText = `${hours}:${minutes}`;
    checkFutureReminders();
}
setInterval(updateClock, 1000);
updateClock();

let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}, 10 * 60 * 1000);

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

// --- 🌤️ 날씨 API 연동 ---
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

const brightnessOverlay = document.getElementById('brightnessOverlay');
let minBrightness = 0.6; 
let sleepTimer = null;

function wakeUpScreen() {
    brightnessOverlay.style.opacity = '0';
    const centerClockContainer = document.getElementById('centerClockContainer');
    if (centerClockContainer) centerClockContainer.style.opacity = '1';

    if (sleepTimer) clearTimeout(sleepTimer);
    sleepTimer = setTimeout(() => {
        brightnessOverlay.style.opacity = minBrightness;
        if (centerClockContainer) centerClockContainer.style.opacity = '0.35';
    }, 10000);
}
window.addEventListener('touchstart', wakeUpScreen);
window.addEventListener('mousemove', wakeUpScreen);
window.addEventListener('click', wakeUpScreen);
wakeUpScreen();

const settingsGearBtn = document.getElementById('settingsGearBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
let alertVolumeMultiplier = 1.0; 

settingsGearBtn.onclick = () => { settingsModal.classList.add('active'); };
settingsCloseBtn.onclick = () => { settingsModal.classList.remove('active'); };

window.changeAlertFontSize = function(sizeVal) {
    const styleElem = document.getElementById('dynamicAlertStyle') || document.createElement('style');
    styleElem.id = 'dynamicAlertStyle';
    styleElem.innerHTML = `.unconfirmed-msg { font-size: ${sizeVal} !important; }`;
    document.head.appendChild(styleElem);
    alert(`알림 글씨 크기가 변경되었습니다.`);
};

window.updateBrightnessLevel = function(val) { minBrightness = parseFloat(val); brightnessOverlay.style.opacity = minBrightness; };
window.updateAlertVolume = function(val) { alertVolumeMultiplier = parseFloat(val); document.getElementById('volumeLabel').innerText = `${Math.round(alertVolumeMultiplier * 100)}%`; };

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
const eventSource = new EventSource(`https://ntfy.sh/${NTFY_CHANNEL}/sse`);

eventSource.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        if (data.event === 'message' && data.message) {
            if (data.message.startsWith('[확인완료]')) return; 
            if (data.message.includes(`[token:${myClientToken}]`)) return;

            if (data.message.startsWith('로그') || data.message.includes('로그')) {
                const cleanMsg = data.message.replace(/\[token:[^\]]+\]/, '').replace(/^로그\s*/, '').trim();
                const now = new Date();
                let formattedMsg = cleanMsg.replace('아세트', '<span class="med-acet">아세트</span>').replace('부르펜', '<span class="med-ibu">부르펜</span>');
                let detectedType = cleanMsg.includes('해열제') ? 'fever-reducer' : (cleanMsg.includes('체온') ? 'temperature' : 'general-med');
                appendLogDataDirect(now, formattedMsg, detectedType, '외부폰');
                return;
            }
            if (data.message.includes('경적')) playAlertSound();
            triggerEmergencyAlert(data.message);
        }
    } catch (e) { console.error(e); }
};

function triggerEmergencyAlert(messageText) {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    unconfirmedList.push({ id: Date.now() + Math.random(), text: messageText, time: timeString });
    playAlertSound();
    renderUnconfirmedModal();
    modal.classList.add('active');
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
    unconfirmedContainer.innerHTML = '';
    if (unconfirmedList.length === 0) {
        modal.classList.remove('active');
        if (reminderTimeout) { clearTimeout(reminderTimeout); reminderTimeout = null; }
        reminderStep = 0;
        return;
    }
    unconfirmedList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'unconfirmed-card';
        card.innerHTML = `<div class="unconfirmed-time">⏰ 수신 시각: ${item.time}</div><div class="unconfirmed-msg">${item.text}</div><button class="modal-confirm-btn" onclick="confirmItem('${item.id}')">확인 완료</button>`;
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

function sendNtfyResponse(text, time) {
    fetch(`https://ntfy.sh/${NTFY_CHANNEL}`, { method: 'POST', body: `[확인완료] "${text}" (수신시각: ${time}) [token:${myClientToken}]` }).catch(err => { console.log(err); });
}

function addToChecklist(text, receiveTime, confirmTime) {
    checklistBar.style.display = 'block';
    const itemEl = document.createElement('div');
    itemEl.className = 'check-item';
    itemEl.innerHTML = `
        <div class="item-content"><span>${text}</span><span class="item-time">수신: ${receiveTime} | 확인: ${confirmTime}</span></div>
        <div class="item-buttons">
            <button class="postit-btn" onclick="createStickyNote('${text}', '${confirmTime}')">📌 포스트잇</button>
            <button class="delete-btn" onclick="this.closest('.check-item').remove(); if(checklistItems.children.length===0) checklistBar.style.display='none';">삭제</button>
        </div>
    `;
    checklistItems.prepend(itemEl);
}

function createStickyNote(text, time) {
    const note = document.createElement('div');
    note.className = 'sticky-note';
    note.innerHTML = `<div class="sticky-note-text">${text}</div><div class="sticky-note-footer"><span>${time} 부착됨</span><button class="sticky-note-delete" onclick="this.closest('.sticky-note').remove()">[휴지통]</button></div>`;
    stickyNotesContainer.prepend(note);
}

const logTriggerBtn = document.getElementById('logTriggerBtn');
const logPanel = document.getElementById('logPanel');
const logHideBtn = document.getElementById('logHideBtn');
const logTotalDeleteBtn = document.getElementById('logTotalDeleteBtn');
const logReportBtn = document.getElementById('logReportBtn');
const logFilterBtn = document.getElementById('logFilterBtn');
const logWizardArea = document.getElementById('logWizardArea');
const logListArea = document.getElementById('logListArea');

const logMiniBadgeBar = document.getElementById('logMiniBadgeBar');
const miniBadgeCount = document.getElementById('miniBadgeCount');
const miniSummaryTexts = document.getElementById('miniSummaryTexts');
const reportModal = document.getElementById('reportModal');
const reportCloseBtn = document.getElementById('reportCloseBtn');
const reportContainer = document.getElementById('reportContainer');

if (logTriggerBtn) logTriggerBtn.onclick = () => { if (logPanel) { viewingLogsData = null; logPanel.classList.add('active'); resetWizard(); } };
if (logHideBtn) logHideBtn.onclick = () => { if (logPanel) { viewingLogsData = null; logPanel.classList.remove('active'); updateMiniBadgeBar(); } };
if (logTotalDeleteBtn) logTotalDeleteBtn.onclick = () => {
    if (confirm("정말 모든 로그 기록을 삭제하시겠습니까?")) {
        globalLogsData = []; viewingLogsData = null; currentFilter = { person: '전체', category: '전체' };
        renderAllLogsUI(); if (logPanel) logPanel.classList.remove('active'); updateMiniBadgeBar();
    }
};

window.openLogPanelFromMini = function() { if (logPanel) { viewingLogsData = null; logPanel.classList.add('active'); resetWizard(); } };

if (logReportBtn) logReportBtn.onclick = () => {
    isChartViewActive = false;
    document.getElementById('reportContainer').style.display = 'flex';
    document.getElementById('reportChartContainer').style.display = 'none';
    document.getElementById('toggleReportChartBtn').innerText = '📈 차트보기';
    buildTimelineReport();
    updateSavedLogsDropdown();
    if (reportModal) reportModal.classList.add('active');
};

if (logFilterBtn) logFilterBtn.onclick = () => { renderFilterWizard(); };
if (reportCloseBtn) reportCloseBtn.onclick = () => { if (reportModal) reportModal.classList.remove('active'); };

function updateMiniBadgeBar() {
    if (!logMiniBadgeBar) return;
    let targetLogs = viewingLogsData || globalLogsData;
    if (targetLogs.length > 0) {
        logTriggerBtn.style.display = 'none';
        logMiniBadgeBar.style.display = 'flex';
        miniBadgeCount.innerText = targetLogs.length;
        let sortedDesc = [...targetLogs].sort((a, b) => b.timestamp - a.timestamp);
        let top4Texts = sortedDesc.slice(0, 4).map(l => {
            let desc = l.type === 'fever' ? `[${l.person}] ${l.subDetail}` : (l.type === 'temp' ? `[${l.person}] 체온` : (l.type === 'general-med' ? `[${l.person}] 약(${l.subDetail})` : l.text));
            return `${l.timeStr} ${desc}`;
        });
        miniSummaryTexts.innerText = top4Texts.join(' | ');
    } else {
        logTriggerBtn.style.display = 'block';
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
        <div class="wizard-step-header"><div class="wizard-step-title">📊 사람별/종류별 로그 필터</div><button class="wizard-back-btn" onclick="resetWizard()">⬅️ 입력으로 돌아가기</button></div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            <div style="color: #93C5FD; font-size: 14px; font-weight: 700;">1) 사람 선택:</div>
            <div class="wizard-pills-container">
                <button class="wizard-pill ${currentFilter.person === '전체' ? 'pill-med-acet' : ''}" onclick="applyFilterPerson('전체')">전체</button>
                <button class="wizard-pill pill-yoonwoo" onclick="applyFilterPerson('윤우')">👦 윤우</button>
                <button class="wizard-pill pill-yoonseo" onclick="applyFilterPerson('윤서')">👧 윤서</button>
                <button class="wizard-pill pill-parent" onclick="applyFilterPerson('아빠')">👨 아빠</button>
                <button class="wizard-pill pill-parent" onclick="applyFilterPerson('엄마')">👩 엄마</button>
            </div>
            <div style="color: #93C5FD; font-size: 14px; font-weight: 700; margin-top: 6px;">2) 항목 선택:</div>
            <div class="wizard-pills-container">
                <button class="wizard-pill ${currentFilter.category === '전체' ? 'pill-med-acet' : ''}" onclick="applyFilterCategory('전체')">전체</button>
                <button class="wizard-pill pill-med-ibu" onclick="applyFilterCategory('해열제')">💊 해열제</button>
                <button class="wizard-pill pill-med-acet" onclick="applyFilterCategory('약')">💊 일반약</button>
                <button class="wizard-pill pill-med-acet" onclick="applyFilterCategory('체온')">🌡️ 체온측정</button>
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
            <div class="wizard-step-title">투약/측정 날짜 및 시간 선택 (24시간제)</div>
            <button class="wizard-back-btn" onclick="${backFunc}">⬅️ 뒤로</button>
        </div>
        <div class="wizard-pills-container">
            <button class="wizard-pill" onclick="finalizeLog('${type}', 0)">현재 시간</button>
            <button class="wizard-pill" onclick="finalizeLog('${type}', 0.5)">30분 전</button>
            <button class="wizard-pill" onclick="finalizeLog('${type}', 1)">1시간 전</button>
            <button class="wizard-pill" onclick="finalizeLog('${type}', 2)">2시간 전</button>
            <button class="wizard-pill" style="background: #7F1D1D; color: #FCA5A5; border: 1px solid #EF4444;" onclick="finalizeLog('${type}', -0.5)">30분 후 (예약)</button>
            <button class="wizard-pill" style="background: #7F1D1D; color: #FCA5A5; border: 1px solid #EF4444;" onclick="finalizeLog('${type}', -1)">1시간 후 (예약)</button>
            <button class="wizard-pill" style="background: #7F1D1D; color: #FCA5A5; border: 1px solid #EF4444;" onclick="finalizeLog('${type}', -2)">2시간 후 (예약)</button>
        </div>
        <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 10px; background: rgba(255,255,255,0.08); padding: 14px; border-radius: 12px;">
            <div style="color: #93C5FD; font-size: 15px; font-weight: 700;">📅 날짜 및 24시간 직접 지정:</div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="date" id="customDateInput" value="${defaultDateStr}" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 8px 10px; border-radius: 8px; font-size: 15px; font-weight: bold; flex: 1;">
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <select id="customHour24Input" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: bold; flex: 1;">
                    ${generate24HourOptions(currentH)}
                </select>
                <span style="color: white; font-weight: bold; font-size: 18px;">시</span>
                <select id="customMinuteInput" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 8px 12px; border-radius: 8px; font-size: 16px; font-weight: bold; flex: 1;">
                    <option value="00" ${currentM === 0 ? 'selected' : ''}>00분</option>
                    <option value="10" ${currentM === 10 ? 'selected' : ''}>10분</option>
                    <option value="20" ${currentM === 20 ? 'selected' : ''}>20분</option>
                    <option value="30" ${currentM === 30 ? 'selected' : ''}>30분</option>
                    <option value="40" ${currentM === 40 ? 'selected' : ''}>40분</option>
                    <option value="50" ${currentM === 50 ? 'selected' : ''}>50분</option>
                </select>
                <button class="wizard-pill" style="padding: 10px 18px; font-size: 15px; background: #22C55E; color: white;" onclick="finalizeLogCustom('${type}')">적용</button>
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

    renderAllLogsUI();
    updateMiniBadgeBar();
    resetWizard();
    if (isFuture) alert(`[미래 예약 로그 등록 완료]\n지정한 시간이 되면 알림이 발송되도록 예약되었습니다.`);
}

window.triggerFutureReminder = function(id) {
    const log = globalLogsData.find(l => l.id == id);
    if (log && log.isFuturePending) {
        log.reminderScheduled = true;
        alert(`[알림 추가 완료]\n지정한 예약 시간에 맞춰 긴급 알림이 발송되도록 대기열에 등록되었습니다.`);
        renderAllLogsUI();
    }
};

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

window.finalizeFutureDone = function(id) {
    const log = globalLogsData.find(l => l.id == id);
    if (log) {
        log.isFuturePending = false;
        renderAllLogsUI();
        updateMiniBadgeBar();
        alert("예약 로그가 정상 확정(Done)되었습니다.");
    }
};

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
                let medFormatted = log.subDetail === '아세트' ? '<span class="med-acet">아세트</span>' : '<span class="med-ibu">부르펜</span>';
                bodyText = `해열제 투약 (${medFormatted})`;
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
    savedList.push({ id: 'save_' + Date.now(), title: titleStr, createdAt: new Date().toLocaleString(), logs: targetLogs });

    localStorage.setItem('familyHealthSavedLogs', JSON.stringify(savedList));
    alert(`[로그 저장 완료]\n"${titleStr}" 제목으로 안전하게 저장되었습니다.`);
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
};

window.loadSelectedSavedLogs = function() {
    const selectEl = document.getElementById('savedLogsSelect');
    if (!selectEl || !selectEl.value) { alert("불러올 저장 기록을 선택해 주세요."); return; }
    let savedList = JSON.parse(localStorage.getItem('familyHealthSavedLogs') || '[]');
    let found = savedList.find(i => i.id === selectEl.value);
    if (found) {
        viewingLogsData = found.logs.map(l => ({ ...l, timestamp: new Date(l.timestamp) }));
        
        isChartViewActive = true;
        document.getElementById('reportContainer').style.display = 'none';
        document.getElementById('reportChartContainer').style.display = 'flex';
        document.getElementById('toggleReportChartBtn').innerText = '📋 타임라인보기';
        
        renderChartForPerson(currentChartPerson);
        updateMiniBadgeBar();
        alert(`"${found.title}" 기록을 불러와 차트를 즉시 표시합니다! (현재 로그는 안전하게 보호됩니다)`);
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

let isChartViewActive = false;
let currentChartPerson = '윤우';
let healthChartInstance = null;

window.toggleReportView = function() {
    isChartViewActive = !isChartViewActive;
    const reportBody = document.getElementById('reportContainer');
    const reportChart = document.getElementById('reportChartContainer');
    const toggleBtn = document.getElementById('toggleReportChartBtn');

    if (isChartViewActive) {
        reportBody.style.display = 'none';
        reportChart.style.display = 'flex';
        toggleBtn.innerText = '📋 타임라인보기';
        renderChartForPerson(currentChartPerson);
    } else {
        reportBody.style.display = 'flex';
        reportChart.style.display = 'none';
        toggleBtn.innerText = '📈 차트보기';
        buildTimelineReport();
    }
};

// --- 📈 실제 시간 간격 X축 스케일, spanGaps: true, 요일 표기, 낮/밤 배경 플러그인 구현 ---
window.renderChartForPerson = function(personName) {
    currentChartPerson = personName;
    document.getElementById('chartTargetName').innerText = `(현재: ${personName})`;

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
            // 체온이 아닌 투약 등의 이벤트는 X축 타임라인에 맞추되 체온 수치는 null 처리
            scatterValues.push({ x: timeVal, y: null });
        }

        if (log.type === 'fever' || log.type === 'general-med') {
            medicationAnnotations.push({ time: timeVal, name: log.subDetail });
        }
    });

    const canvasCtx = document.getElementById('healthChartCanvas').getContext('2d');
    if (healthChartInstance) healthChartInstance.destroy();

    // 🌙 낮과 밤(오전 6시 ~ 오후 6시: 밝은 하늘색, 야간: 어두운 남색)을 배경에 그려주는 커스텀 플러그인
    const dayNightBackgroundPlugin = {
        id: 'dayNightBackgroundPlugin',
        beforeDraw(chart) {
            const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
            if (!x) return;

            ctx.save();
            let minX = x.min;
            let maxX = x.max;

            // 시간 단위로 하루를 쪼개어 낮/밤 구간 배경 색상 칠하기
            let curTime = new Date(minX).setHours(0,0,0,0);
            while (curTime <= maxX) {
                let dayStart = new Date(curTime).setHours(6,0,0,0);
                let nightStart = new Date(curTime).setHours(18,0,0,0);
                let nextDay = curTime + 24 * 3600 * 1000;

                // 1) 야간 구간 (0시 ~ 6시)
                let n1Start = curTime;
                let n1End = Math.min(dayStart, maxX);
                if (n1End > n1Start) {
                    let x1 = x.getPixelForValue(n1Start);
                    let x2 = x.getPixelForValue(n1End);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'; // 어두운 밤
                    ctx.fillRect(Math.max(left, x1), top, Math.min(right, x2) - Math.max(left, x1), bottom - top);
                }

                // 2) 주간 구간 (6시 ~ 18시)
                let dStart = Math.max(dayStart, minX);
                let dEnd = Math.min(nightStart, maxX);
                if (dEnd > dStart) {
                    let x1 = x.getPixelForValue(dStart);
                    let x2 = x.getPixelForValue(dEnd);
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)'; // 밝은 낮
                    ctx.fillRect(Math.max(left, x1), top, Math.min(right, x2) - Math.max(left, x1), bottom - top);
                }

                // 3) 야간 구간 (18시 ~ 24시)
                let n2Start = Math.max(nightStart, minX);
                let n2End = Math.min(nextDay, maxX);
                if (n2End > n2Start) {
                    let x1 = x.getPixelForValue(n2Start);
                    let x2 = x.getPixelForValue(n2End);
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'; // 어두운 밤
                    ctx.fillRect(Math.max(left, x1), top, Math.min(right, x2) - Math.max(left, x1), bottom - top);
                }

                curTime = nextDay;
            }
            ctx.restore();
        }
    };

    // 투약 이름 표기 플러그인
    const medicationPlugin = {
        id: 'medicationPlugin',
        afterDatasetsDraw(chart) {
            const { ctx, scales: { x, y } } = chart;
            ctx.save();
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';

            medicationAnnotations.forEach(ann => {
                let xCoor = x.getPixelForValue(ann.time);
                let yCoor = y.getPixelForValue(40.2); 

                if (xCoor >= x.left && xCoor <= x.right) {
                    ctx.fillStyle = ann.name === '부르펜' ? '#EF4444' : (ann.name === '아세트' ? '#3B82F6' : '#22C55E');
                    ctx.fillRect(xCoor - 28, yCoor - 18, 56, 22);

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(ann.name, xCoor, yCoor - 3);
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
                spanGaps: true // 요청하신 대로 결측 구간 자연스럽게 연결
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
                    type: 'linear', // 실제 시간 간격을 반영하기 위한 linear/time 기반 스케일
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
        plugins: [dayNightBackgroundPlugin, medicationPlugin]
    });
};

function buildTimelineReport() {
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
                    let medSpan = log.subDetail === '아세트' ? '<span class="med-acet">아세트</span>' : '<span class="med-ibu">부르펜</span>';
                    contentDesc = `<span class="report-keyword-fever">해열제 투약</span> (${medSpan})`;
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

        let card = document.getElementById('reportTimelineCard') || document.createElement('div');
        card.className = 'report-timeline-card';
        card.innerHTML = `
            <div class="report-person-title">👤 ${person} 상세 타임라인 리포트</div>
            <div class="report-columns-grid">${columnsHTML}</div>
        `;
        reportContainer.appendChild(card);
    }
}