"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Users, Library, TreePine } from "lucide-react";
import { getStats } from "@/lib/api";
import type { Stats } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/stats/StatCard";
import { Spinner } from "@/components/ui/Spinner";

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Статистика" />
        <Spinner className="mt-10" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Статистика" subtitle="Ваш семейный архив" />
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-3">
          <StatCard
            icon={BookOpen}
            label="Мои истории"
            value={stats?.my_stories || 0}
          />
          <StatCard
            icon={Users}
            label="Связанных родственников"
            value={stats?.related_relatives || 0}
            color="text-amber-500"
          />
          <StatCard
            icon={Library}
            label="Историй от родственников"
            value={stats?.relatives_stories || 0}
            color="text-emerald-500"
          />
          <StatCard
            icon={TreePine}
            label="Всего историй в архиве"
            value={stats?.total_stories || 0}
            color="text-violet-500"
          />
        </div>
      </div>
    </div>
  );
}
