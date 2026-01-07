// ====== ck.js (System Timer & Duration Calc) ======

function updateDutyTimer() {
    // 1. หา User ID ปัจจุบัน
    const currentId = localStorage.getItem("officerId");
    if (!currentId) return;

    // 2. ดึงเวลาที่เริ่มกดปุ่ม (Start Time) จากเครื่อง
    const startTimeStr = localStorage.getItem("dutyStartTime_" + currentId);
    const totalTimeEl = document.getElementById("totalTime");

    if (startTimeStr && totalTimeEl) {
        // มีเวลาเริ่ม -> คำนวณความต่าง
        const startTime = new Date(startTimeStr).getTime();
        const now = new Date().getTime();
        const diff = now - startTime; // ผลต่างเป็นมิลลิวินาที

        // แปลงเป็น ชั่วโมง:นาที:วินาที
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        // จัดรูปแบบให้มีเลข 0 นำหน้า (เช่น 01:05:09)
        const hrsStr = hrs.toString().padStart(2, '0');
        const minsStr = mins.toString().padStart(2, '0');
        const secsStr = secs.toString().padStart(2, '0');

        totalTimeEl.textContent = `${hrsStr}:${minsStr}:${secsStr}`;
        totalTimeEl.style.color = "#00ffaa"; // สีเขียวเรืองแสง
        totalTimeEl.style.textShadow = "0 0 10px rgba(0, 255, 170, 0.5)";

    } else if (totalTimeEl) {
        // ไม่มีเวลาเริ่ม (ยังไม่กด On Duty)
        totalTimeEl.textContent = "00:00:00";
        totalTimeEl.style.color = "#555"; // สีเทา
        totalTimeEl.style.textShadow = "none";
    }
}

// สั่งให้ทำงานทุกๆ 1 วินาที (1000 ms)
setInterval(updateDutyTimer, 1000);

// เรียกทำงานครั้งแรกทันทีไม่ต้องรอ 1 วิ
updateDutyTimer();
