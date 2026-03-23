import { StatsCard } from "../components/StatsCard";
import { Chart } from "../components/Chart";

const revenueData = [
  { month: "Jan", revenue: 4200, users: 120 },
  { month: "Feb", revenue: 5800, users: 145 },
  { month: "Mar", revenue: 6200, users: 168 },
  { month: "Apr", revenue: 7100, users: 190 },
  { month: "May", revenue: 8500, users: 225 },
  { month: "Jun", revenue: 9200, users: 258 },
  { month: "Jul", revenue: 10800, users: 295 },
  { month: "Aug", revenue: 11500, users: 340 },
  { month: "Sep", revenue: 12100, users: 378 },
  { month: "Oct", revenue: 13200, users: 412 },
  { month: "Nov", revenue: 14800, users: 456 },
  { month: "Dec", revenue: 16200, users: 502 },
];

const trafficData = [
  { day: "Mon", pageViews: 2400, uniqueVisitors: 1200 },
  { day: "Tue", pageViews: 3100, uniqueVisitors: 1500 },
  { day: "Wed", pageViews: 2800, uniqueVisitors: 1350 },
  { day: "Thu", pageViews: 3500, uniqueVisitors: 1700 },
  { day: "Fri", pageViews: 4200, uniqueVisitors: 2100 },
  { day: "Sat", pageViews: 2100, uniqueVisitors: 980 },
  { day: "Sun", pageViews: 1800, uniqueVisitors: 850 },
];

const conversionData = [
  { month: "Jan", signups: 85, conversions: 12 },
  { month: "Feb", signups: 102, conversions: 18 },
  { month: "Mar", signups: 118, conversions: 22 },
  { month: "Apr", signups: 135, conversions: 28 },
  { month: "May", signups: 158, conversions: 35 },
  { month: "Jun", signups: 172, conversions: 42 },
];

const recentOrders = [
  { id: "ORD-001", customer: "Alice Johnson", amount: "$299.00", status: "Completed" },
  { id: "ORD-002", customer: "Bob Smith", amount: "$149.00", status: "Processing" },
  { id: "ORD-003", customer: "Carol Williams", amount: "$499.00", status: "Completed" },
  { id: "ORD-004", customer: "David Brown", amount: "$79.00", status: "Pending" },
  { id: "ORD-005", customer: "Eva Martinez", amount: "$199.00", status: "Completed" },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          An overview of your business metrics and recent activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value="$16,200"
          change="+12.5%"
          changeType="positive"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Users"
          value="502"
          change="+23 this month"
          changeType="positive"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Active Sessions"
          value="1,247"
          change="-3.2%"
          changeType="negative"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          }
        />
        <StatsCard
          title="Conversion Rate"
          value="24.4%"
          change="+2.1%"
          changeType="positive"
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Chart
          title="Revenue & Users"
          subtitle="Monthly overview for the current year"
          data={revenueData}
          type="area"
          xKey="month"
          yKeys={[
            { key: "revenue", color: "#3b82f6", name: "Revenue ($)" },
            { key: "users", color: "#10b981", name: "Users" },
          ]}
        />
        <Chart
          title="Weekly Traffic"
          subtitle="Page views and unique visitors"
          data={trafficData}
          type="bar"
          xKey="day"
          yKeys={[
            { key: "pageViews", color: "#3b82f6", name: "Page Views" },
            { key: "uniqueVisitors", color: "#8b5cf6", name: "Unique Visitors" },
          ]}
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Chart
            title="Signups vs Conversions"
            subtitle="Monthly funnel performance"
            data={conversionData}
            type="line"
            xKey="month"
            yKeys={[
              { key: "signups", color: "#3b82f6", name: "Signups" },
              { key: "conversions", color: "#f59e0b", name: "Paid Conversions" },
            ]}
            height={250}
          />
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="px-4 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">
              Recent Orders
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.customer}
                  </p>
                  <p className="text-xs text-gray-500">{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {order.amount}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === "Completed"
                        ? "bg-green-50 text-green-700"
                        : order.status === "Processing"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
