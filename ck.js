// ====== ck.js (System Clock & Duty Timer) ======

function updateSystemTime() {
    const now = new Date();
    
    // 1. นาฬิกาหลัก (มุมขวาบน หรือตรง Session Start ถ้าต้องการให้เป็นเวลาปัจจุบัน)
    // แต่ใน HTML คุณใช้ id="time" เป็น Session Start (เวลาคงที่) 
    // ดังนั้นเราอาจจะไม่ได้ยุ่งกับ id="time" ในฟังก์ชันนี้ เว้นแต่คุณอยากให้เป็นนาฬิกาเดิน
    
    // ถ้าอยากให้มีนาฬิกาเดินที่มุมจอ (สร้าง element เพิ่ม หรือใช้ console ดู)
    // console.log("Current Time:", now.toLocaleTimeString('th-TH'));
}

function updateDutyTimer() {
    // ดึงค่า ID เพื่อเช็คสถานะเฉพาะบุคคล
    const currentId = localStorage.getItem("officerId");
    if (!currentId) return;

    const isOnDuty = localStorage.getItem("isOnDuty_" + currentId) === "true";
    const sessionStartKey = localStorage.getItem("session_" + currentId);
    
    const totalTimeEl = document.getElementById("totalTime");

    if (isOnDuty && sessionStartKey) {
        // ในความเป็นจริงเราควรเก็บ startTime ไว้ใน LocalStorage ด้วยเพื่อให้คำนวณแม่นยำ
        // แต่ถ้าจะเอาแบบง่ายๆ ให้นับจากเวลาที่เปิดหน้าเว็บ หรือต้องดึงจาก Firebase
        // เพื่อความง่ายใน Client Side เราจะสมมติว่าเริ่มนับเมื่อโหลดหน้า หรือถ้าจะเอาเป๊ะต้องแก้ fb.js ให้ save startTime ลง LocalStorage
        
        // *แนะนำ*: ให้ fb.js บันทึก dutyStartTime ลง LocalStorage ตอนกดปุ่ม Start
        const storedStartTime = localStorage.getItem("dutyStartTime_" + currentId);
        
        if (storedStartTime) {
            const start = new Date(storedStartTime).getTime();
            const current = new Date().getTime();
            const diff = current - start;

            const hrs = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            if (totalTimeEl) {
                totalTimeEl.textContent = 
                    `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                totalTimeEl.style.color = "#00ffaa"; // สีเขียว
            }
        }
    } else {
        if (totalTimeEl) {
            totalTimeEl.textContent = "00:00:00";
            totalTimeEl.style.color = "#555"; // สีเทา
        }
    }
}

// อัปเดตทุก 1 วินาที
setInterval(() => {
    updateSystemTime();
    updateDutyTimer();
}, 1000);