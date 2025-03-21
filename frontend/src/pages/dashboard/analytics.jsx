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

  const [selectedTab, setSelectedTab] = useState("electricity");
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
          description: `${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} energy usage in kWh`,
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
          description: `${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} water usage in liters`,
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
          description: `${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} material consumption in kg`,
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
      const response = await axios.get(`http://localhost:8000/api/analytics/${range}/${column}`);

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
            const time = new Date(item.formatted_timestamp);
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
      const response = await axios.get(`http://localhost:8000/api/analytics/${column}`);
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
      {/* Page Header */}
      <div className="mb-8">
        <Typography variant="h4" color="blue-gray" className="mb-2">
          Resource Analytics
        </Typography>
        <Typography variant="paragraph" color="blue-gray" className="opacity-60">
          Detailed analysis of resource consumption patterns
        </Typography>
      </div>

      {/* Time Range Selector Card with improved styling */}
      <Card className="mb-8">
        <CardBody className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Typography variant="h6" color="blue-gray" className="mb-1">
                Select Time Range
              </Typography>
              <Typography variant="small" color="blue-gray" className="opacity-70">
                View data across different time periods
              </Typography>
            </div>
            <Select
              label="Time Range"
              value={timeRange}
              onChange={(value) => setTimeRange(value)}
              containerProps={{
                className: "min-w-[100px]",
              }}
            >
              <Option value="daily">Daily Analysis</Option>
              <Option value="weekly">Weekly Analysis</Option>
              <Option value="monthly">Monthly Analysis</Option>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Tabs with improved styling */}
      <Tabs
        value={selectedTab}
        onChange={(value) => {

          setSelectedTab(value);

        }}
      >
        <TabsHeader className="bg-white border-b border-blue-gray-100">
          {resourceTypes.map(({ label, value }) => (
            <Tab
              key={value}
              value={value}
              onClick={() => {

                setSelectedTab(value);
              }}
              className={`${selectedTab === value
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-blue-gray-900"
                } transition-colors duration-200 ease-in-out`}
            >
              <div className="flex items-center gap-2 py-2">
                {value === "electricity" && (
                  <i className={`fas fa-bolt ${selectedTab === value ? 'text-blue-500' : 'text-blue-gray-500'}`}></i>
                )}
                {value === "water" && (
                  <i className={`fas fa-tint ${selectedTab === value ? 'text-blue-500' : 'text-blue-gray-500'}`}></i>
                )}
                {value === "waste" && (
                  <i className={`fas fa-trash ${selectedTab === value ? 'text-blue-500' : 'text-blue-gray-500'}`}></i>
                )}
                {label} {/* Use label instead of value for display */}
              </div>
            </Tab>
          ))}
        </TabsHeader>

        <TabsBody
          animate={{
            initial: { y: 10, opacity: 0 },
            mount: { y: 0, opacity: 1 },
            unmount: { y: 10, opacity: 0 },
          }}
        >
          {resourceTypes.map(({ value, charts }) => (
            <TabPanel key={value} value={value}>
              {/* Key Statistics Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <Typography variant="h5" color="blue-gray">
                    Key Statistics
                  </Typography>
                  <Typography
                    variant="small"
                    className="flex items-center gap-1 text-blue-gray-600"
                  >
                    <i className="fas fa-clock text-sm"></i>
                    Last updated: {new Date().toLocaleTimeString()}
                  </Typography>
                </div>

                {/* Keep your existing statistics cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Your existing cards here */}
                  {/* Electricity Statistics Card */}
                  <Card className="shadow-lg">
                    <CardBody>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <i className="fas fa-bolt text-blue-500 text-2xl"></i>
                        </div>
                        <Typography variant="h6" color="blue-gray">
                          Electricity
                        </Typography>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Highest Consumption
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {highestValue.electricity.value} kWh
                          </Typography>
                          <Typography variant="small" className="text-blue-gray-500">
                            at {highestValue.electricity.timestamp}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Lowest Consumption
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {lowestValue.electricity.value} kWh
                          </Typography>
                          <Typography variant="small" className="text-blue-gray-500">
                            at {lowestValue.electricity.timestamp}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Average Consumption
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {averageConsumption.averageElectricity} kWh
                          </Typography>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Water Statistics Card */}
                  <Card className="shadow-lg">
                    <CardBody>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <i className="fas fa-tint text-blue-500 text-2xl"></i>
                        </div>
                        <Typography variant="h6" color="blue-gray">
                          Water
                        </Typography>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Highest Consumption
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {highestValue.water.value} L
                          </Typography>
                          <Typography variant="small" className="text-blue-gray-500">
                            at {highestValue.water.timestamp}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Lowest Consumption
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {lowestValue.water.value} L
                          </Typography>
                          <Typography variant="small" className="text-blue-gray-500">
                            at {lowestValue.water.timestamp}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Average Consumption
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {averageConsumption.averageWater} L
                          </Typography>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Waste Statistics Card */}
                  <Card className="shadow-lg">
                    <CardBody>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <i className="fas fa-trash text-blue-500 text-2xl"></i>
                        </div>
                        <Typography variant="h6" color="blue-gray">
                          Waste
                        </Typography>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Highest Amount
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {highestValue.waste.value} Kg
                          </Typography>
                          <Typography variant="small" className="text-blue-gray-500">
                            at {highestValue.waste.timestamp}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Lowest Amount
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {lowestValue.waste.value} Kg
                          </Typography>
                          <Typography variant="small" className="text-blue-gray-500">
                            at {lowestValue.waste.timestamp}
                          </Typography>
                        </div>
                        <div>
                          <Typography variant="small" className="font-semibold text-blue-gray-600">
                            Average Amount
                          </Typography>
                          <Typography className="text-lg font-bold">
                            {averageConsumption.averageWaste} Kg
                          </Typography>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </div>

              {/* Charts Section with improved styling */}
              <div className="mb-6">
                <Card className="mt-6">
                  <CardHeader
                    floated={false}
                    shadow={false}
                    color="transparent"
                    className="bg-blue-gray-50/40 m-0 p-6"
                  >
                    <Typography variant="h6" color="blue-gray">
                      Consumption Trends
                    </Typography>
                  </CardHeader>
                  <CardBody className="px-6 pt-4 pb-6">
                    {loading ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-gray-900"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-y-12 gap-x-6">
                        {charts.map((props, index) => (
                          <StatisticsChart
                            key={index}
                            {...props}
                            footer={
                              <div className="flex items-center gap-2 border-t border-blue-gray-50 pt-4 mt-4">
                                <i className="fas fa-sync-alt text-blue-gray-400 text-sm"></i>
                                <Typography
                                  variant="small"
                                  className="font-normal text-blue-gray-600"
                                >
                                  {loading ? "Loading..." : "Updated just now"}
                                </Typography>
                                <Typography variant="small" className="text-blue-gray-500">
                                  {timeRange === "daily" ? "Data points shown in 5-minute intervals" : ""}
                                </Typography>
                              </div>
                            }
                          />
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </TabPanel>
          ))}
        </TabsBody>
      </Tabs>
    </div>
  );
}

export default Analytics;
