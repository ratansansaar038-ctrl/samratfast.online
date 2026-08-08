const admin = require('firebase-admin');
const fetch = require('node-fetch');

// --- SAMRAT FAST (1-MIN) ENGINE ---
async function startFastEngine() {
    console.log("--- ENGINE STARTING ---");
    
    const keyData = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!keyData) {
        console.error("ERROR: FIREBASE_SERVICE_ACCOUNT NOT FOUND");
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

        // 1. Random Number (0 to 9)
        const luckyNumber = Math.floor(Math.random() * 10).toString();
        const roundTime = new Date().toLocaleTimeString();
        
        // FIXED LINE 28: Backticks added correctly
        console.log("Winning Number: " + luckyNumber + " at " + roundTime);

        // 2. Result Save
        await db.collection("results").add({
            number: luckyNumber,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. Pending Bets Settlement
        const snapshot = await db.collection("f
