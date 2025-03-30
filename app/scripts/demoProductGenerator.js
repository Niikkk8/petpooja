// Demo Data Generator for Inventory System
// Run this script once to populate your database with realistic demo data

// Import Firebase directly instead of using the alias
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  runTransaction 
} from 'firebase/firestore';

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

// Improved function to generate a unique ID using Firebase transactions
const generateUniqueId = async (prefix) => {
  try {
    // Use a transaction to ensure atomic counter updates
    return await runTransaction(db, async (transaction) => {
      // Reference to the counters document
      const counterRef = doc(db, 'counters', 'inventory');
      const counterDoc = await transaction.get(counterRef);
      
      let counters = {};
      
      // Initialize or get existing counters
      if (!counterDoc.exists()) {
        // Initialize counters if document doesn't exist
        counters = {
          V: 1, // Vine
          C: 1, // Chapati
          P: 1, // Pizza
          I: 1  // Generic/Other
        };
        
        // Create the counters document
        transaction.set(counterRef, counters);
      } else {
        counters = counterDoc.data();
        
        // Ensure the counter for this prefix exists
        if (!counters[prefix]) {
          counters[prefix] = 1;
        } else {
          // Increment the specific counter
          counters[prefix]++;
        }
        
        // Update counters in the document
        transaction.update(counterRef, counters);
      }
      
      // Format the ID with padded zeros
      const paddedNumber = String(counters[prefix]).padStart(4, '0');
      return `${prefix}${paddedNumber}`;
    });
  } catch (error) {
    console.error(`Error generating unique ID for prefix ${prefix}:`, error);
    
    // Fallback to timestamp-based ID if transaction fails
    const timestamp = new Date().getTime();
    return `${prefix}${timestamp.toString().slice(-6)}`;
  }
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

// Helper function to calculate age-related properties for vine products
const processVineProduct = (manufacturingDate) => {
  const parts = manufacturingDate.split('/');
  if (parts.length !== 3) return { ageInMonths: null };

  const mfgDate = new Date(parts[2], parts[1] - 1, parts[0]);
  const today = new Date();

  // Calculate months difference
  const ageInMonths = (today.getFullYear() - mfgDate.getFullYear()) * 12 +
    (today.getMonth() - mfgDate.getMonth());

  // Get classification based on age
  let classification = { label: 'Unknown', bg: 'bg-gray-100', text: 'text-gray-600', value: 'unknown' };

  if (ageInMonths < 6) {
    classification = { label: 'New', bg: 'bg-green-50', text: 'text-green-600', value: 'new' };
  } else if (ageInMonths < 12) {
    classification = { label: 'Young', bg: 'bg-blue-50', text: 'text-blue-600', value: 'young' };
  } else if (ageInMonths < 24) {
    classification = { label: 'Mature', bg: 'bg-purple-50', text: 'text-purple-600', value: 'mature' };
  } else if (ageInMonths < 60) {
    classification = { label: 'Aged', bg: 'bg-amber-50', text: 'text-amber-600', value: 'aged' };
  } else {
    classification = { label: 'Vintage', bg: 'bg-red-50', text: 'text-red-600', value: 'vintage' };
  }

  return {
    ageInMonths,
    ageClassification: classification,
    expiryStatus: { bg: classification.bg, text: classification.text },
    expiryText: `${classification.label} (${ageInMonths} months)`
  };
};

// Helper function to calculate expiry-related properties for non-vine products
const processExpiryProduct = (expiryDateStr) => {
  const parts = expiryDateStr.split('/');
  if (parts.length !== 3) return { daysUntilExpiry: null };

  const expiryDate = new Date(parts[2], parts[1] - 1, parts[0]);
  const today = new Date();

  // Reset time part for accurate day calculation
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  // Calculate days difference
  const diffTime = expiryDate - today;
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Get status color
  let expiryStatus = { bg: 'bg-gray-100', text: 'text-gray-600' };

  if (daysUntilExpiry < 0) {
    expiryStatus = { bg: 'bg-red-100', text: 'text-red-800' }; // Expired
  } else if (daysUntilExpiry <= 7) {
    expiryStatus = { bg: 'bg-red-50', text: 'text-red-600' }; // Critical (less than a week)
  } else if (daysUntilExpiry <= 30) {
    expiryStatus = { bg: 'bg-yellow-50', text: 'text-yellow-700' }; // Warning (less than a month)
  } else if (daysUntilExpiry <= 90) {
    expiryStatus = { bg: 'bg-blue-50', text: 'text-blue-600' }; // Attention (less than 3 months)
  } else {
    expiryStatus = { bg: 'bg-green-50', text: 'text-green-600' }; // Good (more than 3 months)
  }

  // Get status text
  let expiryText = 'Unknown';

  if (daysUntilExpiry < 0) {
    expiryText = `Expired ${Math.abs(daysUntilExpiry)} days ago`;
  } else if (daysUntilExpiry === 0) {
    expiryText = 'Expires today';
  } else if (daysUntilExpiry === 1) {
    expiryText = 'Expires tomorrow';
  } else {
    expiryText = `Expires in ${daysUntilExpiry} days`;
  }

  return {
    daysUntilExpiry,
    expiryStatus,
    expiryText
  };
};

// Function to populate demo data
const populateDemoData = async () => {
  console.log('Starting to generate demo inventory data...');
  
  // Current date
  const now = new Date();

  // Ensure we have a counters document to start with
  try {
    const counterRef = doc(db, 'counters', 'inventory');
    const counterDoc = await getDoc(counterRef);
    
    if (!counterDoc.exists()) {
      // Initialize counters document if it doesn't exist
      await setDoc(counterRef, {
        V: 0,  // Vine
        C: 0,  // Chapati
        P: 0   // Pizza
      });
      console.log('Created counters document with initial values');
    }
  } catch (error) {
    console.error('Error initializing counters:', error);
  }
  
  // Arrays to track counts for each material type
  let vineCount = 0;
  let chapatiCount = 0;
  let pizzaCount = 0;
  
  // Distribution: ~35 vine products, ~30 chapati products, ~35 pizza products
  const demoProducts = [];
  
  // Generate vine products with manufacturing dates (not expiry)
  console.log('Generating vine products...');
  for (let i = 0; i < 35; i++) {
    const material = Object.keys(marketPrices.vine)[Math.floor(Math.random() * Object.keys(marketPrices.vine).length)];
    const manufacturingDate = randomDate(new Date(now.getFullYear() - 5, 0, 1), now);
    
    // Generate UID using the transaction-based approach
    const uid = await generateUniqueId('V');
    
    // Process age-related properties
    const vineProperties = processVineProduct(manufacturingDate);
    
    demoProducts.push({
      materialType: 'vine',
      material,
      name: material,
      manufacturingDate,
      uid,
      quantity: generateQuantity('vine'),
      price: generatePrice('vine', material).toFixed(2),
      createdAt: new Date(),
      // Add age-related properties
      ...vineProperties,
      // Set other properties to null for vine products
      expiryDate: null,
      daysUntilExpiry: null
    });
    
    vineCount++;
    console.log(`Generated vine product ${i+1}/35: ${uid} - ${material}`);
  }
  
  // Generate chapati products with expiry dates
  console.log('Generating chapati products...');
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
    
    // Generate UID using the transaction-based approach
    const uid = await generateUniqueId('C');
    
    // Process expiry-related properties
    const expiryProperties = processExpiryProduct(expiryDate);
    
    demoProducts.push({
      materialType: 'chapati',
      material,
      name: material,
      expiryDate,
      uid,
      quantity: generateQuantity('chapati'),
      price: generatePrice('chapati', material).toFixed(2),
      createdAt: new Date(),
      // Add expiry-related properties
      ...expiryProperties,
      // Set vine-specific properties to null
      manufacturingDate: null,
      ageInMonths: null,
      ageClassification: null
    });
    
    chapatiCount++;
    console.log(`Generated chapati product ${i+1}/30: ${uid} - ${material}`);
  }
  
  // Generate pizza products with expiry dates
  console.log('Generating pizza products...');
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
    
    // Generate UID using the transaction-based approach
    const uid = await generateUniqueId('P');
    
    // Process expiry-related properties
    const expiryProperties = processExpiryProduct(expiryDate);
    
    demoProducts.push({
      materialType: 'pizza',
      material,
      name: material,
      expiryDate,
      uid,
      quantity: generateQuantity('pizza'),
      price: generatePrice('pizza', material).toFixed(2),
      createdAt: new Date(),
      // Add expiry-related properties
      ...expiryProperties,
      // Set vine-specific properties to null
      manufacturingDate: null,
      ageInMonths: null,
      ageClassification: null
    });
    
    pizzaCount++;
    console.log(`Generated pizza product ${i+1}/35: ${uid} - ${material}`);
  }
  
  // Shuffle the array to mix up the entry order
  demoProducts.sort(() => Math.random() - 0.5);
  
  // Add to Firestore database
  console.log('Adding products to Firestore...');
  try {
    let addedCount = 0;
    for (const product of demoProducts) {
      await addDoc(collection(db, 'inventory'), product);
      addedCount++;
      
      if (addedCount % 10 === 0) {
        console.log(`Progress: ${addedCount}/${demoProducts.length} items added`);
      }
    }
    
    console.log('Successfully added demo products to the inventory database!');
    console.log(`Summary: ${vineCount} vine products, ${chapatiCount} chapati products, ${pizzaCount} pizza products`);
    console.log(`Total: ${demoProducts.length} products added`);
  } catch (error) {
    console.error('Error adding demo data:', error);
  }
};

// Execute the function to populate demo data
populateDemoData();