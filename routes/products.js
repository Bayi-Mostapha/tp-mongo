const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const collection = req.db.collection('products');

    const {
      page = 1,
      limit = 10,
      category,
      search,
      sort
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = {};
    if (sort) {
      const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      sortOption[sortField] = sortOrder;
    } else {
      sortOption = { _id: 1 };
    }

    const [products, totalCount] = await Promise.all([
      collection
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        limit: limitNum,
        totalItems: totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: {
        category: category || null,
        search: search || null,
        sort: sort || null
      }
    });

  } catch (error) {
    console.error('Erreur GET /api/products:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des produits',
      message: error.message
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const collection = req.db.collection('products');

    const statsByCategory = await collection.aggregate([
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          maxPrice: { $max: '$price' },
          minPrice: { $min: '$price' },
          avgRating: { $avg: '$rating' }
        }
      },
      {
        $sort: { avgPrice: -1 }
      },
      {
        $project: {
          _id: 0,
          categoryName: '$_id',
          totalProducts: 1,
          averagePrice: { $round: ['$avgPrice', 2] },
          maxPrice: 1,
          minPrice: 1,
          averageRating: { $round: ['$avgRating', 2] }
        }
      }
    ]).toArray();

    const topRatedExpensiveProducts = await collection.aggregate([
      {
        $match: {
          price: { $gt: 500 }
        }
      },
      {
        $sort: { rating: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          _id: 0,
          title: 1,
          price: 1,
          rating: 1,
          brand: 1,
          category: 1
        }
      }
    ]).toArray();

    const brandAnalysis = await collection.aggregate([
      {
        $group: {
          _id: '$brand',
          totalStock: { $sum: '$stock' },
          totalValue: {
            $sum: { $multiply: ['$price', '$stock'] }
          },
          productCount: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $sort: { totalValue: -1 }
      },
      {
        $project: {
          _id: 0,
          brandName: '$_id',
          totalStock: 1,
          totalValue: { $round: ['$totalValue', 2] },
          productCount: 1,
          averagePrice: { $round: ['$avgPrice', 2] }
        }
      }
    ]).toArray();

    const globalStats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          maxPrice: { $max: '$price' },
          minPrice: { $min: '$price' },
          totalStock: { $sum: '$stock' },
          avgRating: { $avg: '$rating' }
        }
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          averagePrice: { $round: ['$avgPrice', 2] },
          maxPrice: 1,
          minPrice: 1,
          totalStock: 1,
          averageRating: { $round: ['$avgRating', 2] }
        }
      }
    ]).toArray();

    res.json({
      success: true,
      statistics: {
        global: globalStats[0] || {},
        byCategory: statsByCategory,
        topRatedExpensive: topRatedExpensiveProducts,
        byBrand: brandAnalysis
      }
    });

  } catch (error) {
    console.error('Erreur GET /api/products/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des statistiques',
      message: error.message
    });
  }
});

module.exports = router;