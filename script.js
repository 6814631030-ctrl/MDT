
// ====== Firebase Config ======
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// ====== Login Script ======
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("error");

  const database = firebase.database();
  const usersRef = database.ref("Users");
  const snapshot = await usersRef.orderByChild("username").equalTo(username).once("value");


  try {
    // ค้นหา user
    const snapshot = await usersRef.orderByChild("username").equalTo(username).once("value");

    if (!snapshot.exists()) {
      errorEl.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง ❌";
      errorEl.style.color = "red";
      return;
    }

    const users = snapshot.val();
    const userKey = Object.keys(users)[0];
    const user = users[userKey];

    // ตรวจสอบรหัสผ่าน (ใช้ hash ได้ในอนาคต)
    if (user.password === password) {

      const loginTime = new Date().toLocaleString("th-TH");

      // อัปเดต loginTime ใน Firebase
      await usersRef.child(userKey).update({ loginTime: loginTime });

      // เก็บข้อมูลจำเป็นลง sessionStorage แทน localStorage
      sessionStorage.setItem("officerId", user.officerId);
      sessionStorage.setItem("name", user.name);
      sessionStorage.setItem("rank", user.rank);
      sessionStorage.setItem("callsign", user.callsign || "N/A");
      sessionStorage.setItem("loginTime", loginTime);
      sessionStorage.setItem("isAdmin", user.isAdmin ? "true" : "false");

      // ไปหน้า dashboard
      window.location.href = "dashboard.html";
    } else {
      errorEl.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง ❌";
      errorEl.style.color = "red";
    }
  } catch (err) {
    errorEl.textContent = "เกิดข้อผิดพลาดในการดึงข้อมูลจาก Firebase ❌";
    console.error("Firebase fetch error:", err);
  }
  
});
