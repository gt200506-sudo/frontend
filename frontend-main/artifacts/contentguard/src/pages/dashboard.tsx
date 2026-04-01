import { useGetAnalyticsOverview, useListDetections } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, AlertTriangle, Fingerprint, ArrowRight, PlusCircle, Hexagon } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

const PLATFORM_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#a855f7', '#f43f5e'];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAnalyticsOverview();
  const { data: detectionsData, isLoading: detectionsLoading } = useListDetections({ limit: 5 });

  const summaryCards = [
    { title: "Total Content Protected", value: stats?.totalContent || 0, icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Active Monitoring", value: stats?.activeMonitoring || 0, icon: Shield, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Total Detections", value: stats?.totalDetections || 0, icon: Fingerprint, color: "text-amber-400", bg: "bg-amber-400/10" },
    { title: "Confirmed Infringements", value: stats?.confirmedInfringements || 0, icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-400/10" },
  ];

  const breachData = (stats?.platformBreakdown || [])
    .map(p => ({ platform: p.platform, breaches: p.count }))
    .sort((a, b) => b.breaches - a.breaches);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-display font-bold text-gradient mb-2">Platform Overview</h1>
        <p className="text-muted-foreground text-lg">Monitor and protect your intellectual property across the web.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-panel overflow-hidden relative group">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold font-display">
                  {statsLoading ? <div className="h-9 w-16 bg-muted/50 animate-pulse rounded" /> : card.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Breach Frequency Bar Chart */}
      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Breach Frequency by Source Platform</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Identify which platforms are responsible for the most unauthorized uses.</p>
          </div>
          <Link href="/detections" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            View Detections <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            {statsLoading ? (
              <div className="h-full flex items-end gap-2 px-2">
                {Array(8).fill(0).map((_, i) => (
                  <div key={i} className="flex-1 bg-white/5 animate-pulse rounded-t" style={{ height: `${30 + Math.random() * 60}%` }} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breachData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: "Breach Count", position: "insideBottom", offset: -2, fill: "#64748b", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="platform"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={58}
                  />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number) => [`${value} breaches`, "Frequency"]}
                  />
                  <Bar dataKey="breaches" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {breachData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Detections */}
        <Card className="lg:col-span-2 glass-panel">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Recent Detections</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Latest flagged potential infringements.</p>
            </div>
            <Link href="/detections" className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detectionsLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 animate-pulse">
                    <div className="h-5 w-48 bg-white/10 rounded" />
                    <div className="h-5 w-24 bg-white/10 rounded" />
                  </div>
                ))
              ) : detectionsData?.items?.length ? (
                detectionsData.items.map((detection) => (
                  <div key={detection.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        detection.similarityScore > 0.9 ? "bg-rose-500/20 text-rose-400" :
                        detection.similarityScore > 0.7 ? "bg-amber-500/20 text-amber-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{detection.contentTitle}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{detection.sourcePlatform}</span>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">{detection.sourceUrl}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">{(detection.similarityScore * 100).toFixed(1)}% Match</span>
                      <span className="text-xs text-muted-foreground capitalize">{detection.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No detections found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/content/register" className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 hover:border-primary/50 transition-all group">
              <div className="p-2 rounded-lg bg-primary/20 text-primary group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Register New Content</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Add to protection pool</p>
              </div>
            </Link>

            <Link href="/web3" className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-accent/20 to-transparent border border-accent/20 hover:border-accent/50 transition-all group">
              <div className="p-2 rounded-lg bg-accent/20 text-accent group-hover:scale-110 transition-transform">
                <Hexagon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Web3 Verification</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Verify blockchain ownership</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
