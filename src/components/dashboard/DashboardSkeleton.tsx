import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse p-2">
      {/* Top Banner Executive Bar Skeleton */}
      <div className="flex flex-col xl:flex-row gap-4 p-5 rounded-2xl bg-slate-900/40 border border-white/5 justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* 4 Stats Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 rounded-3xl bg-slate-900/50 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts & Table Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/50 border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/5 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/5 space-y-4">
        <div className="flex justify-between items-center pb-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};
