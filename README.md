# 🥬 Vegetable Detection (Deteksi Sayuran)

An interactive, AI-powered web application that identifies and classifies various types of vegetables using a machine learning model directly in the browser. 

This project demonstrates the integration of Machine Learning models into a frontend web environment, utilizing WebAssembly (WASM) for high-performance, real-time inference without relying on a backend server.

🔗 **Live Demo:** [https://deteksi-sayur.netlify.app/](https://deteksi-sayur.netlify.app/)

## ✨ Features
* **In-Browser Inference:** Runs the ML model locally on the client's device, ensuring privacy and fast response times.
* **High Performance:** Utilizes ONNX Runtime Web and WebAssembly (WASM) for optimized, hardware-accelerated model execution.
* **Responsive UI:** Clean and intuitive user interface designed for seamless interaction.

## 🛠️ Tech Stack
* **Frontend Integration:** Modern Web Technologies (HTML, CSS, JavaScript), bundled with Vite.
* **Machine Learning:** ONNX Runtime Web (`ort-wasm`), Pre-trained ML Model (`model.json` & `weights.bin`).
* **Deployment:** Netlify.

## 🚀 Getting Started

To run this project locally:

### Prerequisites
* Node.js (v18 or higher recommended)
* npm or yarn

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/gannn10/deteksi-sayuran.git
   ```
2. Navigate to the project directory
   ```bash
   cd deteksi-sayuran
   ```
3. Install dependencies
   ```bash
   npm install
   ```
4. Start the development server
   ```bash
   npm run dev
