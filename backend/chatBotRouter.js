const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Replace with your actual key

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", 
  systemInstruction: "You are an expert in hydraulic systems. You answer questions on components and maintenance. Speak concisely and do not use any markdown formatting like bold, italics, or lists.", 
});

router.post("/", async (req, res) => {
  console.log("📨 Chatbot request received");
  console.log("Body:", req.body);
  
  try {
    if (!req.body || !req.body.message) {
      return res.status(400).json({ 
        error: "Message is required",
        receivedBody: req.body
      });
    }

    const userMessage = req.body.message;
    console.log("💬 Processing:", userMessage);

    // ✅ Don't pass systemInstruction to startChat
    const chat = model.startChat({
      history: [], // Optional: you can add conversation history here
    });

    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    console.log("✅ Success! Reply:", reply.substring(0, 100) + "...");
    res.json({ reply });

  } catch (error) {
    console.error("🔥 Error:", error.message);
    res.status(500).json({ 
      error: error?.message || "Failed to process request"
    });
  }
});

module.exports = router;