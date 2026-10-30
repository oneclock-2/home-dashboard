const NTFY_CHANNEL = "phyjs1073080634"; 

// 시계 작동
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock').innerText = `${hours}:${minutes}`;
}
setInterval(updateClock, 1000);
updateClock();

// 배경 사진 슬라이드 (10분 주기)
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

            if (data.message.includes(`[token:${myClientToken}]`)) {
                return;
            }

            if (data.message.startsWith('로그') || data.message.includes('로그')) {
                const cleanMsg = data.message.replace(/\[token:[^\]]+\]/, '').replace(/^로그\s*/, '').trim();
                const now = new Date();
                
                let formattedMsg = cleanMsg
                    .replace('아세트', '<span class="med-acet">아세트</span>')
                    .replace('부르펜', '<span class="med-ibu">부르펜</span>');
                
                appendLogDataDirect(now, formattedMsg, cleanMsg.includes('해열제') ? 'fever-reducer' : (cleanMsg.includes('체온') ? 'temperature' : 'push-log'), '외부폰');
                return;
            }

            if (data.message.includes('경적')) {
                playAlertSound();
            }

            const now = new Date();
            const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const newItem = {
                id: Date.now() + Math.random(),
                text: data.message,
                time: timeString
            };

            unconfirmedList.push(newItem);
            playAlertSound();
            renderUnconfirmedModal();
            modal.classList.add('active');

            requestScreenWakeLock();
            startProgressiveReminder();
        }
    } catch (e) {
        console.error("데이터 파싱 오류", e);
    }
};

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
    }).catch(err => {
        console.log("Ntfy response push failed:", err);
    });
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

function playAlertSound() {
    try {
        const audio = new Audio('alert.mp3');
        audio.play().catch(e => { console.log(e); });
    } catch (e) {}
}


// --- 📝 건강·소통 로그 시스템 (뒤로가기, 대상자별 색상, 해열제 테마 적용) ---
const logTriggerBtn = document.getElementById('logTriggerBtn');
const logPanel = document.getElementById('logPanel');
const logCloseBtn = document.getElementById('logCloseBtn');
const logReportBtn = document.getElementById('logReportBtn');
const logWizardArea = document.getElementById('logWizardArea');
const logListArea = document.getElementById('logListArea');

const reportModal = document.getElementById('reportModal');
const reportCloseBtn = document.getElementById('reportCloseBtn');
const reportContainer = document.getElementById('reportContainer');

let globalLogsData = [];

let logState = {
    category: null, 
    person: null,   
    subCategory: null, 
    decimal: null,  
    timeOffset: 0   
};

logTriggerBtn.onclick = () => {
    logPanel.style.display = 'flex';
    resetWizard();
};

logCloseBtn.onclick = () => {
    globalLogsData = []; 
    logListArea.innerHTML = '';
    logPanel.style.display = 'none';
};

logReportBtn.onclick = () => {
    buildTimelineReport();
    reportModal.classList.add('active');
};

reportCloseBtn.onclick = () => {
    reportModal.classList.remove('active');
};

function resetWizard() {
    logState = { category: null, person: null, subCategory: null, decimal: null, timeOffset: 0 };
    renderWizardStep1();
}

// 1단계: 기록할 항목 선택
function renderWizardStep1() {
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">1단계: 기록할 항목 선택</div>
        </div>
        <div class="wizard-pills-container">
            <button class="wizard-pill accent" onclick="selectCategory('해열제')">💊 해열제 투약</button>
            <button class="wizard-pill" onclick="selectCategory('체온')">🌡️ 체온 측정</button>
        </div>
    `;
}

window.selectCategory = function(cat) {
    logState.category = cat;
    renderWizardStep2();
};

// 2단계: 대상 선택 (윤우:파랑, 윤서:핑크, 엄마/아빠:흰색) + 뒤로가기 추가
function renderWizardStep2() {
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">[${logState.category}] 대상 선택</div>
            <button class="wizard-back-btn" onclick="renderWizardStep1()">⬅️ 뒤로</button>
        </div>
        <div class="wizard-pills-container">
            <button class="wizard-pill pill-yoonwoo" onclick="selectPerson('윤우')">👶 윤우</button>
            <button class="wizard-pill pill-yoonseo" onclick="selectPerson('윤서')">👧 윤서</button>
            <button class="wizard-pill pill-parent" onclick="selectPerson('아빠')">👨 아빠</button>
            <button class="wizard-pill pill-parent" onclick="selectPerson('엄마')">👩 엄마</button>
        </div>
    `;
}

