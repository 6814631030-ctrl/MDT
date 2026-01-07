// ====== ck.js (แก้ไขใหม่) ======
const updateBtn = document.getElementById("updateCallsignBtn");
const callsignInput = document.getElementById("callsignInput");

if(updateBtn && callsignInput) {
    updateBtn.addEventListener("click", () => {
        const newCallsign = callsignInput.value.trim();
        
        // ดึง ID ผู้ใช้ปัจจุบัน (ซึ่ง fb.js ตั้งค่าไว้ให้แล้ว)
        const officerId = localStorage.getItem("officerId") || "1";

        if (!newCallsign) return alert("กรุณากรอกข้อมูล");

        firebase.database().ref("Users/" + officerId).update({
            callsign: newCallsign
        }).then(() => {
            alert("อัปเดต Callsign เรียบร้อย: " + newCallsign);
            
            // อัปเดตหน้าจอทันทีไม่ต้องรีโหลด
            document.getElementById("userInfo").textContent = 
                `${localStorage.getItem("rank")} | ${newCallsign} | ID: ${officerId}`;
            
            callsignInput.value = "";
        }).catch(err => {
            alert("Error: " + err.message);
        });
    });
}