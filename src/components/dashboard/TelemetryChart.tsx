import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface TelemetryChartProps {
  title: string;
  data: Array<{ time: string; value: number; value2?: number }>;
  color?: string;
  secondaryColor?: string;
  type?: "area" | "line";
  showSecondary?: boolean;
  unit?: string;
}

const TelemetryChart = ({
  title,
  data,
  color = "hsl(160, 84%, 45%)",
  secondaryColor = "hsl(180, 70%, 50%)",
  type = "area",
  showSecondary = false,
  unit = "",
}: TelemetryChartProps) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
          <p className="text-xs text-muted-foreground font-mono mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
              {entry.value.toFixed(1)}{unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-border bg-card/50"
    >
      <h3 className="font-mono font-bold text-foreground mb-4">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {type === "area" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
                {showSecondary && (
                  <linearGradient id={`gradient2-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
              <XAxis
                dataKey="time"
                stroke="hsl(220 10% 55%)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(220 10% 55%)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}${unit}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
              />
              {showSecondary && (
                <Area
                  type="monotone"
                  dataKey="value2"
                  stroke={secondaryColor}
                  strokeWidth={2}
                  fill={`url(#gradient2-${title})`}
                />
              )}
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
              <XAxis
                dataKey="time"
                stroke="hsl(220 10% 55%)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(220 10% 55%)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
              {showSecondary && (
                <Line
                  type="monotone"
                  dataKey="value2"
                  stroke={secondaryColor}
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default TelemetryChart;
