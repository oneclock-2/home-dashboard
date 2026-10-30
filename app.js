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
            console.log('화면 켜짐 및 밝기 유지 활성화');
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
let reminderStep = 0; // 점진적 알림 단계 (0: 10분, 1: 30분, 2: 1시간, 3이상: 2시간)

// 점진적 재알림 시간 배열 (단위: 밀리초)
const REMINDER_INTERVALS = [
    10 * 60 * 1000,  // 10분 후
    30 * 60 * 1000,  // 30분 후
    60 * 60 * 1000,  // 1시간 후
    120 * 60 * 1000 // 2시간 후 (이후 지속)
];

const modal = document.getElementById('messageModal');
const unconfirmedContainer = document.getElementById('unconfirmedContainer');
const checklistBar = document.getElementById('checklistBar');
const checklistItems = document.getElementById('checklistItems');
const stickyNotesContainer = document.getElementById('stickyNotesContainer');

const eventSource = new EventSource(`https://ntfy.sh/${NTFY_CHANNEL}/sse`);

eventSource.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        if (data.event === 'message' && data.message) {
            if (data.message.startsWith('[확인완료]')) return; 

            // 3. 외부에서 "경적" 메시지가 입력된 경우 즉시 사운드 재생
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

            // 점진적 재알림 타이머 시작
            startProgressiveReminder();
        }
    } catch (e) {
        console.error("데이터 파싱 오류", e);
    }
};

// 2. 점진적 재알림 타이머 함수 (10분 -> 30분 -> 1시간 -> 2시간)
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
            reminderStep++; // 다음 단계로 이동
            startProgressiveReminder(); // 다음 지연 시간으로 재귀 예약
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
        reminderStep = 0; // 초기화
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
}

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
        body: `[확인완료] "${text}" (수신시각: ${time})`
    }).catch(err => {
        console.log("Ntfy response push failed:", err);
    });
}

// 상단 체크리스트
function addToChecklist(text, receiveTime, confirmTime) {
    checklistBar.style.display = 'block';

    const itemEl = document.createElement('div');
    itemEl.className = 'check-item';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    const textSpan = document.createElement('span');
    textSpan.innerText = text;

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
    postItBtn.onclick = () => {
        createStickyNote(text, confirmTime);
    };

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

// 1. 포스트잇 생성 (글씨크기 2배 반영된 스타일 적용)
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
        audio.play().catch(e => {
            console.log("오디오 자동 재생 제한:", e);
        });
    } catch (e) {
        console.log("오디오 로드 실패", e);
    }
}