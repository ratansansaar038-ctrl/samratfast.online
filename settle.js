const admin = require('firebase-admin');
const fetch = require('node-fetch');

async function runEngine() {
    console.log("Hissa 1: Checking Secret...");
    const keyData = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!keyData) {
        console.error("Galti: Chabi (Secret) nahi mili!");
        return;
    }
    try {
        const serviceAccount = JSON.parse(keyData);
        console.log("Hissa 2: Connecting Firebase...");

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        const db = admin.firestore();
        console.log("Firebase Connected ✅");
        console.log("Hissa 3: Fetching Result...");
        const response = await fetch("https://numbersamra-app-2.ai.studio");
        const data = await response.json();
        const winNo = String(data.number);
        const market = data.game;
        console.log("Result: " + winNo + " Market: " + market);
        const snapshot = await db.collection("fast_bets").where("status", "==", "pending").get();
        if (snapshot.empty) {
            console.log("Koi pending bet nahi mili.");
        } else {
            const batch = db.batch();
            snapshot.forEach(doc => {
                const bet = doc.data();
                const amt = parseInt(bet.amount);
                if (String(bet.number) === winNo) {
                    batch.update(db.collection("users").doc(bet.userId), { wallet: admin.firestore.FieldValue.increment(amt * 9) });
                    batch.update(doc.ref, { status: "win", result: winNo });
                } else {
                    batch.update(doc.ref, { status: "loss", result: winNo });
                }
            });
            await batch.commit();
            console.log("Settlement Successful! ✅");
        }
    } catch (err) {
        console.error("Asli Error: " + err.message);
    }
}
runEngine();
