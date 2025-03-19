import React, { useState, useEffect } from "react";
import {
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
  Card,
  CardHeader,
  CardBody,
  Typography,
  Select,
  Option,
} from "@material-tailwind/react";
import { StatisticsChart } from "@/widgets/charts";
import { chartsConfig } from "@/configs";
import axios from 'axios';

export function Analytics() {
  const [timeRange, setTimeRange] = useState("weekly");
  const [energyData, setEnergyData] = useState([]);
  const [waterData, setWaterData] = useState([]);
  const [materialData, setMaterialData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesValue, setCategoriesValue] = useState([]);

  const [selectedTab, setSelectedTab] = useState('electricity');
  const [averageConsumption, setAverageConsumption] = useState({
    averageElectricity: 0,
    averageWater: 0,
    averageWaste: 0,
  });

  const [highestValue, setHighestValue] = useState({
    electricity: { value: null, timestamp: null },
    water: { value: null, timestamp: null },
    waste: { value: null, timestamp: null },
  });
  
  const [lowestValue, setLowestValue] = useState({
    electricity: { value: null, timestamp: null },
    water: { value: null, timestamp: null },
    waste: { value: null, timestamp: null },
  });

  const resourceTypes = [
    {
      label: "Electricity",
      value: "electricity",
      column: "electricity",
      charts: [
        {
          title: "Energy Consumption",
          description: "Daily energy usage in kWh",
          chart: {
            type: "line",
            height: 220,
            series: [{
              name: "Usage",
              data: energyData,
            }],
            options: {
              ...chartsConfig,
              colors: ["#388e3c"],
              chart: {
                ...chartsConfig.chart,
                background: "#ffffff",
                toolbar: {
                  show: true,
                }
              },
              stroke: {
                lineCap: "round"
              },
              xaxis: {
                categories: categoriesValue
              }
            }
          }
        }
      ]
    },
    {
      label: "Water",
      value: "water",
      column: "water", 
      charts: [
        {
          title: "Water Consumption",
          description: "Daily water usage in liters",
          chart: {
            type: "line",
            height: 220,
            series: [{
              name: "Usage",
              data: waterData,
            }],
            options: {
              ...chartsConfig,
              chart: {
                ...chartsConfig.chart,
                background: '#ffffff',
              },
              xaxis: {
                categories: categoriesValue
              }
            }
          }
        }
      ]
    },
    {
      label: "Waste",
      value: "waste",
      column: "waste",
      charts: [
        {
          title: "Material Usage",
          description: "Monthly material consumption",
          chart: {
            type: "bar",
            height: 220,
            series: [{
              name: "Usage",
              data: materialData, // Dynamic data
            }],
            options: {
              ...chartsConfig,
              chart: {
                ...chartsConfig.chart,
                background: '#ffffff',
              },
              xaxis: {
                categories: categoriesValue
              }
            }
          }
        }
      ]
    }
  ];

  const fetchData = async (column, range) => {
    try {
      const response = await axios.get(`http://localhost:3003/api/consumption-analytics/${range}/${column}`);

      console.log(response.data);

      if (range === "weekly") {
        setCategoriesValue(response.data.map(item => item.timestamp));
        return response.data.map(item => item[column]);

      } else if (range === "monthly") {
        setCategoriesValue(response.data.map(item => item.timestamp));
        return response.data.map(item => item[column]);
      }
      else
      setCategoriesValue(
        response.data.map(item => {
          const time = new Date(item.timestamp);
          return time.toLocaleTimeString('en-GB'); 
        })
      );
        return response.data.map(item => item[column]);

    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const loadData = async (column) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3003/api/consumption-analytics/${column}`);
      const data = response.data;
  
      let highest = { value: -Infinity, timestamp: null };
      let lowest = { value: Infinity, timestamp: null };
  
      data.forEach(item => {
        const itemValue = item[column];
        const itemTimestamp = item.timestamp; 
  
        if (itemValue > highest.value) {
          highest = { value: itemValue, timestamp: formatTimestamp(itemTimestamp) };
        }
  
        // Check for lowest value
        if (itemValue < lowest.value) {
          lowest = { value: itemValue, timestamp: formatTimestamp(itemTimestamp) };
        }
      });
  
      // Store the highest and lowest values along with the timestamp in state
      setHighestValue(prevState => ({
        ...prevState,
        [column]: highest,
      }));
  
      setLowestValue(prevState => ({
        ...prevState,
        [column]: lowest,
      }));
  
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData("electricity");
    loadData("water");
    loadData("waste");
  }, []);

const calculateAverageConsumption = (energyData, waterData, wasteData) => {
  const calculateAverage = (data) => {
    if (!data || data.length === 0) return 0;
    const cleanedData = data.map(item => parseFloat(item) || 0);  // Convert to float, default to 0 if NaN
    const totalConsumption = cleanedData.reduce((acc, curr) => acc + curr, 0);

    return parseFloat((totalConsumption / data.length).toFixed(2)); 
  };

  return {

    averageElectricity: calculateAverage(energyData),
    averageWater: calculateAverage(waterData),
    averageWaste: calculateAverage(wasteData),
  };
};

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const energy = await fetchData("electricity", timeRange);
      const water = await fetchData("water", timeRange);
      const materials = await fetchData("waste", timeRange);

      setEnergyData(energy);
      setWaterData(water);
      setMaterialData(materials);

      const averages = calculateAverageConsumption(energy, water, materials);

      console.log(averages);

      setAverageConsumption(averages);

      setLoading(false);
    };

    loadData();
  }, [timeRange, selectedTab]);

  


  return (
    <div className="mt-12">
      <Card className="mb-6">
        <CardBody>
          <div className="mb-4 grid grid-cols-1 gap-6">
            <Select 
              label="Time Range" 
              value={timeRange}
              onChange={(value) => setTimeRange(value)}
            >
                <Option value="daily">Daily</Option>
               <Option value="weekly">Weekly</Option>
               <Option value="monthly">Monthly</Option>

            </Select>
          </div>
        </CardBody>
      </Card>

      <Tabs value={selectedTab} onChange={setSelectedTab}>

      <TabsHeader>
        {resourceTypes.map(({ label, value }) => (
          <Tab key={value} value={value}>
            {label}
          </Tab>
        ))}
      </TabsHeader>
      <TabsBody>
        {resourceTypes.map(({ value, charts }) => (
          <TabPanel key={value} value={value}>
           <div className="mb-6 text-center">
              <Typography variant="h5" color="blue-gray">
                Key statistic
              </Typography>

                  {/* Flex container to hold the three statistics sections */}
                  <div className="flex flex-wrap justify-between items-start">
                    
                    {/* Electricity Statistics */}
                    <div className="w-full md:w-1/3 px-4">
                      <Typography variant="h6" className="font-bold">
                        Electricity:
                        </Typography>
                        <Typography variant="h7" className="font">
                        <p>Highest: {highestValue.electricity.value} kWh </p>
                        <p>Time: {highestValue.electricity.timestamp}</p>
                        <p>Lowest: {lowestValue.electricity.value} kWh </p>
                        <p>Time: {lowestValue.electricity.timestamp}</p>
                        <p>Average: {averageConsumption.averageElectricity} kWh</p>
                      </Typography>
                    </div>

                    {/* Water Statistics */}
                    <div className="w-full md:w-1/3 px-4">
                    <Typography variant="h6" className="font-bold">
                        Water:
                        </Typography>
                        <Typography variant="h7" className="font">
                        <p>Highest: {highestValue.water.value} L </p>
                        <p> Time: {highestValue.water.timestamp}</p>
                        <p> Lowest: {lowestValue.water.value} L </p>
                        <p> Time: {lowestValue.water.timestamp} </p>
                        <p>Average: {averageConsumption.averageWater} L</p>
                      </Typography>
                    </div>

                    {/* Waste Statistics */}
                    <div className="w-full md:w-1/3 px-4">
                      <Typography variant="h6" className="font-bold">
                        Waste:
                        </Typography>
                        <Typography variant="h7" className="font">
                        <p>Highest: {highestValue.waste.value} Kg </p>
                        <p>Time: {highestValue.waste.timestamp}</p>
                        <p>Lowest: {lowestValue.waste.value} Kg</p> 
                        <p>Time: {lowestValue.waste.timestamp}</p>
                        <p>Average: {averageConsumption.averageWaste} Kg</p>
                      </Typography>
                    </div>
                  </div>
                </div>


            <div className="mb-6 grid grid-cols-1 gap-y-12 gap-x-6 md:grid-cols-1">
              {charts.map((props, index) => (
                <StatisticsChart
                  key={index}
                  {...props}
                  footer={
                    <Typography
                      variant="small"
                      className="flex items-center font-normal text-blue-gray-600"
                    >
                      {loading ? "Loading..." : "Updated just now"}
                    </Typography>
                  }
                />
              ))}
            </div>
          </TabPanel>
        ))}
      </TabsBody>
    </Tabs>
    </div>
  );
}

export default Analytics;
