const NTFY_CHANNEL = "phyjs1073080634"; 

// --- 💡 전역 변수 선언 ---
let globalLogsData = [];
let currentFilter = { person: '전체', category: '전체' };
const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

let logState = {
    category: null, 
    person: null,   
    subCategory: null, 
    decimal: null,  
    timeOffset: 0   
};

// --- 🌟 5일치 윤우·윤서 아팠을 때 목업 테스트 데이터 자동 로드 ---
function loadMockTestData() {
    const baseTime = new Date();
    const mockItems = [
        // 5일 전 (윤우 고열 및 부르펜 투약)
        { daysAgo: 5, hour: 9, person: '윤우', type: 'temp', subDetail: '39', decimal: '2' },
        { daysAgo: 5, hour: 9, person: '윤우', type: 'fever', subDetail: '부르펜' },
        { daysAgo: 5, hour: 13, person: '윤우', type: 'temp', subDetail: '38', decimal: '5' },
        { daysAgo: 5, hour: 17, person: '윤우', type: 'general-med', subDetail: '항생제' },
        { daysAgo: 5, hour: 21, person: '윤우', type: 'fever', subDetail: '아세트' },

        // 4일 전 (윤우 호전세 및 윤서 미열 시작)
        { daysAgo: 4, hour: 8, person: '윤우', type: 'temp', subDetail: '37', decimal: '5' },
        { daysAgo: 4, hour: 10, person: '윤서', type: 'temp', subDetail: '39', decimal: '0' },
        { daysAgo: 4, hour: 10, person: '윤서', type: 'fever', subDetail: '부르펜' },
        { daysAgo: 4, hour: 15, person: '윤서', type: 'temp', subDetail: '38', decimal: '2' },
        { daysAgo: 4, hour: 20, person: '윤서', type: 'general-med', subDetail: '유산균/비타민' },

        // 3일 전
        { daysAgo: 3, hour: 9, person: '윤우', type: 'temp', subDetail: '정상', decimal: '0' },
        { daysAgo: 3, hour: 9, person: '윤서', type: 'temp', subDetail: '38', decimal: '1' },
        { daysAgo: 3, hour: 14, person: '윤서', type: 'fever', subDetail: '아세트' },
        { daysAgo: 3, hour: 19, person: '윤서', type: 'temp', subDetail: '37', decimal: '4' },

        // 2일 전
        { daysAgo: 2, hour: 10, person: '윤서', type: 'temp', subDetail: '정상', decimal: '0' },
        { daysAgo: 2, hour: 14, person: '윤우', type: 'general-med', subDetail: '처방약' },

        // 오늘 (현재 기준)
        { daysAgo: 0, hour: 8, person: '윤우', type: 'temp', subDetail: '정상', decimal: '0' },
        { daysAgo: 0, hour: 8, person: '윤서', type: 'temp', subDetail: '정상', decimal: '0' }
    ];

    mockItems.forEach(m => {
        let tDate = new Date(baseTime.getTime() - m.daysAgo * 24 * 3600000);
        tDate.setHours(m.hour, 0, 0, 0);

        let itemClass = m.type === 'fever' ? 'fever-reducer' : (m.type === 'temp' ? 'temperature' : 'general-med');
        let mMonth = String(tDate.getMonth() + 1).padStart(2, '0');
        let mDay = String(tDate.getDate()).padStart(2, '0');
        let dateFormattedStr = `${mMonth}/${mDay}(${daysOfWeek[tDate.getDay()]}) ${String(m.hour).padStart(2, '0')}:00`;

        globalLogsData.push({
            id: Date.now() + Math.random(),
            timestamp: tDate,
            person: m.person,
            type: m.type,
            subDetail: m.subDetail,
            decimal: m.decimal || '0',
            dateFormattedStr: dateFormattedStr,
            className: itemClass,
            isFuturePending: false,
            rawPushText: `목업로그 ${m.person} | ${m.type}`
        });
    });
}

loadMockTestData();


// --- 시계 작동 (정중앙 시계 갱신 및 예약 알림 체크) ---
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockEl = document.getElementById('centerClock');
    if (clockEl) {
        clockEl.innerText = `${hours}:${minutes}`;
    }

    checkFutureReminders();
}
setInterval(updateClock, 1000);
updateClock();


// --- 배경 사진 슬라이드 (10분 주기) ---
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}, 10 * 60 * 1000);


