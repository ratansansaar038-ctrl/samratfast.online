const admin = require('firebase-admin');
const fetch = require('node-fetch');

// --- SAMRAT FAST (1-MIN) ENGINE ---
async function startFastEngine() {
    console.log("--- ENGINE STARTING ---");
    
    // 1. Chabi check karna
    const keyData = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!keyData) {
        console.error("ERROR: FIREBASE_SERVICE_ACCOUNT chabi nahi mili!");
        return;
    }

    try {
        const serviceAccount = JSON.parse(keyData);
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        const db = admin.firestore();
        console.log("Firebase Connected ✅");

        // 2. Random Result Nikalna (0 to 9)
        const luckyNumber = Math.floor(Math.random() * 10).toString();
        const roundTime = new Date().toLocaleTimeString();
        console.log(Winning Number: ${luckyNumber} at ${roundTime});

        // 3. Result ko Firebase mein Save karna (Taki users ko dikhe)
        await db.collection("results").add({
            number: luckyNumber,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 4. Pending bets ko settle karna
        const snapshot = await db.collection("fast_bets")
            .where("status", "==", "pending").get();

        if (snapshot.empty) {
            console.log("Aaj koi pending bet nahi mili.");
            return;
        }

        const batch = db.batch();
        console.log(Found ${snapshot.size} bets. Settle kar rahe hain...);

        snapshot.forEach(doc => {
            const bet = doc.data();
            const userRef = db.collection("users").doc(bet.userId);
            const amt = parseInt(bet.amount);

            if (bet.number.toString() === luckyNumber) {
                // Winner: 9 guna paisa do
                batch.update(userRef, { wallet: admin.firestore.FieldValue.increment(amt * 9) });
                batch.update(doc.ref, { status: "win", result: luckyNumber });
            } else {
                // Loser
                batch.update(doc.ref, { status: "loss", result: luckyNumber });
            }
        });

        await batch.commit();
        console.log("SETTLEMENT DONE! ✅");

    } catch (err) {
        console.error("ASLI ERROR YE HAI: " + err.message);
    }
}

startFastEngine();
