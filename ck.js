const updateBtn = document.getElementById("updateCallsignBtn");
const callsignInput = document.getElementById("callsignInput");

updateBtn.addEventListener("click", () => {
  const newCallsign = callsignInput.value.trim();
  if (!newCallsign) {
    alert("กรุณากรอก Callsign ใหม่!");
    return;
  }
  if (!/^[a-zA-Z0-9-]{1,10}$/.test(newCallsign)) {
    alert("กรุณากรอก Callsign ที่ถูกต้อง (ตัวอักษรและตัวเลข 1-10 ตัวอักษร)!");
    return;
  }

  const userKey = localStorage.getItem("userKey");
  if (!userKey) {
    alert("ไม่พบผู้ใช้ที่ล็อกอิน!");
    return;
  }

  firebase.database().ref(`Users/${userKey}`).update({ callsign: newCallsign })
    .then(() => {
      alert("อัปเดต Callsign เรียบร้อยแล้ว!");
      localStorage.setItem("callsign", newCallsign);

      callsignInput.value = "";
      const userInfo = document.getElementById("userInfo");
      if (userInfo) userInfo.textContent = `Callsign: ${newCallsign}`;
    })
    .catch((err) => {
      console.error("เกิดข้อผิดพลาด:", err);
      alert("อัปเดต Callsign ไม่สำเร็จ!");
    });
});

