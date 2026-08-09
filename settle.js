const admin = require('firebase-admin');
const fetch = require('node-fetch');

async function run() {
    console.log("--- SYSTEM BOOTING ---");
    const keyString = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!keyString) {
        console.error("ERROR: Secret Key nahi mili!");
        return;
    }

    try {
        const serviceAccount = JSON.parse(keyString);

        // --- FIXED: length wali line hata di hai ---
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        const db = admin.firestore();
        console.log("Firebase Connected ✅");

        // Result Fetch (ai.studio se)
        const res = await fetch("https://numbersamra-app-2.ai.studio");
        const data = await res.json();

        if (data && data.number) {
            const winNo = String(data.number);
            const market = data.game;
            console.log("Result Found: " + winNo + " for " + market);

            // Results_fast folder mein save karna
            await db.collection("results_fast").add({
                number: winNo,
                game: market,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            // Bets settle karna
            const snap = await db.collection("fast_bets").where("status", "==", "pending").get();
            if (snap.empty) {
                console.log("No pending bets.");
                return;
            }

            const batch = db.batch();
            snap.forEach(doc => {
                const b = doc.data();
                const uRef = db.collection("users").doc(b.userId);
                const amt = parseInt(b.amount);

                if (String(b.number) === winNo) {
                    batch.update(uRef, { wallet: admin.firestore.FieldValue.increment(amt * 9) });
                    batch.update(doc.ref, { status: "win", result: winNo });
                } else {
                    batch.update(doc.ref, { status: "loss", result: winNo });
                }
            });

            await batch.commit();
            console.log("SUCCESS: All payments settled! ✅");
        }
    } catch (err) {
        console.error("ASLI ERROR: " + err.message);
    }
}

run();
