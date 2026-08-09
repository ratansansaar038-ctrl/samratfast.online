const admin = require('firebase-admin');

async function runEngine() {
    console.log("--- SAMRAT FAST ENGINE STARTING ---");
    const keyData = process.env.FIREBASE_SERVICE_ACCOUNT;

    try {
        const serviceAccount = JSON.parse(keyData);
        if (admin.apps.length === 0) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        const db = admin.firestore();
        console.log("Firebase Connected ✅");

        // --- STEP 1: AUTOMATIC RESULT GENERATION ---
        // 1-Minute game mein system khud number nikalta hai
        const luckyNumber = Math.floor(Math.random() * 10).toString();
        const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        
        console.log("Winning Number Generated: " + luckyNumber);

        // --- STEP 2: SAVE RESULT TO FIREBASE ---
        await db.collection("results_fast").add({
            number: luckyNumber,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            timeLabel: currentTime
        });

        // --- STEP 3: SETTLE PENDING BETS ---
        const snap = await db.collection("fast_bets").where("status", "==", "pending").get();
        
        if (snap.empty) {
            console.log("Koi pending bet nahi mili. Round Finish.");
            return;
        }

        const batch = db.batch();
        console.log(snap.size + " Bets ka hisaab shuru...");

        snap.forEach(doc => {
            const b = doc.data();
            const uRef = db.collection("users").doc(b.userId);
            const sRef = db.collection("khaiwal").doc("stats");
            const amt = parseInt(b.amount);

            if (String(b.number) === luckyNumber) {
                // Winner (9 guna payout)
                batch.update(uRef, { wallet: admin.firestore.FieldValue.increment(amt * 9) });
                batch.update(sRef, { totalBalance: admin.firestore.FieldValue.increment(-(amt * 9)) });
                batch.update(doc.ref, { status: "win", result: luckyNumber });
            } else {
                // Loser (Admin ka profit)
                batch.update(sRef, { totalBalance: admin.firestore.FieldValue.increment(amt) });
                batch.update(doc.ref, { status: "loss", result: luckyNumber });
            }
        });

        await batch.commit();
        console.log("SUCCESS: All Fast Rounds Settled! 🏆");

    } catch (err) {
        console.error("CRITICAL ERROR: " + err.message);
    }
}

runEngine();
