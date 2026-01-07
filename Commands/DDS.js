// DDS.js (Base64 upload version)
// วางหลังจาก Firebase scripts ใน HTML

// ====== ใส่ firebaseConfig ของคุณที่นี่ ======
const firebaseConfig = {
  apiKey: "AIzaSyAeHBUh7RLABVIy9exDytaX9_9MHiSW3A",
  authDomain: "law-enforment.firebaseapp.com",
  databaseURL: "https://law-enforment-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "law-enforment",
  storageBucket: "law-enforment.appspot.com",
  messagingSenderId: "328110715362",
  appId: "1:328110715362:web:6883f14af8be404ecf09bb"
};
// ==============================================

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ฟังก์ชันช่วย: ย่อรูปและแปลงเป็น dataURL (รองรับ PNG/JPEG)
function resizeImageFileToDataURL(file, maxSize = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // คำนวณสัดส่วน
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = width / height;
          if (width > height) {
            width = maxSize;
            height = Math.round(maxSize / ratio);
          } else {
            height = maxSize;
            width = Math.round(maxSize * ratio);
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // ถ้าเป็น PNG ดั้งเดิมและต้องการเก็บเป็น PNG ให้ใส่ 'image/png'
        // เราจะบันทึกเป็น JPEG เพื่อลดขนาด (quality ควบคุม)
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataURL = canvas.toDataURL(mime, mime === "image/png" ? 1.0 : quality);
        resolve({
          dataURL,
          width,
          height
        });
      };
      img.onerror = () => reject(new Error("Image load error"));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// preview (เหมือนเดิม)
document.getElementById("profilePic").addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const preview = document.getElementById("preview");
      preview.src = event.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }
});

// ฟอร์ม submit (เก็บรูปเป็น Base64 ลง Realtime DB)
document.getElementById("userForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const statusEl = document.getElementById("status");
  statusEl.style.color = "#ffdd57";
  statusEl.textContent = "กำลังบันทึก...";

  try {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const name = document.getElementById("name").value.trim();
    const rank = document.getElementById("rank").value.trim();
    const callsign = document.getElementById("callsign").value.trim();
    const badgeInput = document.getElementById("badgeId").value.trim();
    const isAdmin = document.getElementById("isAdmin").checked;
    const file = document.getElementById("profilePic").files[0];

    console.log("Form data:", { username, name, rank, callsign, badgeInput, isAdmin, file });

    let newOfficerId;

    // ถ้ามี Badge ID ให้ใช้, ถ้าไม่มีก็ auto-increment
    if (badgeInput !== "") {
      const parsed = parseInt(badgeInput, 10);
      if (isNaN(parsed) || parsed <= 0) throw new Error("Badge ID ต้องเป็นตัวเลขบวกเท่านั้น");
      newOfficerId = parsed;
    } else {
      const snapshot = await db.ref("Users").orderByChild("officerId").limitToLast(1).once("value");
      newOfficerId = 1;
      snapshot.forEach(child => {
        const lastId = child.val().officerId;
        if (lastId !== undefined && lastId !== null) {
          const parsedLast = parseInt(lastId, 10);
          if (!isNaN(parsedLast)) newOfficerId = parsedLast + 1;
        }
      });
    }
    console.log("ใช้ officerId =", newOfficerId);

    // ตรวจสอบการทับข้อมูล (ถ้าผู้ใช้กรอก badge เอง)
    const existingSnap = await db.ref("Users/" + newOfficerId).once("value");
    if (existingSnap.exists()) {
      if (badgeInput !== "") {
        const ok = confirm("Badge ID นี้มีอยู่แล้ว — ต้องการทับข้อมูลเดิมหรือไม่?");
        if (!ok) {
          statusEl.style.color = "red";
          statusEl.textContent = "ยกเลิก: Badge ID มีอยู่แล้ว";
          return;
        }
      } else {
        newOfficerId = newOfficerId + 1;
        console.log("พบชนกันกับ auto-generated id -> เปลี่ยนเป็น", newOfficerId);
      }
    }

    // จัดการรูป: ย่อและแปลงเป็น DataURL (base64)
    let profilePicBase64 = "";
    let meta = null;
    if (file) {
      const originalSize = file.size;
      const mimeType = file.type;
      const name = file.name;
      // ย่อและแปลง
      const { dataURL, width, height } = await resizeImageFileToDataURL(file, 1024, 0.8);
      // ประเมินขนาดหลังแปลง (ความยาว string)
      const sizeAfter = Math.round((dataURL.length * 3) / 4); // ประมาณ bytes
      profilePicBase64 = dataURL; // เก็บ DataURL เต็มรูปแบบ (prefix + base64)
      meta = {
        fileName: name,
        mimeType,
        sizeBefore: originalSize,
        approxSizeAfter: sizeAfter,
        width,
        height
      };
      console.log("Image converted:", meta);
    }

    const userObj = {
      officerId: newOfficerId,
      badgeId: newOfficerId,
      username,
      password,
      name,
      rank,
      callsign,
      isAdmin,
      profilePicBase64, // ฟิลด์ที่เก็บ data URL
      profilePicMeta: meta,
      loginTime: "",
      totalTime: 0,
      dutyLogs: {}
    };

    // เขียนลง Realtime DB
    await db.ref("Users/" + newOfficerId).set(userObj);
    console.log("เขียน DB สำเร็จ:", newOfficerId);

    statusEl.style.color = "lightgreen";
    statusEl.textContent = `✅ เพิ่มผู้ใช้สำเร็จ! (ID: ${newOfficerId})`;
    this.reset();
    document.getElementById("preview").style.display = "none";

    setTimeout(() => { statusEl.textContent = ""; }, 5000);
  } catch (err) {
    console.error("Error saving user:", err);
    statusEl.style.color = "red";
    statusEl.textContent = "❌ เกิดข้อผิดพลาด: " + (err && err.message ? err.message : String(err));
  }
});
