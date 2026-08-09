const admin = require("firebase-admin");
const fetch = require("node-fetch");

async function runEngine() {
  console.log("--- SAMRAT FAST ENGINE STARTING ---");

  const keyData = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!keyData) {
    console.error("ERROR: FIREBASE_SERVICE_ACCOUNT chabi nahi mili.");
    return;
  }

  try {
    const serviceAccount = JSON.parse(keyData);

    // Firebase Initialize (Bina kisi crash wali line ke)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    const db = admin.firestore();
    console.log("Firebase Connected ✅");

    // 1. Result Fetch (Bina /get-result ke)
    const response = await fetch("https://numbersamra-app-2.ai.studio");
    const data = await response.json();

    if (data && data.number) {
      const winNo = String(data.number);
      const market = data.game;
      console.log("Result Found: " + winNo + " for " + market);

      // 2. Bets settle karna
      const snapshot = await db.collection("fast_bets")
        .where("gameName", "==", market)
        .where("status", "==", "pending")
        .get();

      if (snapshot.empty) {
        console.log("Koi pending bet nahi mili.");
        return;
      }

      const batch = db.batch();
      console.log("Found " + snapshot.size + " bets. Settling...");

      snapshot.forEach(doc => {
        const bet = doc.data();
        const userRef = db.collection("users").doc(bet.userId);
        const sRef = db.collection("khaiwal").doc("stats");
        const amt = parseInt(bet.amount);

        if (String(bet.number) === winNo) {
          // Winner: 9 guna
          batch.update(userRef, { wallet: admin.firestore.FieldValue.increment(amt * 9) });
          batch.update(sRef, { totalBalance: admin.firestore.FieldValue.increment(-(amt * 9)) });
          batch.update(doc.ref, { status: "win" });
        } else {
          // Loser
          batch.update(sRef, { totalBalance: admin.firestore.FieldValue.increment(amt) });
          batch.update(doc.ref, { status: "loss" });
        }
      });

      await batch.commit();
      console.log("SETTLEMENT SUCCESSFUL! 🏆");
    }
  } catch (err) {
    console.error("CRITICAL ERROR: " + err.message);
    process.exit(1);
  }
}

runEngine();
