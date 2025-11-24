# Hydraulic Monitoring Dashboard

React dashboard for displaying hydraulic monitoring system data.

## Features

- Display machine ID selection
- Real-time updates via Socket.IO
- Current values display for four components (Cooler, Valve, Pump, Accumulator)
- Interactive line chart showing component trends over cycles

## Setup Instructions

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the dashboard:**
   - Open your browser and navigate to `http://localhost:5173`
   - Make sure the backend server is running on `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       # Main dashboard component
│   │   ├── CurrentValues.jsx   # Current values display
│   │   ├── ComponentChart.jsx  # Chart component
│   │   └── *.css               # Component styles
│   ├── App.jsx                 # Root component
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## Dependencies

- **React 18** - UI framework
- **Recharts** - Charting library
- **Socket.IO Client** - Real-time updates
- **Vite** - Build tool and dev server

