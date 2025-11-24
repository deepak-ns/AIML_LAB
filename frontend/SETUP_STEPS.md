# Dashboard Setup Steps

Follow these steps to set up and run the React dashboard:

## Step 1: Install Dependencies

Navigate to the frontend directory and install all required packages:

```bash
cd frontend
npm install
```

This will install:
- React and React DOM
- Recharts (for charting)
- Socket.IO Client (for real-time updates)
- Vite (build tool)

## Step 2: Ensure Backend Server is Running

Make sure your backend server is running on `http://localhost:3000`:

```bash
cd backend
node server.js
```

The server should display: `🚀 Polling Server running. Checking every 5 minutes.`

## Step 3: Start the Frontend Development Server

In a new terminal, start the React development server:

```bash
cd frontend
npm run dev
```

The dashboard will be available at: `http://localhost:5173`

## Step 4: Access the Dashboard

1. Open your web browser
2. Navigate to `http://localhost:5173`
3. You should see the dashboard with:
   - Machine ID selector dropdown
   - Current values display (Cooler, Valve, Pump, Accumulator)
   - Interactive line chart showing trends over cycles

## Features

### Machine Selection
- Use the dropdown to select which machine's data to display
- The dashboard automatically filters data for the selected machine

### Current Values Display
- Shows the latest cycle ID
- Displays current values for all four components:
  - **Cooler** (Green)
  - **Valve** (Blue)
  - **Pump** (Orange)
  - **Accumulator** (Purple)

### Component Trends Chart
- Interactive line chart showing all four components over time
- Hover over data points to see exact values
- Each component has a distinct color matching the current values display

### Real-time Updates
- The dashboard automatically updates when new predictions arrive
- Uses Socket.IO to listen for `prediction_update` events from the backend

## Troubleshooting

### Port Already in Use
If port 5173 is already in use, Vite will automatically try the next available port. Check the terminal output for the actual port number.

### Cannot Connect to Backend
- Ensure the backend server is running on port 3000
- Check that CORS is enabled in the backend (it should be with `app.use(cors())`)
- Verify the API URL in `Dashboard.jsx` matches your backend URL

### No Data Displayed
- Make sure there's data in the `model_outputs` table
- Check the browser console for any errors
- Verify the `/history` endpoint is returning data by visiting `http://localhost:3000/history` directly

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` folder, ready to be deployed to any static hosting service.

