const Booking = require('../models/Booking');
const Session = require('../models/Session');
const Waitlist = require('../models/Waitlist');

// Executive Overview Stats
exports.getStats = async (req, res) => {
  try {
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'booked' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayBookings = await Booking.countDocuments({
      status: 'booked',
      created_at: { $gte: todayStart, $lte: todayEnd }
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const newClients = await Booking.distinct('phone', {
      created_at: { $gte: weekStart }
    });

    const pendingInquiries = await Session.countDocuments({
      stage: { $ne: 'IDLE' }
    });

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        todayBookings,
        newClients: newClients.length,
        pendingInquiries
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// All Bookings for Calendar and Feed
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ created_at: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Client Vault
exports.getClients = async (req, res) => {
  try {
    const clients = await Booking.aggregate([
      {
        $group: {
          _id: '$phone',
          name: { $first: '$name' },
          totalSpend: { $sum: '$price' },
          lastVisit: { $max: '$created_at' },
          bookingCount: { $sum: 1 },
          visits: {
            $push: {
              date: '$date',
              time: '$time',
              service: '$service',
              price: '$price',
              status: '$status',
              created_at: '$created_at'
            }
          }
        }
      },
      { $sort: { lastVisit: -1 } }
    ]);
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Revenue Analytics (Weekly)
exports.getRevenueData = async (req, res) => {
  try {
    const revenueData = await Booking.aggregate([
      { $match: { status: 'booked' } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          revenue: { $sum: "$price" }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);
    res.status(200).json({ success: true, data: revenueData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Live Inquiries (Active Sessions)
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await Session.find({ stage: { $ne: 'IDLE' } })
      .populate('draft_booking_id')
      .sort({ updated_at: -1 });
    res.status(200).json({ success: true, data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