window.selectPerson = function(person) {
    logState.person = person;
    if (logState.category === '해열제') {
        renderWizardStepFeverMed();
    } else {
        renderWizardStepTempInt();
    }
};

// 해열제 종류 선택 (아세트:붉은색, 부르펜:누런하얀색 테마 적용) + 뒤로가기 추가
function renderWizardStepFeverMed() {
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">[${logState.person}] 해열제 종류 선택</div>
            <button class="wizard-back-btn" onclick="renderWizardStep2()">⬅️ 뒤로</button>
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

// 체온 정수 선택 + 뒤로가기 추가
function renderWizardStepTempInt() {
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">[${logState.person}] 체온 정수 선택</div>
            <button class="wizard-back-btn" onclick="renderWizardStep2()">⬅️ 뒤로</button>
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

// 체온 소수점 선택 + 뒤로가기 추가
function renderWizardStepTempDec() {
    let btnsHTML = '';
    for (let i = 0; i <= 9; i++) {
        btnsHTML += `<button class="wizard-pill" onclick="selectTempDec('${i}')">.${i}</button>`;
    }
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">[${logState.person}] 체온 소수점 선택 (${logState.subCategory}.X)</div>
            <button class="wizard-back-btn" onclick="renderWizardStepTempInt()">⬅️ 뒤로</button>
        </div>
        <div class="wizard-pills-container">
            ${btnsHTML}
        </div>
    `;
}

window.selectTempDec = function(dec) {
    logState.decimal = dec;
    renderWizardStepTime('temp');
};

// 시간 선택 + 뒤로가기 추가
function renderWizardStepTime(type) {
    let backFunc = (type === 'fever') ? 'renderWizardStepFeverMed()' : (logState.subCategory === '정상' ? 'renderWizardStepTempInt()' : 'renderWizardStepTempDec()');
    logWizardArea.innerHTML = `
        <div class="wizard-step-header">
            <div class="wizard-step-title">투약/측정 시간 선택</div>
            <button class="wizard-back-btn" onclick="${backFunc}">⬅️ 뒤로</button>
        </div>
        <div class="wizard-pills-container">
            <button class="wizard-pill" onclick="finalizeLog('${type}', 0)">현재 시간</button>
            <button class="wizard-pill" onclick="finalizeLog('${type}', 1)">1시간 전</button>
            <button class="wizard-pill" onclick="finalizeLog('${type}', 2)">2시간 전</button>
        </div>
    `;
}

window.finalizeLog = function(type, offsetHours) {
    const targetDate = new Date(Date.now() - offsetHours * 3600000);
    const timeStr = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;
    
    let logText = '';
    let rawPushText = '';
    let itemClass = '';
    let detailVal = logState.subCategory;

    if (type === 'fever') {
        rawPushText = `로그 ${logState.person} | 해열제 투약 (${detailVal}) [${timeStr}] [token:${myClientToken}]`;
        let medFormatted = detailVal === '아세트' ? 
            '<span class="med-acet">아세트</span>' : 
            '<span class="med-ibu">부르펜</span>';
        
        logText = `[${timeStr}] ${logState.person} | 해열제 투약 (${medFormatted})`;
        itemClass = 'fever-reducer';
    } else {
        let tempVal = detailVal === '정상' ? '정상 체온' : `${detailVal}.${logState.decimal}°C`;
        rawPushText = `로그 ${logState.person} | 체온 측정 (${tempVal}) [${timeStr}] [token:${myClientToken}]`;
        logText = `[${timeStr}] ${logState.person} | 체온 측정 (${tempVal})`;
        itemClass = 'temperature';
        detailVal = tempVal;
    }

    sendNtfyLog(rawPushText);

    globalLogsData.unshift({
        timestamp: targetDate,
        person: logState.person,
        type: type, 
        subDetail: logState.subCategory, 
        text: logText,
        className: itemClass
    });

    appendLogUIDirect(targetDate, logText, itemClass);
    resetWizard();
};

function sendNtfyLog(text) {
    fetch(`https://ntfy.sh/${NTFY_CHANNEL}`, {
        method: 'POST',
        body: text
    }).catch(err => {
        console.log("Ntfy log push failed:", err);
    });
}

function appendLogUIDirect(dateObj, text, className) {
    logPanel.style.display = 'flex';
    const item = document.createElement('div');
    item.className = `log-item ${className}`;
    item.innerHTML = `
        <span class="log-item-text">${text}</span>
        <button class="log-item-delete" onclick="this.closest('.log-item').remove()">×</button>
    `;
    logListArea.prepend(item);
}

