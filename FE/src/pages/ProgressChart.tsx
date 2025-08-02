import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface UserAttempt {
  attemptDate: string;
  points: number;
  percentage: number;
}

interface Props {
  attempts: UserAttempt[];
}

const ProgressChart = ({ attempts }: Props) => {
  const formattedData = attempts.map((a, i) => ({
    name: `Pokušaj ${i + 1}`,
    points: a.points,
    percentage: a.percentage,
  }));

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-2">Napredak kroz pokušaje</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="percentage" stroke="#8884d8" name="Procenat" />
          <Line type="monotone" dataKey="points" stroke="#82ca9d" name="Poeni" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
