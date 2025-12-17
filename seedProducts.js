require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'tp_products';
const API_URL = 'https://dummyjson.com/products?limit=100';

async function seedDatabase() {
  let client;
  
  try {
    console.log('🌱 Démarrage du seeding...');
    
    console.log('📡 Connexion à MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('✅ Connecté à MongoDB');
    
    console.log('📥 Récupération des produits depuis DummyJSON...');
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }
    
    const data = await response.json();
    const products = data.products;
    console.log(`✅ ${products.length} produits récupérés`);
    
    console.log('🗑️  Suppression de l\'ancienne collection...');
    const collection = db.collection('products');
    await collection.drop().catch(() => {
      console.log('ℹ️  Aucune collection à supprimer (première exécution)');
    });
    
    console.log('💾 Insertion des nouveaux produits...');
    const result = await collection.insertMany(products);
    console.log(`✅ ${result.insertedCount} produits insérés avec succès`);
    
    console.log('🔍 Création des index...');
    await collection.createIndex({ category: 1 });
    await collection.createIndex({ title: 'text', description: 'text' });
    await collection.createIndex({ price: 1 });
    await collection.createIndex({ rating: -1 });
    await collection.createIndex({ brand: 1 });
    console.log('✅ Index créés');
    
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          categories: { $addToSet: '$category' }
        }
      }
    ]).toArray();
    
    if (stats.length > 0) {
      console.log('\n📊 Statistiques:');
      console.log(`   - Total produits: ${stats[0].totalProducts}`);
      console.log(`   - Prix moyen: $${stats[0].avgPrice.toFixed(2)}`);
      console.log(`   - Nombre de catégories: ${stats[0].categories.length}`);
    }
    
    console.log('\n✨ Seeding terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connexion MongoDB fermée');
    }
  }
}

seedDatabase();