// --- 화면 밝기 및 켜짐 유지 (Wake Lock API) ---
let wakeLock = null;
async function requestScreenWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log('Wake Lock 요청 실패:', err);
    }
}
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestScreenWakeLock();
    }
});
requestScreenWakeLock();


// --- 날씨 정보 가져오기 ---
async function fetchWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.3943&longitude=126.9568&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia/Seoul');
        const data = await res.json();
        
        if (data && data.daily) {
            const days = data.daily;
            const todayMax = Math.round(days.temperature_2m_max[0]);
            const todayMin = Math.round(days.temperature_2m_min[0]);
            const todayDesc = getWeatherText(days.weathercode[0]);
            
            const tomoMax = Math.round(days.temperature_2m_max[1]);
            const tomoMin = Math.round(days.temperature_2m_min[1]);
            const tomoDesc = getWeatherText(days.weathercode[1]);

            document.getElementById('weatherToday').innerHTML = `
                <span class="w-label">오늘</span>
                <span class="w-info">${todayDesc} <br>${todayMin}° / ${todayMax}°</span>
            `;
            document.getElementById('weatherTomorrow').innerHTML = `
                <span class="w-label">내일</span>
                <span class="w-info">${tomoDesc} <br>${tomoMin}° / ${tomoMax}°</span>
            `;
        }
    } catch (e) {
        console.error("날씨 정보 로드 실패", e);
    }
}

function getWeatherText(code) {
    if (code === 0) return "☀️ 맑음";
    if (code >= 1 && code <= 3) return "⛅ 구름많음";
    if (code >= 45 && code <= 48) return "🌫️ 안개";
    if (code >= 51 && code <= 67) return "🌧️ 비";
    if (code >= 71 && code <= 77) return "❄️ 눈";
    if (code >= 80 && code <= 82) return "🌦️ 소나기";
    if (code >= 95) return "⚡ 뇌우";
    return "☁️ 흐림";
}

fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);


// --- 🌙 미사용 시 절전모드 ---
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


// --- 환경설정 및 볼륨 제어 ---
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

window.updateBrightnessLevel = function(val) {
    minBrightness = parseFloat(val);
    brightnessOverlay.style.opacity = minBrightness;
};

window.updateAlertVolume = function(val) {
    alertVolumeMultiplier = parseFloat(val);
    document.getElementById('volumeLabel').innerText = `${Math.round(alertVolumeMultiplier * 100)}%`;
};

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


// --- 알림 및 스케줄러 처리 로직 ---
let unconfirmedList = []; 
let reminderTimeout = null;
let reminderStep = 0;

const REMINDER_INTERVALS = [
    10 * 60 * 1000,  
    30 * 60 * 1000,  
    60 * 60 * 1000,  
    120 * 60 * 1000 
];

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
                
                let formattedMsg = cleanMsg
                    .replace('아세트', '<span class="med-acet">아세트</span>')
                    .replace('부르펜', '<span class="med-ibu">부르펜</span>');
                
                let detectedType = 'push-log';
                if (cleanMsg.includes('해열제')) detectedType = 'fever-reducer';
                else if (cleanMsg.includes('체온')) detectedType = 'temperature';
                else if (cleanMsg.includes('약(') || cleanMsg.includes('일반약')) detectedType = 'general-med';

                appendLogDataDirect(now, formattedMsg, detectedType, '외부폰');
                return;
            }

            if (data.message.includes('경적')) playAlertSound();
            triggerEmergencyAlert(data.message);
        }
    } catch (e) {
        console.error("데이터 파싱 오류", e);
    }
};

function triggerEmergencyAlert(messageText) {
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newItem = { id: Date.now() + Math.random(), text: messageText, time: timeString };
    unconfirmedList.push(newItem);
    playAlertSound();
    renderUnconfirmedModal();
    modal.classList.add('active');

    requestScreenWakeLock();
    startProgressiveReminder();
}

function startProgressiveReminder() {
    if (reminderTimeout) clearTimeout(reminderTimeout);
    if (unconfirmedList.length === 0) {
        reminderStep = 0;
        return;
    }
    const currentDelay = REMINDER_INTERVALS[Math.min(reminderStep, REMINDER_INTERVALS.length - 1)];
    reminderTimeout = setTimeout(() => {
        if (unconfirmedList.length > 0) {
            playAlertSound();
            requestScreenWakeLock();
            reminderStep++;
            startProgressiveReminder();
        }
    }, currentDelay);
}

