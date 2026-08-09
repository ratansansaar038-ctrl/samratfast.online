const admin = require('firebase-admin');
const fetch = require('node-fetch');

async function runEngine() {
    console.log("--- SYSTEM STARTING ---");
    const keyData = process.env.FIREBASE_SERVICE_ACCOUNT;

    try {
        const serviceAccount = JSON.parse(keyData);
        if (admin.apps.length === 0) {
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        const db = admin.firestore();
        console.log("Firebase Connected ✅");

        // --- ASLI FIX YAHAN HAI ---
        const response = await fetch("https://numbersamra-app-2.ai.studio");
        const body = await response.text(); // Pehle text ki tarah uthao
        
        let data;
        try {
            data = JSON.parse(body); // Phir check karo ki kya ye JSON hai
        } catch (e) {
            console.error("API ERROR: Link ne data nahi, website bhej di hai!");
            console.log("Link se ye mila: " + body.substring(0, 100)); // Pehli 100 lines print karo
            return;
        }

        if (data && data.number) {
            const winNo = String(data.number);
            const market = data.game;
            console.log("Result Found: " + winNo + " for " + market);

            await db.collection("results_fast").add({
                number: winNo,
                game: market,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            const snap = await db.collection("fast_bets").where("status", "==", "pending").get();
            if (snap.empty) { console.log("No pending bets."); return; }

            const batch = db.batch();
            snap.forEach(doc => {
                const b = doc.data();
                const uRef = db.collection("users").doc(b.userId);
                const sRef = db.collection("khaiwal").doc("stats");
                const amt = parseInt(b.amount);

                if (String(b.number) === winNo) {
                    batch.update(uRef, { wallet: admin.firestore.FieldValue.increment(amt * 9) });
                    batch.update(sRef, { totalBalance: admin.firestore.FieldValue.increment(-(amt * 9)) });
                    batch.update(doc.ref, { status: "win", result: winNo });
                } else {
                    batch.update(sRef, { totalBalance: admin.firestore.FieldValue.increment(amt) });
                    batch.update(doc.ref, { status: "loss", result: winNo });
                }
            });
            await batch.commit();
            console.log("SUCCESS: All settled! 🏆");
        }
    } catch (err) {
        console.error("CRITICAL ERROR: " + err.message);
    }
}
runEngine();
