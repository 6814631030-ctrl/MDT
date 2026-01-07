// ====== script.js (Login Logic) ======
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username"); // หรือ id input ของคุณ
const passwordInput = document.getElementById("password");
const errorMsg = document.getElementById("error");

// ตั้งค่า Firebase (ใช้ Config เดียวกับ fb.js)
const firebaseConfig = {
    apiKey: "AIzaSyAeHBUh7RLABVIy9exDytaX9_9MHiSWY3A",
    authDomain: "law-enforment.firebaseapp.com",
    databaseURL: "https://law-enforment-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "law-enforment",
    storageBucket: "law-enforment.appspot.com",
    messagingSenderId: "328110715362",
    appId: "1:328110715362:web:6883f14af8be404ecf09bb",
    measurementId: "G-1X08RZGGEF"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    
    errorMsg.textContent = "กำลังตรวจสอบข้อมูล... / Verifying...";
    errorMsg.style.color = "yellow";

    // 1. ค้นหา User จาก Username ใน Database
    db.ref("Users").orderByChild("username").equalTo(user).once("value")
        .then(snapshot => {
            if (snapshot.exists()) {
                // เจอข้อมูล! ดึง ID จริงๆ ออกมา
                const userData = snapshot.val();
                const realID = Object.keys(userData)[0]; // ได้เลข ID เช่น 14002, 301
                const data = userData[realID];

                // 2. ตรวจสอบรหัสผ่าน
                if (data.password === pass) {
                    // รหัสถูก -> บันทึก ID ลงเครื่อง (สำคัญมาก!)
                    localStorage.setItem("officerId", realID);
                    localStorage.setItem("username", data.username);
                    
                    errorMsg.textContent = "Login Success! Redirecting...";
                    errorMsg.style.color = "#0f0";
                    
                    // ไปหน้า Dashboard
                    setTimeout(() => window.location.href = "dashboard.html", 1000);
                } else {
                    errorMsg.textContent = "รหัสผ่านไม่ถูกต้อง / Wrong Password";
                    errorMsg.style.color = "red";
                }
            } else {
                errorMsg.textContent = "ไม่พบชื่อผู้ใช้นี้ / Username not found";
                errorMsg.style.color = "red";
            }
        })
        .catch(err => {
            console.error(err);
            errorMsg.textContent = "Error: " + err.message;
        });
});