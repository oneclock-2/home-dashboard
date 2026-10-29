// 채널 ID 고정 설정
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

// 배경 사진 슬라이드 (10분 주기 = 10 * 60 * 1000ms = 600000ms)
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}, 10 * 60 * 1000);

// --- 안양시 날씨 가져오기 (Open-Meteo 무료 API) ---
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


// --- Ntfy 푸시 알림 및 체크리스트 처리 로직 ---
let unconfirmedList = []; 
let reminderInterval = null;

const modal = document.getElementById('messageModal');
const unconfirmedContainer = document.getElementById('unconfirmedContainer');
const checklistBar = document.getElementById('checklistBar');
const checklistItems = document.getElementById('checklistItems');

const eventSource = new EventSource(`https://ntfy.sh/${NTFY_CHANNEL}/sse`);

eventSource.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        if (data.event === 'message' && data.message) {
            if (data.message.startsWith('[확인완료]')) return; 

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

            if (!reminderInterval) {
                reminderInterval = setInterval(() => {
                    if (unconfirmedList.length > 0) {
                        playAlertSound();
                    } else {
                        clearInterval(reminderInterval);
                        reminderInterval = null;
                    }
                }, 10 * 60 * 1000);
            }
        }
    } catch (e) {
        console.error("데이터 파싱 오류", e);
    }
};

function renderUnconfirmedModal() {
    unconfirmedContainer.innerHTML = '';

    if (unconfirmedList.length === 0) {
        modal.classList.remove('active');
        if (reminderInterval) {
            clearInterval(reminderInterval);
            reminderInterval = null;
        }
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

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '삭제';
    
    deleteBtn.addEventListener('click', () => {
        itemEl.remove();
        if (checklistItems.children.length === 0) {
            checklistBar.style.display = 'none';
        }
    });

    itemEl.appendChild(contentDiv);
    itemEl.appendChild(deleteBtn);
    checklistItems.prepend(itemEl);
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