// Verify HorsePay payment status directly
import fetch from 'node-fetch';

async function verifyHorsePayPayment(transactionId) {
  try {
    // Get credentials from env
    const clientKey = process.env.HORSEPAY_CLIENT_KEY || '93344dcd07348eef7425437dff7aedff4460ce2f96597cd5cd7805b94693391b';
    const clientSecret = process.env.HORSEPAY_CLIENT_SECRET || 'ab815200a0c4a8a765aa5117a8d6f4a7bc6b675be2105c1f71b8f86518632d55';
    
    console.log('Using client_key:', clientKey.substring(0, 10) + '...');
    
    // First authenticate with HorsePay - trying different field names
    const authResponse = await fetch("https://api.horsepay.io/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ClientKey: clientKey,  // Try with capital C
        ClientSecret: clientSecret
      })
    });

    const authText = await authResponse.text();
    console.log('Authentication response:', authText);
    
    try {
      const authData = JSON.parse(authText);
      const accessToken = authData.access_token;

      if (!accessToken) {
        console.error("No access token received");
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
      console.log("Deposit status response:", statusText);
      
      try {
        const statusData = JSON.parse(statusText);
        console.log(`Payment status: ${statusData.status === 1 ? 'PAID' : 'PENDING'}`);
        return statusData;
      } catch (e) {
        console.error("Failed to parse status response:", e);
      }
    } catch (e) {
      console.error("Failed to parse auth response:", e);
    }
    
  } catch (error) {
    console.error("Error verifying HorsePay payment:", error);
  }
}

// Test transaction 3851903
verifyHorsePayPayment('3851903');
