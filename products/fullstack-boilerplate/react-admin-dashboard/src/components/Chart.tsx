import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface ChartProps {
  data: Record<string, unknown>[];
  type?: "line" | "bar" | "area";
  xKey: string;
  yKeys: {
    key: string;
    color: string;
    name?: string;
  }[];
  height?: number;
  title?: string;
  subtitle?: string;
}

export function Chart({
  data,
  type = "line",
  xKey,
  yKeys,
  height = 300,
  title,
  subtitle,
}: ChartProps) {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 20, left: 0, bottom: 5 },
    };

    const commonAxisProps = {
      xAxis: (
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
      ),
      yAxis: (
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
      ),
      grid: <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />,
      tooltip: (
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
      ),
      legend: (
        <Legend
          wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }}
        />
      ),
    };

    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            {commonAxisProps.grid}
            {commonAxisProps.xAxis}
            {commonAxisProps.yAxis}
            {commonAxisProps.tooltip}
            {commonAxisProps.legend}
            {yKeys.map((yKey) => (
              <Bar
                key={yKey.key}
                dataKey={yKey.key}
                fill={yKey.color}
                name={yKey.name ?? yKey.key}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            {commonAxisProps.grid}
            {commonAxisProps.xAxis}
            {commonAxisProps.yAxis}
            {commonAxisProps.tooltip}
            {commonAxisProps.legend}
            {yKeys.map((yKey) => (
              <Area
                key={yKey.key}
                type="monotone"
                dataKey={yKey.key}
                stroke={yKey.color}
                fill={yKey.color}
                fillOpacity={0.1}
                name={yKey.name ?? yKey.key}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            {commonAxisProps.grid}
            {commonAxisProps.xAxis}
            {commonAxisProps.yAxis}
            {commonAxisProps.tooltip}
            {commonAxisProps.legend}
            {yKeys.map((yKey) => (
              <Line
                key={yKey.key}
                type="monotone"
                dataKey={yKey.key}
                stroke={yKey.color}
                name={yKey.name ?? yKey.key}
                strokeWidth={2}
                dot={{ fill: yKey.color, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
