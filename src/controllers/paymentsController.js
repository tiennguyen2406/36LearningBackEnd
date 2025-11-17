import PayOS from "@payos/node";
import Payment from "../models/Payment.js";
import Course from "../models/Course.js";
import User from "../models/User.js";

// Khởi tạo PayOS với credentials từ env
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

// Tạo link thanh toán cho khóa học
export const createPaymentLink = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ error: "Missing userId or courseId" });
    }

    // Kiểm tra user tồn tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Kiểm tra course tồn tại
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Kiểm tra user đã enroll chưa
    const enrolledCourses = Array.isArray(user.enrolledCourses)
      ? user.enrolledCourses.map((id) => id.toString())
      : [];

    if (enrolledCourses.includes(courseId)) {
      return res.status(400).json({ error: "Bạn đã tham gia khóa học này rồi" });
    }

    // Kiểm tra khóa học có phải miễn phí không
    if (!course.price || course.price <= 0) {
      return res.status(400).json({ 
        error: "Khóa học này miễn phí, không cần thanh toán",
        isFree: true 
      });
    }

    // Tạo mã đơn hàng unique
    const orderCode = Date.now();

    // Tạo payment record
    const payment = await Payment.create({
      userId,
      courseId,
      amount: course.price,
      orderCode: orderCode.toString(),
      status: "pending",
    });

    // Tạo link thanh toán với PayOS
    const paymentData = {
      orderCode: orderCode,
      amount: course.price,
      description: `Thanh toan khoa hoc: ${course.title}`,
      returnUrl: `${process.env.FRONTEND_URL || "exp://localhost:8081"}/payment-success`,
      cancelUrl: `${process.env.FRONTEND_URL || "exp://localhost:8081"}/payment-cancel`,
      items: [
        {
          name: course.title,
          quantity: 1,
          price: course.price,
        },
      ],
    };

    const paymentLinkResponse = await payos.createPaymentLink(paymentData);

    // Cập nhật payment với URL
    payment.paymentUrl = paymentLinkResponse.checkoutUrl;
    payment.metadata = {
      checkoutUrl: paymentLinkResponse.checkoutUrl,
      qrCode: paymentLinkResponse.qrCode,
    };
    await payment.save();

    res.status(201).json({
      message: "Payment link created",
      paymentId: payment._id.toString(),
      checkoutUrl: paymentLinkResponse.checkoutUrl,
      qrCode: paymentLinkResponse.qrCode,
      orderCode: orderCode,
    });
  } catch (error) {
    console.error("Create payment link error:", error);
    res.status(500).json({ error: "Something went wrong", details: error.message });
  }
};

