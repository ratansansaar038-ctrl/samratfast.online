const admin = require('firebase-admin');
const fetch = require('node-fetch');

async function runEngine() {
    console.log("--- SYSTEM STARTING ---");
    
    const keyData = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!keyData) {
        console.error("ERROR: Chabi (Secret) nahi mili!");
        return;
    }

    try {
        const serviceAccount = JSON.parse(keyData);

        // --- FIXED INITIALIZATION (No more 'cert' error) ---
        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        const db = admin.firestore();
        console.log("Firebase Connected ✅");

        // Result Fetch (Spelling: ai.studio)
        const response = await fetch("https://numbersamra-app-2.ai.studio");
        const data = await response.json();

        if (data && data.number) {
            const winNo = String(data.number);
            const market = data.game;
            console.log("Result Found: " + winNo + " for " + market);

            // Database checking
            const snap = await db.collection("fast_bets").where("status", "==", "pending").get();
            
            if (snap.empty) {
                console.log("No pending bets found.");
                return;
            }

            const batch = db.batch();
            console.log("Found " + snap.size + " bets. Settling...");

            snap.forEach(doc => {
                const bet = doc.data();
                const userRef = db.collection("users").doc(bet.userId);
                // Khaiwal stats document
                const statsRef = db.collection("khaiwal").doc("stats");
                const amt = parseInt(bet.amount);

                if (String(bet.number) === winNo) {
                    // Winner (9 guna)
                    batch.update(userRef, { wallet: admin.firestore.FieldValue.increment(amt * 9) });
                    batch.update(statsRef, { totalBalance: admin.firestore.FieldValue.increment(-(amt * 9)) });
                    batch.update(doc.ref, { status: "win", result: winNo });
                } else {
                    // Loser
                    batch.update(statsRef, { totalBalance: admin.firestore.FieldValue.increment(amt) });
                    batch.update(doc.ref, { status: "loss", result: winNo });
                }
            });

            await batch.commit();
            console.log("ALL PAYMENTS SETTLED! 🏆");
        }
    } catch (err) {
        console.error("ASLI ERROR: " + err.message);
        process.exit(1);
    }
}

runEngine();
