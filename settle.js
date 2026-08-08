const admin = require("firebase-admin");

async function run() {
  console.log("Starting Samrat Fast Engine...");

  const key = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!key) {
    console.error("Error: Key not found in Secrets!");
    return;
  }

  try {
    const serviceAccount = JSON.parse(key);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    const db = admin.firestore();

    // 1. Result Nikalna (0-9)
    const luckyNum = Math.floor(Math.random() * 10).toString();
    console.log("Winning Number: " + luckyNum);

    // 2. Result Save Karna
    await db.collection("results").add({
      number: luckyNum,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Bets Check Karna
    const bets = await db.collection("fast_bets").where("status", "==", "pending").get();

    if (bets.empty) {
      console.log("No pending bets found.");
      return;
    }

    const batch = db.batch();
    bets.forEach((doc) => {
      const b = doc.data();
      const uRef = db.collection("users").doc(b.userId);
      const amt = parseInt(b.amount);

      if (b.number.toString() === luckyNum) {
        // WINNER (10 ka 90)
        batch.update(uRef, { wallet: admin.firestore.FieldValue.increment(amt * 9) });
        batch.update(doc.ref, { status: "win", result: luckyNum });
      } else {
        // LOSER
        batch.update(doc.ref, { status: "loss", result: luckyNum });
      }
    });

    await batch.commit();
    console.log("ALL ROUNDS SETTLED! ✅");

  } catch (err) {
    console.error("Asli Galti: " + err.message);
  }
}

run();
