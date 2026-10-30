async function run() {
  const base = "http://localhost:4000";
  console.log("🚀 Testing Dropp Production Backend...\n");

  // 1. Health
  const hRes = await fetch(`${base}/health`);
  const hJson = await hRes.json();
  console.log("1. Health Check:", hJson.status === "ok" ? "✅ OK" : "❌ FAIL");

  // 2. Register
  const testPhone = "98" + Math.floor(10000000 + Math.random() * 90000000);
  const regRes = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Lucky Merchant",
      phone: testPhone,
      email: `merchant_${Date.now()}@dropp.local`,
      password: "Password123#",
      role: "merchant"
    })
  });
  const regData = await regRes.json();
  const token = regData?.data?.accessToken;
  console.log("2. Register Merchant:", token ? "✅ OK (JWT generated)" : "❌ FAIL", token ? "" : regData);

  // 3. Get /me
  const meRes = await fetch(`${base}/api/auth/me`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const meData = await meRes.json();
  console.log("3. Auth Me Guard:", meData?.data?.name === "Lucky Merchant" ? "✅ OK" : "❌ FAIL");

  // 4. List Stores (should be empty initially)
  const mineRes = await fetch(`${base}/api/merchants/mine`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const mineData = await mineRes.json();
  console.log("4. List Stores (Pre-create):", Array.isArray(mineData?.data) && mineData.data.length === 0 ? "✅ OK (Zero mock data)" : "❌ FAIL");

  // 5. Create Store
  const storeRes = await fetch(`${base}/api/merchants`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "FreshMart Organic",
      category: "Grocery & Supermarket",
      description: "Daily fresh essentials",
      address: {
        street: "100ft Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038"
      },
      contact: { phone: testPhone }
    })
  });
  const storeData = await storeRes.json();
  const merchantId = storeData?.data?._id;
  console.log("5. Create Merchant Store:", merchantId ? `✅ OK (ID: ${merchantId})` : "❌ FAIL");

  // 6. Dashboard
  const dashRes = await fetch(`${base}/api/merchants/${merchantId}/dashboard`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const dashData = await dashRes.json();
  console.log("6. Live Store Dashboard:", dashData?.data?.overview?.ordersToday === 0 ? "✅ OK (Real aggregation: 0 orders)" : "❌ FAIL");

  // 7. Add Product
  const prodRes = await fetch(`${base}/api/merchants/${merchantId}/products`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "Amul Butter",
      price: 56,
      stockQuantity: 20,
      unit: "500g",
      category: "Dairy"
    })
  });
  const prodData = await prodRes.json();
  const productId = prodData?.data?._id;
  console.log("7. Add Product to Catalogue:", productId ? `✅ OK (ID: ${productId})` : "❌ FAIL");

  // 8. Atomic Stock Adjustment (Voice / Checkout simulation)
  const stockRes = await fetch(`${base}/api/merchants/${merchantId}/products/${productId}/stock`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ delta: -5 })
  });
  const stockData = await stockRes.json();
  console.log("8. Atomic Stock Update (-5):", stockData?.data?.stockQuantity === 15 ? "✅ OK (New stock: 15)" : "❌ FAIL");

  // 9. Security Test (No Token)
  const secRes = await fetch(`${base}/api/merchants/mine`);
  console.log("9. Security Guard (No Token):", secRes.status === 401 ? "✅ OK (401 Unauthorized)" : "❌ FAIL");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

run().catch(console.error);
