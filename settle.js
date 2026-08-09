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

        // Naya Initialization Style (Taaki 'cert' error na aaye)
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }

        const db = admin.firestore();
        console.log("Firebase Connected ✅");

        // Result Fetch karna
        const res = await fetch("https://numbersamra-app-2.ai.studio");
        const data = await res.json();

        if (data && data.number) {
            const winNo = String(data.number);
            const market = data.game;
            console.log("Result Found: " + winNo + " (" + market + ")");

            // Bets check karna
            const snap = await db.collection("fast_bets").where("status", "==", "pending").get();
            if (snap.empty) {
                console.log("No pending bets.");
                return;
            }

            const batch = db.batch();
            snap.forEach(doc => {
                const bet = doc.data();
                const userRef = db.collection("users").doc(bet.userId);
                const statsRef = db.collection("khaiwal").doc("stats");
                const amt = parseInt(bet.amount);

                if (String(bet.number) === winNo) {
                    // Winner Update
                    batch.update(userRef, { wallet: admin.firestore.FieldValue.increment(amt * 9) });
                    batch.update(statsRef, { totalBalance: admin.firestore.FieldValue.increment(-(amt * 9)) });
                    batch.update(doc.ref, { status: "win", result: winNo });
                } else {
                    // Loser Update
                    batch.update(statsRef, { totalBalance: admin.firestore.FieldValue.increment(amt) });
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
