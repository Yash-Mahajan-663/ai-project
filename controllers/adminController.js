const Booking = require('../models/Booking');

/**
 * Get aggregated stats for the admin dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ status: 'booked' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    // Calculate total revenue (price of confirmed bookings)
    const revenueData = await Booking.aggregate([
      { $match: { status: 'booked' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        total: totalBookings,
        pending: pendingBookings,
        booked: confirmedBookings,
        cancelled: cancelledBookings,
        revenue: totalRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get all bookings with optional filtering
 */
const getAllBookings = async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;
    const query = {};
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .sort({ created_at: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getAllBookings
};
