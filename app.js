// ====== [중요] 본인만의 고유한 Ntfy 채널 이름으로 수정하세요 ======
const NTFY_CHANNEL = "phyjs1073080634"; 
// ==============================================================

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock').innerText = `${hours}:${minutes}`;
}
setInterval(updateClock, 1000);
updateClock();

let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}, 10000);

let currentMessage = "";
const modal = document.getElementById('messageModal');
const modalText = document.getElementById('modalMessageText');
const confirmBtn = document.getElementById('confirmBtn');
const checklistBar = document.getElementById('checklistBar');
const checklistItems = document.getElementById('checklistItems');

const eventSource = new EventSource(`https://ntfy.sh/${NTFY_CHANNEL}/sse`);

eventSource.onmessage = function(event) {
    try {
        const data = JSON.parse(event.data);
        if (data.event === 'message' && data.message) {
            currentMessage = data.message;
            modalText.innerText = currentMessage;
            modal.classList.add('active');
            playAlertSound();
        }
    } catch (e) {
        console.error("데이터 파싱 오류", e);
    }
};

confirmBtn.addEventListener('click', () => {
    if (!currentMessage) return;
    modal.classList.remove('active');
    addToChecklist(currentMessage);
    currentMessage = "";
});

function addToChecklist(text) {
    checklistBar.style.display = 'block';

    const itemEl = document.createElement('div');
    itemEl.className = 'check-item';
    
    const textSpan = document.createElement('span');
    textSpan.innerText = text;

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = '삭제';
    
    deleteBtn.addEventListener('click', () => {
        itemEl.remove();
        if (checklistItems.children.length === 0) {
            checklistBar.style.display = 'none';
        }
    });

    itemEl.appendChild(textSpan);
    itemEl.appendChild(deleteBtn);
    checklistItems.prepend(itemEl);
}

function playAlertSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        console.log("Audio play failed", e);
    }
}