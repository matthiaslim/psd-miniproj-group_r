import React, { useState } from "react";
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

export function Analytics() {
  const [timeRange, setTimeRange] = useState("daily");
  const [department, setDepartment] = useState("all");

  // Mock data - replace with real data from your backend
  const resourceTypes = [
    {
      label: "Energy",
      value: "energy",
      charts: [
        {
          title: "Energy Consumption",
          description: "Daily energy usage in kWh",
          chart: {
            type: "line",
            height: 220,
            series: [{
              name: "Usage",
              data: [30, 40, 35, 50, 49, 60, 70, 91, 125]
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
                categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
              }
            }
          }
        },
        {
          title: "Peak Usage Hours",
          description: "Energy consumption by hour",
          chart: {
            type: "bar",
            height: 220,
            series: [{
              name: "kWh",
              data: [44, 55, 57, 56, 61, 58, 63, 60, 66]
            }],
            options: {
              ...chartsConfig,
              chart: {
                ...chartsConfig.chart,
                background: "#ffffff",
              },
              xaxis: {
                categories: ['8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM', '12AM']
              }
            }
          }
        }
      ]
    },
    {
      label: "Water",
      value: "water",
      charts: [
        {
          title: "Water Consumption",
          description: "Daily water usage in liters",
          chart: {
            type: "line",
            height: 220,
            series: [{
              name: "Usage",
              data: [140, 155, 147, 156, 161, 158, 163, 160, 166]
            }],
            options: {
              ...chartsConfig,
              chart: {
                ...chartsConfig.chart,
                background: '#ffffff', // White background
              },
              xaxis: {
                categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
              }
            }
          }
        },
        {
          title: "Usage by Department",
          description: "Water consumption distribution",
          chart: {
            type: "pie",
            height: 220,
            series: [44, 55, 13, 43, 22],
            options: {
              ...chartsConfig,
              chart: {
                ...chartsConfig.chart,
                background: '#ffffff', // White background
              },
              labels: ['Production', 'Office', 'Cafeteria', 'Cleaning', 'Other']
            }
          }
        }
      ]
    },
    {
      label: "Materials",
      value: "materials",
      charts: [
        {
          title: "Material Usage",
          description: "Monthly material consumption",
          chart: {
            type: "bar",
            height: 220,
            series: [{
              name: "Usage",
              data: [440, 505, 414, 671, 227, 413, 201, 352, 752]
            }],
            options: {
              ...chartsConfig,
              chart: {
                ...chartsConfig.chart,
                background: '#ffffff', // White background
              },
              xaxis: {
                categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
              }
            }
          }
        }
      ]
    }
  ];

  return (
    <div className="mt-12">
      <Card className="mb-6">
        <CardBody>
          <div className="mb-4 grid grid-cols-2 gap-6">
            <Select 
              label="Time Range" 
              value={timeRange}
              onChange={(value) => setTimeRange(value)}
            >
              <Option value="daily">Daily</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="yearly">Yearly</Option>
            </Select>
            <Select 
              label="Department" 
              value={department}
              onChange={(value) => setDepartment(value)}
            >
              <Option value="all">All Departments</Option>
              <Option value="production">Production</Option>
              <Option value="office">Office</Option>
              <Option value="warehouse">Warehouse</Option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Tabs value="energy">
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
              <div className="mb-6 grid grid-cols-1 gap-y-12 gap-x-6 md:grid-cols-2">
                {charts.map((props, index) => (
                  <StatisticsChart
                    key={index}
                    {...props}
                    footer={
                      <Typography
                        variant="small"
                        className="flex items-center font-normal text-blue-gray-600"
                      >
                        Updated 4 min ago
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