function renderUnconfirmedModal() {
    unconfirmedContainer.innerHTML = '';
    if (unconfirmedList.length === 0) {
        modal.classList.remove('active');
        if (reminderTimeout) {
            clearTimeout(reminderTimeout);
            reminderTimeout = null;
        }
        reminderStep = 0;
        return;
    }
    unconfirmedList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'unconfirmed-card';
        card.innerHTML = `
            <div class="unconfirmed-time">⏰ 수신 시각: ${item.time}</div>
            <div class="unconfirmed-msg">${item.text}</div>
            <button class="modal-confirm-btn" onclick="confirmItem('${item.id}')">확인 완료</button>
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

function sendNtfyResponse(text, time) {
    fetch(`https://ntfy.sh/${NTFY_CHANNEL}`, {
        method: 'POST',
        body: `[확인완료] "${text}" (수신시각: ${time}) [token:${myClientToken}]`
    }).catch(err => { console.log(err); });
}

function addToChecklist(text, receiveTime, confirmTime) {
    checklistBar.style.display = 'block';
    const itemEl = document.createElement('div');
    itemEl.className = 'check-item';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    const textSpan = document.createElement('span');
    textSpan.innerHTML = text;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'item-time';
    timeSpan.innerText = `수신: ${receiveTime} | 확인: ${confirmTime}`;

    contentDiv.appendChild(textSpan);
    contentDiv.appendChild(timeSpan);

    const btnContainer = document.createElement('div');
    btnContainer.className = 'item-buttons';

    const postItBtn = document.createElement('button');
    postItBtn.className = 'postit-btn';
    postItBtn.innerText = '📌 포스트잇';
    postItBtn.onclick = () => { createStickyNote(text, confirmTime); };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerText = '삭제';
    deleteBtn.onclick = () => {
        itemEl.remove();
        if (checklistItems.children.length === 0) {
            checklistBar.style.display = 'none';
        }
    };

    btnContainer.appendChild(postItBtn);
    btnContainer.appendChild(deleteBtn);
    itemEl.appendChild(contentDiv);
    itemEl.appendChild(btnContainer);
    checklistItems.prepend(itemEl);
}

function createStickyNote(text, time) {
    const note = document.createElement('div');
    note.className = 'sticky-note';
    note.innerHTML = `
        <div class="sticky-note-text">${text}</div>
        <div class="sticky-note-footer">
            <span>${time} 부착됨</span>
            <button class="sticky-note-delete" onclick="this.closest('.sticky-note').remove()">[휴지통]</button>
        </div>
    `;
    stickyNotesContainer.prepend(note);
}


// --- 📝 건강·소통 로그 시스템 ---
const logTriggerBtn = document.getElementById('logTriggerBtn');
const logPanelBackdrop = document.getElementById('logPanelBackdrop');
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

if (logTriggerBtn) {
    logTriggerBtn.onclick = () => {
        if (logPanelBackdrop) {
            logPanelBackdrop.classList.add('active');
            resetWizard();
        }
    };
}

if (logPanelBackdrop) {
    logPanelBackdrop.onclick = () => {
        logPanelBackdrop.classList.remove('active');
        updateMiniBadgeBar();
    };
}

if (logHideBtn) {
    logHideBtn.onclick = () => {
        if (logPanelBackdrop) {
            logPanelBackdrop.classList.remove('active');
            updateMiniBadgeBar();
        }
    };
}

if (logTotalDeleteBtn) {
    logTotalDeleteBtn.onclick = () => {
        if (confirm("정말 모든 로그 기록을 삭제하시겠습니까?")) {
            globalLogsData = []; 
            currentFilter = { person: '전체', category: '전체' };
            renderAllLogsUI();
            if (logPanelBackdrop) logPanelBackdrop.classList.remove('active');
            updateMiniBadgeBar();
        }
    };
}

window.openLogPanelFromMini = function() {
    if (logPanelBackdrop) {
        logPanelBackdrop.classList.add('active');
        resetWizard();
    }
};

if (logReportBtn) {
    logReportBtn.onclick = () => {
        isChartViewActive = false;
        document.getElementById('reportContainer').style.display = 'flex';
        document.getElementById('reportChartContainer').style.display = 'none';
        document.getElementById('toggleReportChartBtn').innerText = '📈 차트보기';
        
        buildTimelineReport();
        updateSavedLogsDropdown();
        if (reportModal) reportModal.classList.add('active');
    };
}

