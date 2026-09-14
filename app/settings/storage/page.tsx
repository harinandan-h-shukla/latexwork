"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StorageUsageBar } from "@/components/settings/storage-usage-bar";
import { getCurrentUser } from "@/lib/mock-api/auth";
import { mockDb } from "@/lib/mock-api/db";
import { seedMockDb } from "@/lib/mock-api/seed";
import type { Project, User } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 100 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export default function StorageSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await getCurrentUser();
      if (!active) return;
      setUser(u);
      seedMockDb();
      const owned = mockDb.projects
        .filter((p) => p.ownerId === u.id && !p.trashed)
        .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes);
      setProjects(owned);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const trackedBytes = projects.reduce((sum, p) => sum + p.storageUsedBytes, 0);
  const otherBytes = Math.max(0, user.storageUsedBytes - trackedBytes);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Storage usage</CardTitle>
          <CardDescription>
            Your plan includes {formatBytes(user.storageQuotaBytes)} of storage across all projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StorageUsageBar usedBytes={user.storageUsedBytes} quotaBytes={user.storageQuotaBytes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage by project</CardTitle>
          <CardDescription>Storage consumed by each project you own.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link href={`/projects/${project.id}`} className="hover:underline">
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatBytes(project.storageUsedBytes)}
                  </TableCell>
                </TableRow>
              ))}
              {otherBytes > 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground">Other (shared, deleted, account overhead)</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatBytes(otherBytes)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
