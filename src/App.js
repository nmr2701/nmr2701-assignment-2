import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import axios from 'axios';
import Plot from 'react-plotly.js';
import * as d3 from 'd3'; // Import d3


function App() {

  const [k, setK] = useState(1);
  const [initMethod, setInitMethod] = useState('random');
  const [data, setData] = useState([]);
  const [snaps, setSnaps] = useState([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [selectedPoints, setSelectedPoints] = useState([]); // New state for selected points
  const [assignmentSnaps, setAssignmentSnaps] = useState([]); // New state for assignment snaps
  const [clusterColors, setClusterColors] = useState([]);


  const plotRef = useRef(null); // Reference to the Plot component
  const kRef = useRef(k); // Create a ref to store the current value of k

  function generateClusterColors(numClusters) {
    const colors = [];
    for (let i = 0; i < numClusters; i++) {
      const hue = (i * 360) / numClusters;
      colors.push(`hsl(${hue}, 100%, 50%)`);
    }
    return colors;
  }


  useEffect(() => {
    kRef.current = k; // Update the ref whenever k changes
  }, [k]);


  useEffect(() => {
    handleGenerateData();
  } , []);

  useEffect(() => {
    if (initMethod === 'manual' && currentStep === -1) {
      attachClickListener(); // Attach click listener when in manual mode
    } else {
      detatchClickListener(); // Detach click listener when not in manual mode
    }

    
  }, [initMethod, currentStep]);


  useEffect(() => {
    setSelectedPoints([]); // Reset selected points when the data changes
  }
  , [initMethod, k]);

  useEffect(() => {
    console.log('Selected Points:', selectedPoints);
  }, [selectedPoints]);



  const attachClickListener = () => {
  if (plotRef.current) {
    const plotElement = d3.select(plotRef.current.getElementsByClassName('plotly')[0]);
    plotElement.on('click', (event) => {
      const bgrect = plotElement.select('.gridlayer').node().getBoundingClientRect();

      const x = ((event.clientX - bgrect['x']) / (bgrect['width'])) * (chartLayout.xaxis.range[1] - chartLayout.xaxis.range[0]) + chartLayout.xaxis.range[0];
      const y = ((event.clientY - bgrect['y']) / (bgrect['height'])) * (chartLayout.yaxis.range[0] - chartLayout.yaxis.range[1]) + chartLayout.yaxis.range[1];

      if (x >= chartLayout.xaxis.range[0] && x <= chartLayout.xaxis.range[1] &&
          y >= chartLayout.yaxis.range[0] && y <= chartLayout.yaxis.range[1]) {
        
        // Use the ref to check the current value of k
        setSelectedPoints(prevPoints => {
          if (prevPoints.length < kRef.current) { // Use kRef.current instead of k
            return [...prevPoints, [x, y]];
          }
          return prevPoints;
        });
      }
    });
  }
};



  const detatchClickListener = () => {
    if (plotRef.current) {
      const plotElement = d3.select(plotRef.current.getElementsByClassName('plotly')[0]);
      plotElement.on('click', null); // Remove click listener
    }
  };

  const handleStepThrough = () => {

    if (currentStep === -1) {
      handleRunKMeans("step");
    } else {
      if (currentStep < snaps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  }

  const handleConvergence = () => {

    if (currentStep === -1) {
      handleRunKMeans("convergence");
    } else {
      if (currentStep < snaps.length - 1) {
        setCurrentStep(snaps.length - 1);
      }
    }
  }

  const handleGenerateData = () => {
    try {
      axios.get('http://127.0.0.1:5000/data').then((response) => {
        setData(response.data);
        setCurrentStep(-1);
        setSnaps([]); // Reset snaps
        setSelectedPoints([]); // Reset selected points
      });
    } catch (error) {
      console.error('Error generating data:', error);
  }
}

  const handleReset = () => {
    console.log('Reset');
    setCurrentStep(-1);
    setSnaps([]); // Reset snaps
    setSelectedPoints([]); // Reset selected points
  };





  const handleRunKMeans = async ( type ) => {

    if (k < 1 ) {
      console.error('Invalid value for k:', k);
      return;
    } else if (initMethod === 'manual' && selectedPoints.length < k) {
      console.error('Not enough selected points for given k');
      return;
    }

    try {
      console.log('Running KMeans:', k, initMethod, selectedPoints);
      const response = await axios.post('http://127.0.0.1:5000/kmeans', {
        k: k,
        initMethod: initMethod,
        data: data,
        selectedPoints: selectedPoints, // Pass selected points to the server
      }).then((response) => {

        setSelectedPoints([]); // Reset selected points
        setSnaps(response.data.centers);
        setAssignmentSnaps(response.data.assignments);
        const colors = generateClusterColors(k);
        setClusterColors(colors);
        if (type === "step") {
          setCurrentStep(0);
        }
        if (type === "convergence") {
          setCurrentStep(response.data.centers.length - 1);
        }
      }
      );

    } catch (error) {
      console.error('Error running KMeans:', error);
    }
  };




  const chartData = [
    {
      x: data.map(point => point[0]),
      y: data.map(point => point[1]),
      mode: 'markers',
      type: 'scatter',
      name: 'Data',
      marker: {
        color: currentStep >= 0 && currentStep < assignmentSnaps.length
          ? assignmentSnaps[currentStep].map(cluster => clusterColors[cluster])
          : 'rgba(255, 99, 132, 1)',
      },
    },
    {
      x: currentStep >= 0 && currentStep < snaps.length ? snaps[currentStep].map(center => center[0]) : [],
      y: currentStep >= 0 && currentStep < snaps.length ? snaps[currentStep].map(center => center[1]) : [],
      mode: 'markers',
      type: 'scatter',
      name: 'Centers',
      marker: {
        color: currentStep >= 0 && currentStep < snaps.length
          ? snaps[currentStep].map((_, index) => clusterColors[index])
          : 'rgba(54, 162, 235, 1)',
        size: 12,
      },
    },
    {
      x: selectedPoints.map(point => point[0]),
      y: selectedPoints.map(point => point[1]),
      mode: 'markers',
      type: 'scatter',
      name: 'Selected Points',
      marker: { color: 'rgba(255, 206, 86, 1)', size: 12 },
    },
  ];


 
  const chartLayout = {
    title: 'KMeans Clustering',
    xaxis: {
      title: 'X Axis',
      range: [-10, 10],
    },
    yaxis: {
      title: 'Y Axis',
      range: [-10, 10],
    },
    width: 700, // You can adjust this value
    height: 700, // You can adjust this value
  };

  return (
    <div className="App">
      <h1>K Means Clustering</h1>

      <div className='input-container'>
        <label>Number of Clusters (k)</label>
        <input 
          type="number" 
          min="1" 
          value={k} 
          onChange={(e) => setK(Number(e.target.value))} // Update k on change
        />
        <label>Initialization Method:</label>
        <select 
          value={initMethod} 
          onChange={(e) => setInitMethod(e.target.value)} // Update initMethod on change
        >
          <option value="random">Random</option>
          <option value="farthest">Farthest First</option>
          <option value="kmeans++">KMeans++</option>
          <option value="manual">Manual</option>
          </select>

          <button onClick={handleStepThrough}>Step Through KMeans</button>
          <button onClick={handleConvergence}>Run to Convergence</button>
          <button onClick={handleGenerateData}>Generate New Dataset</button>
          <button onClick={handleReset}>Reset</button>
      </div>

          {data && data.length > 0 ? ( // Check if data is available
            <div ref={plotRef}> 
              <Plot
                id='chart'
                data={chartData} 
                layout={chartLayout}
              />
          </div>
          ) : (
            <p>No data available to display the chart.</p> // Fallback message
          )}

          {snaps.length > 0 && (
            <p>
              Step {currentStep + 1} of {snaps.length}
            </p>
          )}

    </div>
  );
}

export default App;
