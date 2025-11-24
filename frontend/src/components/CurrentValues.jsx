import React from 'react'
import './CurrentValues.css'

function CurrentValues({ operatorName, machineId, machineName, values }) {
  if (!values) {
    return (
      <div className="current-values">
        <h2>{machineName || `Machine ${machineId}`} - Current Values</h2>
        <p>No data available</p>
      </div>
    )
  }

  // Function to interpret component values (handles decimal values by finding closest match)
  const interpretValue = (componentName, value) => {
    if (value === null || value === undefined) return { status: 'Unknown', color: '#757575', severity: 'unknown' }
    
    // Helper function to find closest value
    const findClosest = (target, options) => {
      return options.reduce((prev, curr) => 
        Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
      )
    }
    
    switch (componentName) {
      case 'Cooler':
        const coolerOptions = [3, 20, 100]
        const closestCooler = findClosest(value, coolerOptions)
        if (closestCooler === 3) return { status: 'Close to total failure', color: '#dc2626', severity: 'critical' }
        if (closestCooler === 20) return { status: 'Reduced efficiency', color: '#f59e0b', severity: 'warning' }
        if (closestCooler === 100) return { status: 'Full efficiency', color: '#059669', severity: 'good' }
        return { status: `Value: ${value}`, color: '#6b7280', severity: 'unknown' }
      
      case 'Valve':
        const valveOptions = [100, 90, 80, 73]
        const closestValve = findClosest(value, valveOptions)
        if (closestValve === 100) return { status: 'Optimal switching behavior', color: '#059669', severity: 'good' }
        if (closestValve === 90) return { status: 'Small lag', color: '#f59e0b', severity: 'warning' }
        if (closestValve === 80) return { status: 'Severe lag', color: '#ea580c', severity: 'warning' }
        if (closestValve === 73) return { status: 'Close to total failure', color: '#dc2626', severity: 'critical' }
        return { status: `Value: ${value}`, color: '#6b7280', severity: 'unknown' }
      
      case 'Pump':
        // Use ranges for pump since values are discrete categories
        if (value >= 0 && value < 0.5) return { status: 'No leakage', color: '#059669', severity: 'good' }
        if (value >= 0.5 && value < 1.5) return { status: 'Weak leakage', color: '#f59e0b', severity: 'warning' }
        if (value >= 1.5) return { status: 'Severe leakage', color: '#dc2626', severity: 'critical' }
        return { status: `Value: ${value}`, color: '#6b7280', severity: 'unknown' }
      
      case 'Accumulator':
        const accumulatorOptions = [130, 115, 100, 90]
        const closestAccumulator = findClosest(value, accumulatorOptions)
        if (closestAccumulator === 130) return { status: 'Optimal pressure', color: '#059669', severity: 'good' }
        if (closestAccumulator === 115) return { status: 'Slightly reduced pressure', color: '#f59e0b', severity: 'warning' }
        if (closestAccumulator === 100) return { status: 'Severely reduced pressure', color: '#ea580c', severity: 'warning' }
        if (closestAccumulator === 90) return { status: 'Close to total failure', color: '#dc2626', severity: 'critical' }
        return { status: `Value: ${value}`, color: '#6b7280', severity: 'unknown' }
      
      default:
        return { status: `Value: ${value}`, color: '#757575', severity: 'unknown' }
    }
  }

  const components = [
    { 
      name: 'Cooler', 
      value: values.cooler, 
      baseColor: '#2563eb', // Professional blue
      ...interpretValue('Cooler', values.cooler)
    },
    { 
      name: 'Valve', 
      value: values.valve, 
      baseColor: '#059669', // Professional teal/green
      ...interpretValue('Valve', values.valve)
    },
    { 
      name: 'Pump', 
      value: values.pump, 
      baseColor: '#dc2626', // Professional red
      ...interpretValue('Pump', values.pump)
    },
    { 
      name: 'Accumulator', 
      value: values.accumulator, 
      baseColor: '#7c3aed', // Professional purple
      ...interpretValue('Accumulator', values.accumulator)
    },
  ]

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    const date = new Date(timeString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="current-values">
      <h2>{machineName || `Machine ${machineId}`} - Current Values</h2>
      <p className="cycle-info">
        Cycle ID: {values.cycle_id} | Time: {formatTime(values.start_time)}
      </p>
      <div className="values-grid">
        {components.map((component) => (
          <div key={component.name} className="value-card">
            <div className="value-icon" style={{ backgroundColor: component.color }}>
              <span>{component.name.charAt(0)}</span>
            </div>
            <div className="value-content">
              <h3>{component.name}</h3>
              <p className="value-number">{component.value !== null && component.value !== undefined ? component.value.toFixed(2) : 'N/A'}</p>
              <p className="value-status" style={{ color: component.color }}>
                {component.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CurrentValues

