// Verify HorsePay payment status directly
import fetch from 'node-fetch';

async function verifyHorsePayPayment(transactionId) {
  try {
    // First authenticate with HorsePay
    const authResponse = await fetch("https://api.horsepay.io/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_key: process.env.HORSEPAY_CLIENT_KEY,
        client_secret: process.env.HORSEPAY_CLIENT_SECRET
      })
    });

    const authData = await authResponse.json();
    console.log('Authentication response:', authData);
    
    const accessToken = authData.access_token;

    if (!accessToken) {
      console.error("Failed to authenticate with HorsePay");
      return;
    }

    // Check the deposit status
    const statusResponse = await fetch(
      `https://api.horsepay.io/api/orders/deposit/${transactionId}`,
      {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json"
        }
      }
    );

    const statusText = await statusResponse.text();
    console.log("Raw response:", statusText);
    
    try {
      const statusData = JSON.parse(statusText);
      console.log("Parsed response:", statusData);
      console.log(`Payment status: ${statusData.status === 1 ? 'PAID' : 'PENDING'}`);
      return statusData;
    } catch (e) {
      console.error("Failed to parse response:", e);
    }
    
  } catch (error) {
    console.error("Error verifying HorsePay payment:", error);
  }
}

// Test transaction 3851903
verifyHorsePayPayment('3851903');