if (logFilterBtn) {
    logFilterBtn.onclick = () => { renderFilterWizard(); };
}

if (reportCloseBtn) {
    reportCloseBtn.onclick = () => { if (reportModal) reportModal.classList.remove('active'); };
}

function updateMiniBadgeBar() {
    if (!logMiniBadgeBar) return;
    if (globalLogsData.length > 0) {
        logTriggerBtn.style.display = 'none';
        logMiniBadgeBar.style.display = 'flex';
        miniBadgeCount.innerText = globalLogsData.length;

        let sortedDesc = [...globalLogsData].sort((a, b) => b.timestamp - a.timestamp);
        let top4Texts = sortedDesc.slice(0, 4).map(l => {
            let desc = l.type === 'fever' ? `[${l.person}] ${l.subDetail}` : (l.type === 'temp' ? `[${l.person}] 체온` : (l.type === 'general-med' ? `[${l.person}] 약(${l.subDetail})` : l.text));
            return `${l.dateFormattedStr.slice(6)} ${desc}`;
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
        <div class="wizard-step-header">
            <div class="wizard-step-title">📊 사람별/종류별 로그 필터</div>
            <button class="wizard-back-btn" onclick="resetWizard()">⬅️ 입력으로 돌아가기</button>
        </div>
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

window.applyFilterPerson = function(person) {
    currentFilter.person = person;
    renderAllLogsUI();
    renderFilterWizard();
};

window.applyFilterCategory = function(cat) {
    currentFilter.category = cat;
    renderAllLogsUI();
    renderFilterWizard();
};

function renderWizardStep1() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">1단계: 기록할 항목 선택</div>
        </div>
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
        <div class="wizard-step-header">
            <div class="wizard-step-title">[해열제] 대상 선택</div>
            <button class="wizard-back-btn" onclick="renderWizardStep1()">⬅️ 뒤로</button>
        </div>
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
        <div class="wizard-step-header">
            <div class="wizard-step-title">[${logState.person}] 해열제 종류 선택</div>
            <button class="wizard-back-btn" onclick="renderWizardStepFeverMed()">⬅️ 뒤로</button>
        </div>
        <div class="wizard-pills-container">
            <button class="wizard-pill pill-med-ibu" onclick="selectFeverMed('부르펜')">부르펜</button>
            <button class="wizard-pill pill-med-acet" onclick="selectFeverMed('아세트')">아세트</button>
        </div>
    `;
}

window.selectFeverMed = function(med) {
    logState.subCategory = med;
    renderWizardStepTime('fever');
};

function renderWizardStepGeneralMed() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">[약 복용] 대상 선택</div>
            <button class="wizard-back-btn" onclick="renderWizardStep1()">⬅️ 뒤로</button>
        </div>
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
        <div class="wizard-step-header">
            <div class="wizard-step-title">[${logState.person}] 약 종류 선택 또는 직접 입력</div>
            <button class="wizard-back-btn" onclick="renderWizardStepGeneralMed()">⬅️ 뒤로</button>
        </div>
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

window.selectGeneralMed = function(medName) {
    logState.subCategory = medName;
    renderWizardStepTime('general-med');
};

window.submitCustomGeneralMed = function() {
    const inputVal = document.getElementById('customMedInput').value.trim();
    if (!inputVal) { alert("약 이름을 입력해 주세요."); return; }
    logState.subCategory = inputVal;
    renderWizardStepTime('general-med');
};


function renderWizardStepTempInt() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">[체온 측정] 대상 선택</div>
            <button class="wizard-back-btn" onclick="renderWizardStep1()">⬅️ 뒤로</button>
        </div>
        <div class="wizard-pills-container">
            <button class="wizard-pill pill-yoonwoo" onclick="setPersonAndTempTarget('윤우')">👦 윤우</button>
            <button class="wizard-pill pill-yoonseo" onclick="setPersonAndTempTarget('윤서')">👧 윤서</button>
            <button class="wizard-pill pill-parent" onclick="setPersonAndTempTarget('아빠')">👨 아빠</button>
            <button class="wizard-pill pill-parent" onclick="setPersonAndTempTarget('엄마')">👩 엄마</button>
        </div>
    `;
}

window.setPersonAndTempTarget = function(person) {
    logState.person = person;
    renderWizardStepTempIntChoice();
};

function renderWizardStepTempIntChoice() {
    if (!logWizardArea) return;
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">[${logState.person}] 체온 정수 선택</div>
            <button class="wizard-back-btn" onclick="renderWizardStepTempInt()">⬅️ 뒤로</button>
        </div>
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
    if (val === '정상') {
        logState.decimal = '0';
        renderWizardStepTime('temp');
    } else {
        renderWizardStepTempDec();
    }
};

function renderWizardStepTempDec() {
    if (!logWizardArea) return;
    let btnsHTML = '';
    for (let i = 0; i <= 9; i++) {
        btnsHTML += `<button class="wizard-pill" onclick="selectTempDec('${i}')">.${i}</button>`;
    }
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">[${logState.person}] 체온 소수점 선택 (${logState.subCategory}.X)</div>
            <button class="wizard-back-btn" onclick="renderWizardStepTempIntChoice()">⬅️ 뒤로</button>
        </div>
        <div class="wizard-pills-container">${btnsHTML}</div>
    `;
}

window.selectTempDec = function(dec) {
    logState.decimal = dec;
    renderWizardStepTime('temp');
};

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
    let isPM = currentH >= 12;
    let displayH = currentH % 12;
    if (displayH === 0) displayH = 12;
    const currentM = Math.floor(now.getMinutes() / 10) * 10;

    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">투약/측정 날짜 및 시간 선택</div>
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
            <div style="color: #93C5FD; font-size: 15px; font-weight: 700;">📅 날짜 및 시간 직접 지정:</div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="date" id="customDateInput" value="${defaultDateStr}" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 8px 10px; border-radius: 8px; font-size: 15px; font-weight: bold; flex: 1;">
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <div style="display: flex; gap: 4px; background: #0F172A; padding: 4px; border-radius: 10px; border: 1px solid #475569;">
                    <button type="button" id="ampmAmBtn" onclick="setAmPm('AM')" style="padding: 8px 16px; font-size: 16px; font-weight: 800; border-radius: 8px; border: none; cursor: pointer; ${!isPM ? 'background: #3B82F6; color: white;' : 'background: transparent; color: #94A3B8;'}">오전</button>
                    <button type="button" id="ampmPmBtn" onclick="setAmPm('PM')" style="padding: 8px 16px; font-size: 16px; font-weight: 800; border-radius: 8px; border: none; cursor: pointer; ${isPM ? 'background: #EF4444; color: white;' : 'background: transparent; color: #94A3B8;'}">오후</button>
                </div>
                <select id="customHourInput" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 8px 10px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                    ${generate12HourOptions(displayH)}
                </select>
                <span style="color: white; font-weight: bold; font-size: 18px;">:</span>
                <select id="customMinuteInput" style="background: #1E293B; color: white; border: 1px solid #64748B; padding: 8px 10px; border-radius: 8px; font-size: 16px; font-weight: bold;">
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

let selectedAmPmState = new Date().getHours() >= 12 ? 'PM' : 'AM';
window.setAmPm = function(val) {
    selectedAmPmState = val;
    const amBtn = document.getElementById('ampmAmBtn');
    const pmBtn = document.getElementById('ampmPmBtn');
    if (val === 'AM') {
        amBtn.style.background = '#3B82F6'; amBtn.style.color = 'white';
        pmBtn.style.background = 'transparent'; pmBtn.style.color = '#94A3B8';
    } else {
        pmBtn.style.background = '#EF4444'; pmBtn.style.color = 'white';
        amBtn.style.background = 'transparent'; amBtn.style.color = '#94A3B8';
    }
};

function generate12HourOptions(selectedH) {
    let html = '';
    for (let i = 1; i <= 12; i++) {
        html += `<option value="${i}" ${i === selectedH ? 'selected' : ''}>${i}시</option>`;
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
    let hourVal = parseInt(document.getElementById('customHourInput').value, 10);
    const minuteVal = parseInt(document.getElementById('customMinuteInput').value, 10);

    if (!dateInputVal) { alert("날짜를 올바르게 선택해 주세요."); return; }
    if (selectedAmPmState === 'PM' && hourVal < 12) hourVal += 12;
    if (selectedAmPmState === 'AM' && hourVal === 12) hourVal = 0;

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
    
    const dateFormattedStr = `${m}/${d}(${dayName}) ${hours}:${minutes}`;
    let itemClass = type === 'temp' ? 'temperature' : 'fever-reducer';
    let detailVal = logState.subCategory;

    let typeDescStr = '';
    if (type === 'fever') typeDescStr = `해열제 투약 (${detailVal})`;
    else if (type === 'temp') typeDescStr = `체온 측정 (${detailVal === '정상' ? '정상 체온' : detailVal + '.' + logState.decimal + '°C'})`;
    else if (type === 'general-med') typeDescStr = `약 복용 (${detailVal})`;

    let rawPushText = `로그 ${logState.person} | ${typeDescStr} [${dateFormattedStr}] [token:${myClientToken}]`;
    if (!isFuture) sendNtfyLog(rawPushText);

    globalLogsData.push({
        id: Date.now() + Math.random(),
        timestamp: targetDate,
        person: logState.person,
        type: type, 
        subDetail: detailVal,
        decimal: logState.decimal,
        dateFormattedStr: dateFormattedStr,
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
                triggerEmergencyAlert(`[예약알림] ${log.person} - ${log.subDetail || '일정'} 도래 (${log.dateFormattedStr})`);
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
    
    let chronologicalLogs = [...globalLogsData].sort((a, b) => a.timestamp - b.timestamp);
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

    filteredLogs.forEach(log => {
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

        item.innerHTML = `
            <div class="log-item-left">
                <span class="log-time-badge">⏰ ${log.dateFormattedStr}</span>
                <span class="person-badge ${personClass}">${personIcon} ${log.person}</span>
            </div>
            <div class="log-item-center">
                <div>${bodyText}</div>
            </div>
            <button class="log-item-delete" onclick="deleteLogItem('${log.id}')">×</button>
        `;
        logListArea.appendChild(item);
    });
}

window.deleteLogItem = function(id) {
    globalLogsData = globalLogsData.filter(l => l.id != id);
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
    const dateFormattedStr = `${m}/${d}(${dayName}) ${hours}:${minutes}`;

    globalLogsData.push({
        id: Date.now() + Math.random(),
        timestamp: dateObj,
        person: sourceLabel,
        type: 'sync',
        subDetail: '',
        text: text,
        dateFormattedStr: dateFormattedStr,
        className: className,
        isFuturePending: false
    });
    renderAllLogsUI();
    updateMiniBadgeBar();
}


// --- 📊 로그 저장 및 불러오기 ---
window.saveCurrentLogsToStorage = function() {
    if (globalLogsData.length === 0) { alert("저장할 로그가 없습니다."); return; }
    let sorted = [...globalLogsData].sort((a, b) => a.timestamp - b.timestamp);
    let sMonth = sorted[0].timestamp.getMonth() + 1;
    let sDay = sorted[0].timestamp.getDate();
    let eMonth = sorted[sorted.length - 1].timestamp.getMonth() + 1;
    let eDay = sorted[sorted.length - 1].timestamp.getDate();

    let titleStr = `${sMonth}월 ${sDay}일 ~ ${eMonth}월 ${eDay}일, ${globalLogsData.length}건`;
    let savedList = JSON.parse(localStorage.getItem('familyHealthSavedLogs') || '[]');
    savedList.push({ id: 'save_' + Date.now(), title: titleStr, createdAt: new Date().toLocaleString(), logs: globalLogsData });

    localStorage.setItem('familyHealthSavedLogs', JSON.stringify(savedList));
    alert(`[로그 저장 완료]\n"${titleStr}" 제목으로 저장되었습니다.`);
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
        globalLogsData = found.logs.map(l => ({ ...l, timestamp: new Date(l.timestamp) }));
        renderAllLogsUI(); updateMiniBadgeBar(); buildTimelineReport();
        if (isChartViewActive) renderChartForPerson(currentChartPerson);
        alert(`"${found.title}" 기록을 불러왔습니다!`);
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


// --- 📈 차트 및 리포트 전환 기능 (투약 기록 X축 맞춤 플러그인 적용) ---
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

window.renderChartForPerson = function(personName) {
    currentChartPerson = personName;
    document.getElementById('chartTargetName').innerText = `(현재: ${personName})`;

    let pLogs = globalLogsData.filter(l => l.person === personName && !l.isFuturePending);
    pLogs.sort((a, b) => a.timestamp - b.timestamp);

    let labels = [];
    let tempValues = [];
    let medicationAnnotations = []; // X축 시간에 맞춘 투약 기록 저장

    pLogs.forEach(log => {
        let timeLabel = `${log.timestamp.getMonth() + 1}/${log.timestamp.getDate()} ${String(log.timestamp.getHours()).padStart(2, '0')}:${String(log.timestamp.getMinutes()).padStart(2, '0')}`;
        labels.push(timeLabel);

        if (log.type === 'temp') {
            if (log.subDetail === '정상') tempValues.push(36.5);
            else tempValues.push(parseFloat(`${log.subDetail}.${log.decimal}`));
        } else {
            tempValues.push(null);
        }

        // 투약 및 약 복용 기록 수집
        if (log.type === 'fever' || log.type === 'general-med') {
            medicationAnnotations.push(log.subDetail);
        } else {
            medicationAnnotations.push('');
        }
    });

    const canvasCtx = document.getElementById('healthChartCanvas').getContext('2d');
    if (healthChartInstance) healthChartInstance.destroy();

    // Chart.js 커스텀 플러그인 (X축 시간에 맞추어 차트 상단/하단에 투약명을 한글로 직접 기입)
    const medicationPlugin = {
        id: 'medicationPlugin',
        afterDatasetsDraw(chart) {
            const { ctx, scales: { x, y } } = chart;
            ctx.save();
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';

            chart.data.datasets[0].data.forEach((val, index) => {
                let medName = medicationAnnotations[index];
                if (medName) {
                    let xCoor = x.getPixelForValue(index);
                    // 차트 상단 영역에 투약명 말풍선 스타일로 표시
                    let yCoor = y.getPixelForValue(40.2); 

                    ctx.fillStyle = medName === '부르펜' ? '#EF4444' : (medName === '아세트' ? '#3B82F6' : '#22C55E');
                    ctx.fillRect(xCoor - 28, yCoor - 18, 56, 22);

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(medName, xCoor, yCoor - 3);
                }
            });
            ctx.restore();
        }
    };

    healthChartInstance = new Chart(canvasCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${personName} 체온 (°C) 및 투약 기록`,
                data: tempValues,
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
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94A3B8', font: { size: 12 } }
                }
            },
            plugins: {
                legend: { labels: { color: 'white', font: { size: 16, weight: 'bold' } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let idx = context.dataIndex;
                            let med = medicationAnnotations[idx];
                            let temp = context.parsed.y;
                            return `체온: ${temp}°C ${med ? '| 투약: ' + med : ''}`;
                        }
                    }
                }
            }
        },
        plugins: [medicationPlugin]
    });
};


