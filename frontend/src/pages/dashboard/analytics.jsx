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

  const fetchData = async (column) => {
    try {
      const response = await axios.get(`http://localhost:3003/api/consumption-analytics/${column}`);
      const groupedData = groupDataByTimeFrame(response.data, column);
      setCategoriesValue(groupedData.map(item => item.timestamp));

      setCategoriesValue(groupedData.map(item => item.timestamp)); 

      return groupedData.map(item => item[column]); 
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const groupDataByTimeFrame = (data, column) => {
    const grouped = {};

    // Function to format date as YYYY-MM-DD
    const formatDate = date => date.toISOString().split('T')[0];

    data.forEach(item => {
        const date = new Date(item.timestamp);
        let key;

        key = formatDate(date);
        
        if (!grouped[key]) {
            grouped[key] = {
                timestamp: key,
                [column]: 0,
                count: 0,
            };
        }

        grouped[key][column] += Number(item[column]) || 0;
        grouped[key].count += 1;
    });

    return Object.values(grouped);
};


const calculateAverageConsumption = (energyData, waterData, wasteData) => {
  const calculateAverage = (data) => {
    if (!data || data.length === 0) return 0;
    const totalConsumption = data.reduce((acc, curr) => acc + (curr || 0), 0);
    return parseFloat((totalConsumption / 7).toFixed(2)); 
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
      const energy = await fetchData("electricity");
      const water = await fetchData("water");
      const materials = await fetchData("waste");

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
                Average Consumption
              </Typography>
              <Typography variant="h7" color="blue-gray" className="font-bold">
                {loading ? "Loading..." : (
                  <>
                    <p>Electricity: {averageConsumption.averageElectricity} kWh</p>
                    <p>Water: {averageConsumption.averageWater} L</p>
                    <p>Waste: {averageConsumption.averageWaste} Kg</p>
                  </>
                )}
              </Typography>
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
