import {
  HomeIcon,
  UserCircleIcon,
  TableCellsIcon,
  InformationCircleIcon,
  ServerStackIcon,
  RectangleStackIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import { Home, Profile, Tables, Notifications, Analytics } from "@/pages/dashboard";
import { SignIn, SignUp } from "@/pages/auth";
import { element } from "prop-types";
import SensorDashboard from "./pages/dashboard/sensordashboard";

const icon = {
  className: "w-5 h-5 text-inherit",
};

export const routes = [
  {
    layout: "dashboard",
    pages: [
      
      {
        icon: <HomeIcon {...icon} />,
        name: "Sensor Dashboard",
        path: "/sensordashboard",
        element: <SensorDashboard />,
      },
      // Resource Analytics
      {
        icon: <ChartBarIcon {...icon} />,
        name: "Analytics",
        path: "/analytics",
        element: <Analytics />,
      },
      // Consumption Alerts
      {
        icon: <InformationCircleIcon {...icon} />,
        name: "Alerts",
        path: "/alerts",
        element: <Notifications />,
      },
      
    ],
  },
  {
    title: "auth pages",
    layout: "auth",
    pages: [
      {
        icon: <ServerStackIcon {...icon} />,
        name: "sign in",
        path: "/sign-in",
        element: <SignIn />,
      },
      {
        icon: <RectangleStackIcon {...icon} />,
        name: "sign up",
        path: "/sign-up",
        element: <SignUp />,
      },
    ],
  },
];

export default routes;
