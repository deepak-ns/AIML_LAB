import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1>Hydraulic Monitoring Dashboard</h1>
        <p>Real-time component health monitoring</p>
      </header>
      <Dashboard />
    </div>
  )
}

export default App

