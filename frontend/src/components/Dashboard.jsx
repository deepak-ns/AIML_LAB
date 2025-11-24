import React, { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import ComponentChart from './ComponentChart'
import CurrentValues from './CurrentValues'
import Chatbot from './Chatbot'
import './Dashboard.css'

const API_URL = 'http://localhost:3000'

function Dashboard() {
  const [data, setData] = useState([])
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOperator, setSelectedOperator] = useState(null)
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [showAllMachines, setShowAllMachines] = useState(false)

  // Fetch operators and machines on mount
  useEffect(() => {
    fetchOperators()
  }, [])

  // Fetch history when operator or machine changes
  useEffect(() => {
    if (selectedOperator && (selectedMachine || showAllMachines)) {
      fetchHistory(selectedOperator, showAllMachines ? null : selectedMachine)
    }
  }, [selectedOperator, selectedMachine, showAllMachines])

  // Set up Socket.IO connection for real-time updates
  useEffect(() => {
    const socket = io(API_URL)

    socket.on('prediction_update', (newData) => {
      // When new prediction comes in, refresh the data
      if (selectedOperator && (selectedMachine || showAllMachines)) {
        fetchHistory(selectedOperator, showAllMachines ? null : selectedMachine)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [selectedOperator, selectedMachine, showAllMachines])

  const fetchOperators = async () => {
    try {
      const response = await fetch(`${API_URL}/operators`)
      if (!response.ok) {
        throw new Error('Failed to fetch operators')
      }
      const result = await response.json()
      setOperators(result)
      
      // Auto-select first operator and machine if available
      if (result.length > 0) {
        const firstOperator = result[0]
        setSelectedOperator(firstOperator.operator_id)
        if (firstOperator.machines.length > 0) {
          const firstMachine = firstOperator.machines[0]
          setSelectedMachine(typeof firstMachine === 'object' ? firstMachine.machine_id : firstMachine)
          setShowAllMachines(false)
        }
      }
      
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching operators:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async (operatorId, machineId) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        operator_id: operatorId.toString()
      })
      // Only add machine_id if a specific machine is selected
      if (machineId) {
        params.append('machine_id', machineId.toString())
      }
      const response = await fetch(`${API_URL}/history?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get machines for selected operator
  const machinesForOperator = selectedOperator
    ? operators.find(op => op.operator_id === selectedOperator)?.machines || []
    : []
  
  // Helper to get machine ID (handles both object and number formats)
  const getMachineId = (machine) => {
    return typeof machine === 'object' ? machine.machine_id : machine
  }
  
  // Helper to get machine name (handles both object and number formats)
  const getMachineName = (machine) => {
    if (typeof machine === 'object') {
      return machine.machine_name || `Machine ${machine.machine_id}`
    }
    return `Machine ${machine}`
  }

  // Get current values (latest cycle for selected machine)
  const currentValues = data.length > 0
    ? data[data.length - 1]
    : null

  // Handle operator change - reset machine selection
  const handleOperatorChange = (operatorId) => {
    setSelectedOperator(operatorId)
    const operator = operators.find(op => op.operator_id === operatorId)
    if (operator && operator.machines.length > 0) {
      const firstMachine = operator.machines[0]
      setSelectedMachine(typeof firstMachine === 'object' ? firstMachine.machine_id : firstMachine)
      setShowAllMachines(false)
    } else {
      setSelectedMachine(null)
      setShowAllMachines(false)
    }
  }

  // Handle machine selection change
  const handleMachineChange = (value) => {
    if (value === 'all') {
      setShowAllMachines(true)
      setSelectedMachine(null)
    } else {
      setShowAllMachines(false)
      setSelectedMachine(Number(value))
    }
  }

  if (loading && operators.length === 0) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={fetchOperators}>Retry</button>
      </div>
    )
  }

  if (operators.length === 0) {
    return (
      <div className="dashboard-empty">
        <p>No operators available. Please check the database.</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="selectors">
        <div className="operator-selector">
          <label htmlFor="operator-select">Select Operator:</label>
          <select
            id="operator-select"
            value={selectedOperator || ''}
            onChange={(e) => handleOperatorChange(Number(e.target.value))}
          >
            <option value="">-- Select Operator --</option>
            {operators.map(operator => (
              <option key={operator.operator_id} value={operator.operator_id}>
                Operator {operator.operator_id} - {operator.name || 'Unnamed'}
              </option>
            ))}
          </select>
        </div>

        {selectedOperator && machinesForOperator.length > 0 && (
          <div className="machine-selector">
            <label htmlFor="machine-select">Select Machine:</label>
            <select
              id="machine-select"
              value={showAllMachines ? 'all' : (selectedMachine || '')}
              onChange={(e) => handleMachineChange(e.target.value)}
            >
              <option value="all">All Machines</option>
              {machinesForOperator.map(machine => {
                const machineId = getMachineId(machine)
                const machineName = getMachineName(machine)
                return (
                  <option key={machineId} value={machineId}>
                    Machine {machineId} - {machineName}
                  </option>
                )
              })}
            </select>
          </div>
        )}
      </div>

      {loading && selectedOperator && (selectedMachine || showAllMachines) && (
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      )}

      {selectedOperator && (selectedMachine || showAllMachines) && !loading && (
        <>
          {(() => {
            const selectedOperatorData = operators.find(op => op.operator_id === selectedOperator)
            const operatorName = selectedOperatorData?.name || `Operator ${selectedOperator}`
            
            if (showAllMachines) {
              // Group data by machine
              const dataByMachine = {}
              data.forEach(item => {
                if (!dataByMachine[item.machine_id]) {
                  dataByMachine[item.machine_id] = []
                }
                dataByMachine[item.machine_id].push(item)
              })
              
              return data.length === 0 ? (
                <div className="dashboard-empty">
                  <p>No data available for any machines. Waiting for predictions...</p>
                </div>
              ) : (
                <>
                  <div className="operator-info">
                    <h2>{operatorName} - All Machines</h2>
                  </div>
                  {Object.keys(dataByMachine).sort((a, b) => Number(a) - Number(b)).map(machineId => {
                    const machineIdNum = Number(machineId)
                    const machineData = dataByMachine[machineId]
                    const machineInfo = machinesForOperator.find(m => getMachineId(m) === machineIdNum)
                    const machineName = machineInfo ? getMachineName(machineInfo) : null
                    const latestValues = machineData[machineData.length - 1]
                    
                    return (
                      <div key={machineId} className="machine-section">
                        <CurrentValues 
                          operatorName={operatorName}
                          machineId={machineIdNum}
                          machineName={machineName}
                          values={latestValues}
                        />
                        <ComponentChart 
                          machineId={machineIdNum}
                          data={machineData}
                        />
                      </div>
                    )
                  })}
                </>
              )
            } else {
              // Single machine view
              return data.length === 0 ? (
                <div className="dashboard-empty">
                  <p>No data available for this machine. Waiting for predictions...</p>
                </div>
              ) : (
                <>
                  <div className="operator-info">
                    <h2>{operatorName}</h2>
                  </div>
                  <CurrentValues 
                    operatorName={operatorName}
                    machineId={selectedMachine}
                    machineName={(() => {
                      const selectedMachineData = machinesForOperator.find(m => getMachineId(m) === selectedMachine)
                      return selectedMachineData ? getMachineName(selectedMachineData) : null
                    })()}
                    values={currentValues}
                  />
                  <ComponentChart 
                    machineId={selectedMachine}
                    data={data}
                  />
                </>
              )
            }
          })()}
        </>
      )}
    
      <Chatbot />
      </div>

  )
}

export default Dashboard

