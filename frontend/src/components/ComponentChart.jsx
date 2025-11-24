import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import './ComponentChart.css'

function ComponentChart({ machineId, data }) {
  if (!data || data.length === 0) {
    return (
      <div className="component-chart">
        <h2>Machine {machineId} - Component Trends</h2>
        <p>No data available for chart</p>
      </div>
    )
  }

  // Function to interpret component values (handles decimal values by finding closest match)
  const interpretValue = (componentName, value) => {
    if (value === null || value === undefined) return 'Unknown'
    
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
        if (closestCooler === 3) return 'Close to total failure'
        if (closestCooler === 20) return 'Reduced efficiency'
        if (closestCooler === 100) return 'Full efficiency'
        return `Value: ${value.toFixed(2)}`
      
      case 'Valve':
        const valveOptions = [100, 90, 80, 73]
        const closestValve = findClosest(value, valveOptions)
        if (closestValve === 100) return 'Optimal switching behavior'
        if (closestValve === 90) return 'Small lag'
        if (closestValve === 80) return 'Severe lag'
        if (closestValve === 73) return 'Close to total failure'
        return `Value: ${value.toFixed(2)}`
      
      case 'Pump':
        const pumpOptions = [0, 1, 2]
        const closestPump = findClosest(value, pumpOptions)
        if (closestPump === 0) return 'No leakage'
        if (closestPump === 1) return 'Weak leakage'
        if (closestPump === 2) return 'Severe leakage'
        return `Value: ${value.toFixed(2)}`
      
      case 'Accumulator':
        const accumulatorOptions = [130, 115, 100, 90]
        const closestAccumulator = findClosest(value, accumulatorOptions)
        if (closestAccumulator === 130) return 'Optimal pressure'
        if (closestAccumulator === 115) return 'Slightly reduced pressure'
        if (closestAccumulator === 100) return 'Severely reduced pressure'
        if (closestAccumulator === 90) return 'Close to total failure'
        return `Value: ${value.toFixed(2)}`
      
      default:
        return `Value: ${value.toFixed(2)}`
    }
  }

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return ''
    const date = new Date(timeString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Function to get condition category for Y-axis
  const getConditionCategory = (componentName, value) => {
    if (value === null || value === undefined) return 'Unknown'
    
    const findClosest = (target, options) => {
      return options.reduce((prev, curr) => 
        Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
      )
    }
    
    switch (componentName) {
      case 'Cooler':
        const coolerOptions = [3, 20, 100]
        const closestCooler = findClosest(value, coolerOptions)
        if (closestCooler === 3) return 'Close to total failure'
        if (closestCooler === 20) return 'Reduced efficiency'
        if (closestCooler === 100) return 'Full efficiency'
        return 'Unknown'
      
      case 'Valve':
        const valveOptions = [100, 90, 80, 73]
        const closestValve = findClosest(value, valveOptions)
        if (closestValve === 100) return 'Optimal switching behavior'
        if (closestValve === 90) return 'Small lag'
        if (closestValve === 80) return 'Severe lag'
        if (closestValve === 73) return 'Close to total failure'
        return 'Unknown'
      
      case 'Pump':
        const pumpOptions = [0, 1, 2]
        const closestPump = findClosest(value, pumpOptions)
        if (closestPump === 0) return 'No leakage'
        if (closestPump === 1) return 'Weak leakage'
        if (closestPump === 2) return 'Severe leakage'
        return 'Unknown'
      
      case 'Accumulator':
        const accumulatorOptions = [130, 115, 100, 90]
        const closestAccumulator = findClosest(value, accumulatorOptions)
        if (closestAccumulator === 130) return 'Optimal pressure'
        if (closestAccumulator === 115) return 'Slightly reduced pressure'
        if (closestAccumulator === 100) return 'Severely reduced pressure'
        if (closestAccumulator === 90) return 'Close to total failure'
        return 'Unknown'
      
      default:
        return 'Unknown'
    }
  }

  // Prepare data for the chart - sort by time ascending for proper chart display
  const baseChartData = [...data]
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .map(item => ({
      time: formatTime(item.start_time),
      timeRaw: item.start_time,
      cycle: item.cycle_id,
      Cooler: item.cooler,
      Valve: item.valve,
      Pump: item.pump,
      Accumulator: item.accumulator,
    }))
  
  // Add condition categories to each data point
  const chartData = baseChartData.map(item => ({
    ...item,
    CoolerCondition: getConditionCategory('Cooler', item.Cooler),
    ValveCondition: getConditionCategory('Valve', item.Valve),
    PumpCondition: getConditionCategory('Pump', item.Pump),
    AccumulatorCondition: getConditionCategory('Accumulator', item.Accumulator),
  }))

  // Get all conditions for each component to create Y-axis categories (always show all)
  // Good conditions at top (higher index = higher Y value = top of chart)
  const getConditionCategories = (componentName) => {
    // Define all possible conditions in order (bad to good, so when reversed, good is at top)
    const orderMap = {
      'Cooler': ['Close to total failure', 'Reduced efficiency', 'Full efficiency'],
      'Valve': ['Close to total failure', 'Severe lag', 'Small lag', 'Optimal switching behavior'],
      'Pump': ['Severe leakage', 'Weak leakage', 'No leakage'],
      'Accumulator': ['Close to total failure', 'Severely reduced pressure', 'Slightly reduced pressure', 'Optimal pressure']
    }
    
    // Reverse so good conditions are at the top (higher index)
    const categories = orderMap[componentName] || []
    return [...categories].reverse()
  }

  // Map condition to numeric value for Y-axis positioning
  const conditionToValue = (condition, categories) => {
    return categories.indexOf(condition)
  }

  // Component configurations with professional color palette
  const componentConfigs = [
    { 
      name: 'Cooler', 
      dataKey: 'Cooler', 
      color: '#2563eb', // Professional blue
      yAxisLabel: 'Cooler Condition',
      expectedValues: [3, 20, 100]
    },
    { 
      name: 'Valve', 
      dataKey: 'Valve', 
      color: '#059669', // Professional teal/green
      yAxisLabel: 'Valve Condition',
      expectedValues: [100, 90, 80, 73]
    },
    { 
      name: 'Pump', 
      dataKey: 'Pump', 
      color: '#dc2626', // Professional red
      yAxisLabel: 'Internal Pump Leakage',
      expectedValues: [0, 1, 2]
    },
    { 
      name: 'Accumulator', 
      dataKey: 'Accumulator', 
      color: '#7c3aed', // Professional purple
      yAxisLabel: 'Hydraulic Accumulator',
      expectedValues: [130, 115, 100, 90]
    }
  ]

  return (
    <div className="component-chart">
      <h2>Machine {machineId} - Component Trends Over Time</h2>
      <div className="charts-grid">
        {componentConfigs.map((config) => {
          const conditionKey = `${config.name}Condition`
          const categories = getConditionCategories(config.name)
          
          // Store original numeric values before converting to condition indices
          const originalDataKey = `${config.dataKey}Original`
          
          // Create data with condition values for Y-axis
          const conditionChartData = chartData.map(item => ({
            ...item,
            [originalDataKey]: item[config.dataKey], // Store original numeric value
            [config.dataKey]: conditionToValue(item[conditionKey], categories)
          }))
          
          return (
            <div key={config.name} className="individual-chart-container">
              <h3 className="chart-title">{config.name}</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart
                    data={conditionChartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="time" 
                      label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                      stroke="#666"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      label={{ value: config.yAxisLabel, angle: -90, position: 'insideLeft' }}
                      stroke="#666"
                      domain={[-0.5, categories.length - 0.5]}
                      ticks={categories.map((_, index) => index)}
                      tickFormatter={(value) => categories[value] || ''}
                      fontSize={11}
                      width={150}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        padding: '10px'
                      }}
                      labelFormatter={(value, payload) => {
                        if (payload && payload[0] && payload[0].payload) {
                          const fullTime = payload[0].payload.timeRaw
                          if (fullTime) {
                            const date = new Date(fullTime)
                            return `Time: ${date.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })} | Cycle: ${payload[0].payload.cycle}`
                          }
                        }
                        return value
                      }}
                      formatter={(value, name, props) => {
                        const payload = props.payload
                        const condition = payload[conditionKey]
                        const numericValue = payload[originalDataKey]
                        return [`${condition} (Value: ${numericValue.toFixed(2)})`, config.name]
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={config.dataKey} 
                      stroke={config.color} 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ComponentChart

