import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, icon: Icon, gradient, subtext, trend }: StatCardProps) {
  return (
    <Card className="p-3 hover:shadow-lg transition-shadow duration-200 border-border bg-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm mb-0.5">{title}</p>
          <p className="text-foreground text-3xl mb-1">{value}</p>
          {subtext && (
            <p className="text-muted-foreground text-xs">{subtext}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg ${gradient} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </Card>
  );
}
