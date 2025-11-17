import express from "express";
import {
  createPaymentLink,
  handlePaymentWebhook,
  checkPaymentStatus,
  getUserPayments,
  cancelPayment,
} from "../controllers/paymentsController.js";

const router = express.Router();

// POST /payments/create - Tạo link thanh toán
router.post("/create", createPaymentLink);

// GET /payments/webhook - Test endpoint để PayOS kiểm tra webhook URL
router.get("/webhook", (req, res) => {
  res.status(200).json({ 
    message: "Webhook endpoint is active and ready to receive POST requests",
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// POST /payments/webhook - Webhook từ PayOS
router.post("/webhook", handlePaymentWebhook);

// GET /payments/status/:orderCode - Kiểm tra trạng thái thanh toán
router.get("/status/:orderCode", checkPaymentStatus);

// GET /payments/user/:userId - Lấy lịch sử thanh toán của user
router.get("/user/:userId", getUserPayments);

// POST /payments/cancel/:orderCode - Hủy thanh toán
router.post("/cancel/:orderCode", cancelPayment);

export default router;