// --- 📊 로그전체리포트 생성 로직 ---
function buildTimelineReport() {
    if (!reportContainer) return;
    reportContainer.innerHTML = '';

    if (globalLogsData.length === 0) {
        reportContainer.innerHTML = `<div style="color: #94A3B8; font-size: 24px; text-align: center; margin-top: 100px;">기록된 로그가 없습니다. 로그를 먼저 입력해 주세요.</div>`;
        return;
    }

    let personsMap = {};
    let chronologicalLogs = [...globalLogsData].sort((a, b) => a.timestamp - b.timestamp);

    chronologicalLogs.forEach(log => {
        let pName = log.person || '기타';
        if (!personsMap[pName]) personsMap[pName] = [];
        personsMap[pName].push(log);
    });

    for (let person in personsMap) {
        let pLogs = personsMap[person];
        let dateMap = {};

        pLogs.forEach(log => {
            let m = String(log.timestamp.getMonth() + 1).padStart(2, '0');
            let d = String(log.timestamp.getDate()).padStart(2, '0');
            let dayStr = `${m}/${d}(${daysOfWeek[log.timestamp.getDay()]})`;
            if (!dateMap[dayStr]) dateMap[dayStr] = [];
            dateMap[dayStr].push(log);
        });

        let columnsHTML = '';
        let sortedDateKeys = Object.keys(dateMap).sort((a, b) => new Date(b.substring(0, 5)) - new Date(a.substring(0, 5)));

        sortedDateKeys.forEach(dateKey => {
            let dayLogs = dateMap[dateKey];
            dayLogs.sort((a, b) => b.timestamp - a.timestamp);
            let rowsHTML = '';

            dayLogs.forEach(log => {
                let timeStr = `${String(log.timestamp.getHours()).padStart(2, '0')}:${String(log.timestamp.getMinutes()).padStart(2, '0')}`;
                let reportIntervalText = log.isFuturePending ? '⏰ 예약 대기중' : (log.sameMedIntervalStr || log.crossMedIntervalStr || '✨ 첫 기록');

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
                        <span class="timeline-time">${timeStr}</span>
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