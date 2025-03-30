
// Demo Data Generator for Inventory System
// Run this script once to populate your database with realistic demo data

// Import Firebase directly instead of using the alias
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyDlxdAcy3E3QxrMbc-zmh2krDTcQWe0AV4",
  authDomain: "petpooja-3affd.firebaseapp.com",
  projectId: "petpooja-3affd",
  storageBucket: "petpooja-3affd.firebasestorage.app",
  messagingSenderId: "6302234192",
  appId: "1:6302234192:web:0026b044c082a0bc6a0355"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to generate a random date within a specified range
const randomDate = (start, end) => {
  const startDate = start.getTime();
  const endDate = end.getTime();
  const randomTimestamp = startDate + Math.random() * (endDate - startDate);
  const date = new Date(randomTimestamp);
  
  // Format as DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// Function to generate a unique sequential ID with prefix
const generateID = (prefix, index) => {
  return `${prefix}${String(index + 1).padStart(4, '0')}`;
};

// Realistic market prices for each material (in INR)
const marketPrices = {
  vine: {
    'Red Grape': { base: 250, variance: 50 },         // ₹250-300 per kg
    'White Grape': { base: 280, variance: 60 },       // ₹280-340 per kg
    'Green Grape': { base: 210, variance: 40 },       // ₹210-250 per kg
    'Wine Vinegar': { base: 320, variance: 80 },      // ₹320-400 per bottle
    'Balsamic Vinegar': { base: 450, variance: 120 }, // ₹450-570 per bottle
  },
  chapati: {
    'Whole Wheat Flour': { base: 60, variance: 15 },     // ₹60-75 per kg
    'All-Purpose Flour': { base: 48, variance: 12 },     // ₹48-60 per kg
    'Multigrain Flour': { base: 90, variance: 20 },      // ₹90-110 per kg
    'Ragi Flour': { base: 110, variance: 25 },           // ₹110-135 per kg
    'Jowar Flour': { base: 85, variance: 18 },           // ₹85-103 per kg
  },
  pizza: {
    'Pizza Dough': { base: 120, variance: 30 },          // ₹120-150 per kg
    'Tomato Sauce': { base: 175, variance: 35 },         // ₹175-210 per jar
    'Mozzarella Cheese': { base: 420, variance: 80 },    // ₹420-500 per kg
    'Pepperoni': { base: 350, variance: 70 },            // ₹350-420 per pack
    'Bell Peppers': { base: 80, variance: 25 },          // ₹80-105 per kg
    'Mushrooms': { base: 150, variance: 40 },            // ₹150-190 per kg
    'Olives': { base: 220, variance: 50 },               // ₹220-270 per jar
  }
};

// Function to generate a random price based on market rates
const generatePrice = (materialType, material) => {
  const priceInfo = marketPrices[materialType][material];
  return priceInfo.base + Math.random() * priceInfo.variance;
};

// Function to generate a random quantity
const generateQuantity = (materialType) => {
  // Different quantity ranges based on material type
  switch (materialType) {
    case 'vine':
      return Math.floor(Math.random() * 30) + 5; // 5-35 units for vine products
    case 'chapati':
      return Math.floor(Math.random() * 50) + 10; // 10-60 units for chapati products
    case 'pizza':
      return Math.floor(Math.random() * 40) + 5; // 5-45 units for pizza products
    default:
      return Math.floor(Math.random() * 20) + 5; // 5-25 units default
  }
};

// Function to populate demo data
const populateDemoData = async () => {
  console.log('Starting to generate demo inventory data...');
  
  // Current date
  const now = new Date();
  
  // Arrays to store the counts for each material type
  let vineCount = 0;
  let chapatiCount = 0;
  let pizzaCount = 0;
  
  // Distribution: ~35 vine products, ~30 chapati products, ~35 pizza products
  const demoProducts = [];
  
  // Generate vine products with manufacturing dates (not expiry)
  for (let i = 0; i < 35; i++) {
    const material = Object.keys(marketPrices.vine)[Math.floor(Math.random() * Object.keys(marketPrices.vine).length)];
    const manufacturingDate = randomDate(new Date(now.getFullYear() - 5, 0, 1), now);
    
    demoProducts.push({
      materialType: 'vine',
      material,
      name: material,
      manufacturingDate,
      uid: generateID('V', vineCount),
      quantity: generateQuantity('vine'),
      price: generatePrice('vine', material).toFixed(2),
      createdAt: new Date()
    });
    
    vineCount++;
  }
  
  // Generate chapati products with expiry dates
  for (let i = 0; i < 30; i++) {
    const material = Object.keys(marketPrices.chapati)[Math.floor(Math.random() * Object.keys(marketPrices.chapati).length)];
    
    // Expiry dates: some expired, some expiring soon, some with plenty of time
    let expiryDate;
    const randomFactor = Math.random();
    
    if (randomFactor < 0.15) {
      // 15% of chapati products are expired
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - Math.floor(Math.random() * 30) - 1); // 1-30 days expired
      expiryDate = randomDate(pastDate, pastDate);
    } else if (randomFactor < 0.35) {
      // 20% expiring soon (within 30 days)
      const soonDate = new Date();
      soonDate.setDate(now.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 days until expiry
      expiryDate = randomDate(now, soonDate);
    } else {
      // 65% with longer expiry dates (1-10 months)
      const futureDate = new Date();
      futureDate.setMonth(now.getMonth() + Math.floor(Math.random() * 10) + 1); // 1-10 months until expiry
      expiryDate = randomDate(now, futureDate);
    }
    
    demoProducts.push({
      materialType: 'chapati',
      material,
      name: material,
      expiryDate,
      uid: generateID('C', chapatiCount),
      quantity: generateQuantity('chapati'),
      price: generatePrice('chapati', material).toFixed(2),
      createdAt: new Date()
    });
    
    chapatiCount++;
  }
  
  // Generate pizza products with expiry dates
  for (let i = 0; i < 35; i++) {
    const material = Object.keys(marketPrices.pizza)[Math.floor(Math.random() * Object.keys(marketPrices.pizza).length)];
    
    // Expiry dates: some expired, some expiring soon, some with plenty of time
    let expiryDate;
    const randomFactor = Math.random();
    
    if (randomFactor < 0.1) {
      // 10% of pizza products are expired
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - Math.floor(Math.random() * 14) - 1); // 1-14 days expired
      expiryDate = randomDate(pastDate, pastDate);
    } else if (randomFactor < 0.4) {
      // 30% expiring soon (within 14 days)
      const soonDate = new Date();
      soonDate.setDate(now.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days until expiry
      expiryDate = randomDate(now, soonDate);
    } else {
      // 60% with longer expiry dates (2 weeks to 6 months)
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + 14 + Math.floor(Math.random() * 166)); // 14-180 days until expiry
      expiryDate = randomDate(now, futureDate);
    }
    
    demoProducts.push({
      materialType: 'pizza',
      material,
      name: material,
      expiryDate,
      uid: generateID('P', pizzaCount),
      quantity: generateQuantity('pizza'),
      price: generatePrice('pizza', material).toFixed(2),
      createdAt: new Date()
    });
    
    pizzaCount++;
  }
  
  // Shuffle the array to mix up the entry order
  demoProducts.sort(() => Math.random() - 0.5);
  
  // Add to Firestore database
  try {
    for (const product of demoProducts) {
      await addDoc(collection(db, 'inventory'), product);
      console.log(`Added: ${product.uid} - ${product.name}`);
    }
    
    console.log('Successfully added 100 demo products to the inventory database!');
    console.log(`Summary: ${vineCount} vine products, ${chapatiCount} chapati products, ${pizzaCount} pizza products`);
  } catch (error) {
    console.error('Error adding demo data:', error);
  }
};

// Execute the function to populate demo data
populateDemoData();