// Webhook để nhận thông báo thanh toán từ PayOS
export const handlePaymentWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    console.log("Received webhook from PayOS:", webhookData);

    // Xác thực webhook signature (nếu PayOS cung cấp)
    // TODO: Thêm logic xác thực webhook nếu cần

    const { orderCode, code, desc, data } = webhookData;

    if (!orderCode) {
      return res.status(400).json({ error: "Missing orderCode" });
    }

    // Tìm payment record
    const payment = await Payment.findOne({ orderCode: orderCode.toString() });
    if (!payment) {
      console.log(`Payment not found for orderCode: ${orderCode}`);
      return res.status(404).json({ error: "Payment not found" });
    }

    // Cập nhật trạng thái payment
    if (code === "00" || code === 0) {
      // Thanh toán thành công
      payment.status = "completed";
      payment.transactionId = data?.transactionId || data?.id || "";
      payment.metadata = { ...payment.metadata, webhookData };
      await payment.save();

      // Tự động enroll user vào khóa học
      const user = await User.findById(payment.userId);
      if (user) {
        const enrolledCourses = Array.isArray(user.enrolledCourses)
          ? user.enrolledCourses.map((id) => id.toString())
          : [];

        if (!enrolledCourses.includes(payment.courseId.toString())) {
          user.enrolledCourses.push(payment.courseId);
          await user.save();
          console.log(`User ${user.username} enrolled in course ${payment.courseId}`);
        }
      }

      // Tăng số lượng học viên của khóa học
      await Course.findByIdAndUpdate(payment.courseId, {
        $inc: { students: 1 },
      });

      console.log(`Payment ${payment._id} completed successfully`);
    } else {
      // Thanh toán thất bại hoặc bị hủy
      payment.status = desc?.toLowerCase().includes("cancel") ? "cancelled" : "failed";
      payment.metadata = { ...payment.metadata, webhookData };
      await payment.save();
      console.log(`Payment ${payment._id} ${payment.status}`);
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Handle webhook error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Kiểm tra trạng thái thanh toán
export const checkPaymentStatus = async (req, res) => {
  try {
    const { orderCode } = req.params;

    if (!orderCode) {
      return res.status(400).json({ error: "Missing orderCode" });
    }

    const payment = await Payment.findOne({ orderCode })
      .populate("courseId", "title imageUrl")
      .populate("userId", "username email");

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Có thể gọi API PayOS để kiểm tra trạng thái thực tế
    try {
      const paymentInfo = await payos.getPaymentLinkInformation(orderCode);
      
      // Cập nhật trạng thái nếu khác
      if (paymentInfo.status === "PAID" && payment.status !== "completed") {
        payment.status = "completed";
        payment.transactionId = paymentInfo.transactionId || "";
        await payment.save();

        // Auto enroll nếu chưa
        const user = await User.findById(payment.userId);
        if (user) {
          const enrolledCourses = Array.isArray(user.enrolledCourses)
            ? user.enrolledCourses.map((id) => id.toString())
            : [];

          if (!enrolledCourses.includes(payment.courseId.toString())) {
            user.enrolledCourses.push(payment.courseId);
            await user.save();
          }
        }

        // Tăng students count
        await Course.findByIdAndUpdate(payment.courseId, {
          $inc: { students: 1 },
        });
      } else if (paymentInfo.status === "CANCELLED" && payment.status === "pending") {
        payment.status = "cancelled";
        await payment.save();
      }
    } catch (payosError) {
      console.log("Error fetching from PayOS:", payosError.message);
      // Không throw error, vẫn trả về payment từ DB
    }

    const paymentObj = payment.toObject();
    res.status(200).json({
      id: paymentObj._id.toString(),
      ...paymentObj,
      _id: undefined,
      userId: payment.userId?._id.toString(),
      courseId: payment.courseId?._id.toString(),
      course: payment.courseId,
      user: payment.userId,
    });
  } catch (error) {
    console.error("Check payment status error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Lấy lịch sử thanh toán của user
export const getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const payments = await Payment.find({ userId })
      .populate("courseId", "title imageUrl price")
      .sort({ createdAt: -1 });

    const paymentsData = payments.map((payment) => {
      const paymentObj = payment.toObject();
      return {
        id: paymentObj._id.toString(),
        ...paymentObj,
        _id: undefined,
        courseId: payment.courseId?._id.toString(),
        course: payment.courseId,
      };
    });

    res.status(200).json(paymentsData);
  } catch (error) {
    console.error("Get user payments error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Hủy payment
export const cancelPayment = async (req, res) => {
  try {
    const { orderCode } = req.params;

    if (!orderCode) {
      return res.status(400).json({ error: "Missing orderCode" });
    }

    const payment = await Payment.findOne({ orderCode });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({ 
        error: `Cannot cancel payment with status: ${payment.status}` 
      });
    }

    // Gọi API PayOS để hủy payment link
    try {
      await payos.cancelPaymentLink(orderCode);
    } catch (payosError) {
      console.log("Error cancelling PayOS link:", payosError.message);
      // Vẫn tiếp tục cập nhật DB
    }

    payment.status = "cancelled";
    await payment.save();

    res.status(200).json({ message: "Payment cancelled" });
  } catch (error) {
    console.error("Cancel payment error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

