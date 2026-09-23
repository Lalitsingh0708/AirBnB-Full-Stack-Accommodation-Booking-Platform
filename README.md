# StayNest - AirBnB Full Stack Accommodation Booking Platform

A full-stack accommodation booking and hosting platform inspired by Airbnb, built using **Node.js**, **Express.js**, **EJS**, and **Tailwind CSS**.

---

## 🌟 Features

### 🏡 Guest / User Portal
- **Browse Accommodations:** Explore listed homes and vacation rentals with detailed pricing, location, and ratings.
- **Listing Details:** In-depth view of individual accommodations including amenities, descriptions, and host details.
- **Favorites / Wishlist:** Add and manage favorite listings for quick access.
- **Bookings:** Reserve and track your accommodation bookings.

### 🔑 Host Dashboard
- **List New Homes:** Form to register new accommodations with titles, photos, pricing, descriptions, and location.
- **Manage Listings:** View all registered homes hosted on the platform.
- **Edit & Update:** Edit listing details and update information dynamically.

### 🛠️ Architecture & Tech Stack
- **Backend:** Node.js & Express.js (MVC architecture with Controllers, Models, and Routes)
- **Frontend / Templating:** EJS (Embedded JavaScript) with dynamic layouts and partials
- **Styling:** Tailwind CSS with PostCSS & Autoprefixer
- **Data Persistence:** File-based JSON storage

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- `npm`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Lalitsingh0708/AirBnB-Full-Stack-Accommodation-Booking-Platform.git
   cd AirBnB-Full-Stack-Accommodation-Booking-Platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build Tailwind CSS:**
   ```bash
   npm run build:css
   ```

4. **Run the application:**
   ```bash
   npm start
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3001](http://localhost:3001)

---

## 📂 Project Structure

```
├── controller/         # Request handling logic (Store & Host controllers)
├── data/               # Persistent JSON data files (homes, favourites)
├── models/             # Data models and file operations
├── public/             # Static assets and compiled Tailwind CSS
├── routes/             # Express route definitions
├── utils/              # Helper utilities
├── views/              # EJS templates and components
│   ├── host/          # Host management templates
│   ├── partials/      # Shared layout partials (nav, header, footer)
│   └── store/         # Guest booking & browsing templates
├── app.js              # Application entry point
├── package.json        # Project metadata and dependencies
└── tailwind.config.js  # Tailwind CSS configuration
```

---

## 📜 License
This project is open-source under the [ISC](LICENSE) License.