function appendLogDataDirect(dateObj, text, className, sourceLabel) {
    globalLogsData.unshift({
        timestamp: dateObj,
        person: sourceLabel,
        type: 'sync',
        subDetail: '',
        text: text,
        className: className
    });
    appendLogUIDirect(dateObj, text, className);
}


// --- 📊 날짜별 컬럼 형태의 타임라인 리포트 생성 로직 ---
function buildTimelineReport() {
    reportContainer.innerHTML = '';

    if (globalLogsData.length === 0) {
        reportContainer.innerHTML = `<div style="color: #94A3B8; font-size: 24px; text-align: center; margin-top: 100px;">기록된 로그가 없습니다. 로그를 먼저 입력해 주세요.</div>`;
        return;
    }

    let personsMap = {};
    let sortedLogs = [...globalLogsData].sort((a, b) => a.timestamp - b.timestamp);

    sortedLogs.forEach(log => {
        let pName = log.person || '기타';
        if (!personsMap[pName]) {
            personsMap[pName] = [];
        }
        personsMap[pName].push(log);
    });

    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

    for (let person in personsMap) {
        let pLogs = personsMap[person];
        let dateMap = {};

        pLogs.forEach(log => {
            let m = String(log.timestamp.getMonth() + 1).padStart(2, '0');
            let d = String(log.timestamp.getDate()).padStart(2, '0');
            let dayStr = `${m}/${d}(${daysOfWeek[log.timestamp.getDay()]})`;

            if (!dateMap[dayStr]) {
                dateMap[dayStr] = [];
            }
            dateMap[dayStr].push(log);
        });

        let columnsHTML = '';
        let lastAcetTime = null;
        let lastIbuTime = null;
        let lastAnyMedTime = null;

        for (let dateKey in dateMap) {
            let dayLogs = dateMap[dateKey];
            let rowsHTML = '';

            dayLogs.forEach(log => {
                let timeStr = `${String(log.timestamp.getHours()).padStart(2, '0')}:${String(log.timestamp.getMinutes()).padStart(2, '0')}`;
                let intervalText = '';

                if (log.type === 'fever') {
                    let isAcet = log.subDetail === '아세트';
                    
                    if (isAcet) {
                        if (lastAcetTime) {
                            let diffMins = Math.round((log.timestamp - lastAcetTime) / 60000);
                            let hours = Math.floor(diffMins / 60);
                            let mins = diffMins % 60;
                            intervalText = `동일(아세트): ${hours > 0 ? hours + 'h ' : ''}${mins}m`;
                        }
                        lastAcetTime = log.timestamp;
                    } else {
                        if (lastIbuTime) {
                            let diffMins = Math.round((log.timestamp - lastIbuTime) / 60000);
                            let hours = Math.floor(diffMins / 60);
                            let mins = diffMins % 60;
                            intervalText = `동일(부르펜): ${hours > 0 ? hours + 'h ' : ''}${mins}m`;
                        }
                        lastIbuTime = log.timestamp;
                    }

                    if (lastAnyMedTime) {
                        let crossMins = Math.round((log.timestamp - lastAnyMedTime) / 60000);
                        let cHours = Math.floor(crossMins / 60);
                        let cMins = crossMins % 60;
                        if (!intervalText || crossMins > 0) {
                            intervalText = `직전후 ${cHours > 0 ? cHours + 'h ' : ''}${cMins}m`;
                        }
                    }
                    lastAnyMedTime = log.timestamp;
                }

                rowsHTML += `
                    <div class="timeline-row">
                        <span class="timeline-time">⏰ ${timeStr}</span>
                        <span class="timeline-content">${log.text}</span>
                        <span class="timeline-interval">${intervalText ? '⏳ ' + intervalText : '✨ 첫 기록'}</span>
                    </div>
                `;
            });

            columnsHTML += `
                <div class="report-date-column">
                    <div class="report-date-header">📅 ${dateKey}</div>
                    <div class="timeline-events-list">
                        ${rowsHTML}
                    </div>
                </div>
            `;
        }

        let card = document.createElement('div');
        card.className = 'report-timeline-card';
        card.innerHTML = `
            <div class="report-person-title">👤 ${person} 타임라인 기록</div>
            <div class="report-columns-grid">
                ${columnsHTML}
            </div>
        `;
        reportContainer.appendChild(card);
    }
}