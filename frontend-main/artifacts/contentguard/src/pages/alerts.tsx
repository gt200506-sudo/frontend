import { useListAlerts, useMarkAlertRead } from "@workspace/api-client-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Info, Bell, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function Alerts() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListAlerts({ limit: 50 });
  const { mutate: markRead } = useMarkAlertRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      }
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      default: return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-gradient mb-2 flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              System Alerts
            </h1>
            <p className="text-muted-foreground">Stay updated on new detections and system events.</p>
          </div>
          <Button variant="outline" className="border-border/50 bg-background/50 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark all read
          </Button>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="glass-panel p-4 animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-white/10 rounded" />
                  <div className="h-3 w-1/2 bg-white/5 rounded" />
                </div>
              </Card>
            ))
          ) : data?.items?.length ? (
            data.items.map((alert) => (
              <Card key={alert.id} className={`glass-panel overflow-hidden transition-colors ${!alert.read ? 'bg-primary/5 border-primary/20' : ''}`}>
                <div className="p-5 flex items-start gap-4">
                  <div className={`mt-1 p-2 rounded-full ${!alert.read ? 'bg-white/10' : 'bg-transparent'}`}>
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${!alert.read ? 'text-foreground' : 'text-foreground/80'}`}>
                          {alert.title}
                        </h3>
                        {!alert.read && <Badge className="bg-primary hover:bg-primary/90">New</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(alert.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <p className={`text-sm mb-3 ${!alert.read ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                        {alert.type.replace('_', ' ')}
                      </Badge>
                      {!alert.read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
                          onClick={() => markRead({ id: alert.id })}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border/50 rounded-2xl bg-white/[0.01]">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>You're all caught up.</p>
            </div>
          )}
        </div>
      </div>
  );
}
