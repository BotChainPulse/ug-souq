import { getDb } from "../api/queries/connection";
import { sellers, products, restaurants, menuItems } from "./schema";

export async function runSeed() {
  const db = getDb();
  console.log("Seeding database...");

  const sellerRows = await db.insert(sellers).values([
    { shopName: "Phone Planet UG", ownerName: "Brian Ssemakula", phone: "0701000001", idType: "National ID", district: "Kampala", landmark: "Kampala Road, Shop 14", payoutMethod: "MTN MoMo", payoutNumber: "0701000001", verified: true, rating: 46, status: "approved" },
    { shopName: "Kampala Phones Hub", ownerName: "Grace Namono", phone: "0701000002", idType: "National ID", district: "Kampala", landmark: "Owino Market, Stall B12", payoutMethod: "Airtel Money", payoutNumber: "0701000002", verified: true, rating: 47, status: "approved" },
    { shopName: "Hisense Uganda Official", ownerName: "David Okello", phone: "0701000003", idType: "National ID", district: "Kampala", landmark: "Nakasero Market Road", tin: "1002345678", payoutMethod: "MTN MoMo", payoutNumber: "0701000003", verified: true, rating: 45, status: "approved" },
    { shopName: "SoundWave Electronics", ownerName: "Sarah Achieng", phone: "0701000004", idType: "National ID", district: "Wakiso", landmark: "Kira Town Centre", payoutMethod: "MTN MoMo", payoutNumber: "0701000004", verified: true, rating: 44, status: "approved" },
    { shopName: "Nalongo Styles", ownerName: "Nalongo Maria", phone: "0701000005", idType: "National ID", district: "Kampala", landmark: "Nakawa Market", payoutMethod: "Airtel Money", payoutNumber: "0701000005", verified: true, rating: 48, status: "approved" },
    { shopName: "Kicks KLA", ownerName: "Peter Mugisha", phone: "0701000006", idType: "National ID", district: "Kampala", landmark: "William Street", payoutMethod: "MTN MoMo", payoutNumber: "0701000006", verified: true, rating: 45, status: "approved" },
    { shopName: "HomeEase Appliances", ownerName: "John Kato", phone: "0701000007", district: "Mukono", landmark: "Mukono Town", payoutMethod: "MTN MoMo", payoutNumber: "0701000007", verified: false, rating: 43, status: "pending" },
    { shopName: "Mityana Farm Cooperative", ownerName: "Rose Nansubuga", phone: "0701000008", idType: "National ID", district: "Other", landmark: "Mityana Farms", payoutMethod: "Airtel Money", payoutNumber: "0701000008", verified: true, rating: 49, status: "approved" },
  ]).$returningId();

  const [pp, kph, hisense, soundwave, nalongo, kicks, homeease, mityana] = sellerRows.map((r) => r.id);

  await db.insert(products).values([
    { sellerId: pp, name: "Tecno Spark 20 Pro, 8GB RAM + 256GB, 108MP Camera", slug: "tecno-spark-20", category: "phones", price: 429000, oldPrice: 649000, image: "/images/phone-tecno.jpg", stock: 7, flashSale: true },
    { sellerId: kph, name: "Samsung Galaxy A15, 6GB + 128GB Dual SIM", slug: "samsung-a15", category: "phones", price: 565000, oldPrice: 720000, image: "/images/phone-samsung.jpg", stock: 12, flashSale: true },
    { sellerId: hisense, name: "Hisense 43\" Smart Full HD TV with Free-to-Air Decoder", slug: "hisense-43-tv", category: "electronics", price: 850000, oldPrice: 1150000, image: "/images/tv.jpg", stock: 5, flashSale: true },
    { sellerId: soundwave, name: "BassPro Wireless Over-Ear Headphones, 40h Battery", slug: "wireless-headphones", category: "electronics", price: 145000, oldPrice: 220000, image: "/images/headphones.jpg", stock: 18, flashSale: true },
    { sellerId: nalongo, name: "Elegant Ankara Print Dress, Bold Orange & Teal (S–XL)", slug: "ankara-dress", category: "womens-fashion", price: 95000, oldPrice: 140000, image: "/images/dress.jpg", stock: 9, flashSale: true },
    { sellerId: kicks, name: "StrideFlex Running Sneakers, White/Orange (Unisex)", slug: "running-sneakers", category: "sports", price: 120000, oldPrice: 185000, image: "/images/sneakers.jpg", stock: 14, flashSale: true },
    { sellerId: homeease, name: "VitaMix-style 2L Kitchen Blender, Stainless Steel, 500W", slug: "kitchen-blender", category: "home", price: 165000, oldPrice: 240000, image: "/images/blender.jpg", stock: 11, flashSale: true },
    { sellerId: mityana, name: "Fresh Green Matooke Bunch — Direct from Mityana Farms", slug: "green-matooke", category: "agriculture", price: 18000, oldPrice: null, image: "/images/matooke.jpg", stock: 30, flashSale: true },
    { sellerId: kph, name: "Refurbished iPhone 11, 64GB — Grade A, 6-Month Warranty", slug: "refurb-iphone-11", category: "refurbished", price: 780000, oldPrice: 950000, image: "/images/phone-tecno.jpg", stock: 4, condition: "refurbished", warrantyMonths: 6, flashSale: false },
  ]);

  const restoRows = await db.insert(restaurants).values([
    { name: "KFC Kampala", slug: "kfc-kampala", cuisine: "Fried Chicken · Burgers", area: "Kampala Road", deliveryMins: 30, deliveryFee: 4000, minOrder: 15000, rating: 46, image: "/images/food/kfc.jpg", featured: true },
    { name: "Chicken Tonight", slug: "chicken-tonight", cuisine: "Grilled & Fried Chicken", area: "Kisementi", deliveryMins: 35, deliveryFee: 3000, minOrder: 12000, rating: 45, image: "/images/food/chicken-tonight.jpg", featured: true },
    { name: "Cafe Javas", slug: "cafe-javas", cuisine: "Continental · Breakfast", area: "Oasis Mall", deliveryMins: 40, deliveryFee: 5000, minOrder: 20000, rating: 47, image: "/images/food/cafe-javas.jpg" },
    { name: "Mama's Local Kitchen", slug: "mamas-kitchen", cuisine: "Luwombo · Local Dishes", area: "Nakulabye", deliveryMins: 45, deliveryFee: 2500, minOrder: 8000, rating: 48, image: "/images/food/local-kitchen.jpg", featured: true },
    { name: "Chips & Chicken Express", slug: "chips-chicken-express", cuisine: "Chips · Chicken · Rolex", area: "Wandegeya", deliveryMins: 25, deliveryFee: 2000, minOrder: 6000, rating: 44, image: "/images/food/chips-chicken.jpg", featured: true },
    { name: "Rolex Guy Kikoni", slug: "rolex-guy", cuisine: "Rolex · Street Food", area: "Kikoni", deliveryMins: 20, deliveryFee: 1500, minOrder: 4000, rating: 46, image: "/images/food/rolex.jpg" },
  ]).$returningId();

  const [kfc, ct, cj, mama, chips, rolex] = restoRows.map((r) => r.id);

  await db.insert(menuItems).values([
    // KFC
    { restaurantId: kfc, name: "Streetwise Two", description: "2 pieces of chicken + chips", price: 15000, popular: true },
    { restaurantId: kfc, name: "Zinger Burger", description: "Spicy fillet burger with fries", price: 18000, popular: true },
    { restaurantId: kfc, name: "6pc Bucket", description: "Six pieces of original recipe chicken", price: 42000 },
    { restaurantId: kfc, name: "Twister Wrap", description: "Chicken strip wrap + drink", price: 14000 },
    // Chicken Tonight
    { restaurantId: ct, name: "Full Chicken (Grilled)", description: "Whole grilled chicken, serves 2–3", price: 35000, popular: true },
    { restaurantId: ct, name: "Quarter Chicken + Chips", description: "Fried quarter chicken with chips", price: 16000, popular: true },
    { restaurantId: ct, name: "Chicken Wings (8pc)", description: "Crispy wings with sauce", price: 18000 },
    { restaurantId: ct, name: "Chicken Burger Meal", description: "Burger + chips + soda", price: 17000 },
    // Cafe Javas
    { restaurantId: cj, name: "Full English Breakfast", description: "Eggs, sausage, bacon, toast", price: 28000, popular: true },
    { restaurantId: cj, name: "Chicken Alfredo Pasta", description: "Creamy pasta with grilled chicken", price: 32000 },
    { restaurantId: cj, name: "Beef Burger Deluxe", description: "Double beef patty, cheese, fries", price: 26000 },
    // Mama's Local Kitchen
    { restaurantId: mama, name: "Luwombo (Chicken)", description: "Chicken steamed in banana leaves + matooke", price: 15000, popular: true },
    { restaurantId: mama, name: "Matooke & Gnut Sauce", description: "Steamed matooke with groundnut sauce", price: 10000, popular: true },
    { restaurantId: mama, name: "Katogo Special", description: "Matooke & beef offals katogo", price: 9000 },
    { restaurantId: mama, name: "Posho & Beans", description: "Posho with beans and greens", price: 7000 },
    // Chips & Chicken Express
    { restaurantId: chips, name: "Chips & ¼ Chicken", description: "Crispy chips with quarter fried chicken", price: 12000, popular: true },
    { restaurantId: chips, name: "Chips Masala", description: "Spiced chips masala style", price: 7000 },
    { restaurantId: chips, name: "Rolex (2 Eggs)", description: "Chapati rolled with eggs & veg", price: 4000, popular: true },
    { restaurantId: chips, name: "Chicken + Rolex Combo", description: "Quarter chicken with a rolex", price: 14000 },
    // Rolex Guy
    { restaurantId: rolex, name: "Classic Rolex", description: "Chapati + 2 eggs + tomatoes & onions", price: 3500, popular: true },
    { restaurantId: rolex, name: "Rolex with Avocado", description: "Classic rolex with fresh avocado", price: 5000 },
    { restaurantId: rolex, name: "Kikomando", description: "Chapati pieces with beans", price: 3000 },
  ]);

  console.log("Done.");
}

// CLI usage: RUN_SEED=1 node seed.js
if (process.env.RUN_SEED === "1") {
  runSeed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
