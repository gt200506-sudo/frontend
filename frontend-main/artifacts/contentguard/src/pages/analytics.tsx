import { useGetAnalyticsOverview, useGetDetectionTrends } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Target, AlertTriangle } from "lucide-react";

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#a855f7', '#f43f5e'];

export default function Analytics() {
  const { data: stats } = useGetAnalyticsOverview();
  const { data: trends } = useGetDetectionTrends();

  const breachByPlatform = (stats?.platformBreakdown || [])
    .map(p => ({ platform: p.platform, breaches: p.count, percentage: p.percentage }))
    .sort((a, b) => b.breaches - a.breaches);

  const topViolatorsData = breachByPlatform.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-gradient mb-2">Analytics & Intelligence</h1>
        <p className="text-muted-foreground">Deep dive into content spread, breach frequency, and infringement patterns.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-panel">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-500/10">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Breaches</p>
              <p className="text-2xl font-bold font-display">{stats?.totalDetections ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Target className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confirmed Infringements</p>
              <p className="text-2xl font-bold font-display">{stats?.confirmedInfringements ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assets Monitored</p>
              <p className="text-2xl font-bold font-display">{stats?.activeMonitoring ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detection Trends Area Chart */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Detection Trends (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends?.daily || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDetections" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="detections" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorDetections)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Breach Frequency by Platform (Horizontal Bar) */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Breach Frequency by Source</CardTitle>
            <p className="text-sm text-muted-foreground">Platforms responsible for most unauthorized uses.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breachByPlatform} layout="vertical" margin={{ top: 5, right: 20, left: 55, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="platform"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number) => [`${value} breaches`, "Count"]}
                  />
                  <Bar dataKey="breaches" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {breachByPlatform.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform Breakdown Donut */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Platform Share</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center">
            <div className="h-[260px] w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.platformBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="platform"
                    stroke="none"
                  >
                    {stats?.platformBreakdown?.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3">
              {stats?.platformBreakdown?.map((platform, i) => (
                <div key={platform.platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-medium truncate">{platform.platform}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{platform.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Violating Sources */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Top Violating Sources</CardTitle>
            <p className="text-sm text-muted-foreground">High-risk platforms requiring immediate attention.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topViolatorsData.map((platform, i) => (
                <div key={platform.platform} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4 text-xs">#{i + 1}</span>
                      <span className="font-medium">{platform.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{platform.breaches} breaches</span>
                      <span className="text-xs font-bold" style={{ color: COLORS[i % COLORS.length] }}>{platform.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${platform.percentage}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Affected Content */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Most Targeted Assets</CardTitle>
          <p className="text-sm text-muted-foreground">Content with the highest number of detected infringements.</p>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/50 overflow-hidden bg-background/20">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-white/[0.02] uppercase border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Asset Title</th>
                  <th className="px-6 py-4 font-medium">Avg Similarity</th>
                  <th className="px-6 py-4 font-medium text-right">Total Incidents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {stats?.mostAffectedContent?.map((item) => (
                  <tr key={item.contentId} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium">{item.title}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-black/40 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.avgSimilarity > 0.8 ? 'bg-rose-500' : 'bg-amber-500'}`}
                            style={{ width: `${item.avgSimilarity * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{(item.avgSimilarity * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-rose-400">
                      {item.detectionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
