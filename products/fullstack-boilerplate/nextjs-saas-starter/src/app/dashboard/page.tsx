import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscription: true,
      teams: {
        include: { team: { include: { _count: { select: { members: true } } } } },
      },
    },
  });

  const stats = [
    {
      name: "Current Plan",
      value: user?.subscription?.plan ?? "Free",
      change: user?.subscription?.status === "ACTIVE" ? "Active" : "Inactive",
      changeType: user?.subscription?.status === "ACTIVE" ? "positive" : "neutral",
    },
    {
      name: "Teams",
      value: user?.teams.length ?? 0,
      change: "Across all workspaces",
      changeType: "neutral",
    },
    {
      name: "API Calls",
      value: "1,247",
      change: "+12% from last month",
      changeType: "positive",
    },
    {
      name: "Storage Used",
      value: "2.4 GB",
      change: "of 10 GB",
      changeType: "neutral",
    },
  ];

  const recentActivity = [
    { action: "Created project", target: "Marketing Site", time: "2 hours ago" },
    { action: "Invited member", target: "alice@example.com", time: "5 hours ago" },
    { action: "Updated settings", target: "Team Alpha", time: "1 day ago" },
    { action: "Deployed", target: "API v2.1.0", time: "2 days ago" },
    { action: "Created project", target: "Mobile App", time: "3 days ago" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
              Welcome back, {session.user.name ?? "there"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Here&apos;s what&apos;s happening with your projects.
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 gap-3">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Settings
            </Link>
            <Link
              href="/dashboard/new-project"
              className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
            >
              New Project
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="relative overflow-hidden rounded-xl bg-white px-4 py-5 shadow-sm ring-1 ring-gray-200 sm:px-6 sm:py-6"
            >
              <dt className="truncate text-sm font-medium text-gray-500">
                {stat.name}
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {stat.value}
              </dd>
              <dd className="mt-1">
                <span
                  className={`text-sm ${
                    stat.changeType === "positive"
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  {stat.change}
                </span>
              </dd>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Activity */}
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Recent Activity
              </h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {recentActivity.map((item, i) => (
                <li key={i} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-brand-500 mr-3" />
                      <p className="text-sm text-gray-900">
                        {item.action}{" "}
                        <span className="font-medium">{item.target}</span>
                      </p>
                    </div>
                    <p className="text-sm text-gray-500">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Teams */}
          <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Your Teams
              </h3>
              <Link
                href="/dashboard/teams/new"
                className="text-sm font-medium text-brand-600 hover:text-brand-500"
              >
                Create Team
              </Link>
            </div>
            {user?.teams.length ? (
              <ul className="divide-y divide-gray-200">
                {user.teams.map((membership) => (
                  <li key={membership.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {membership.team.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {membership.team._count.members} member
                          {membership.team._count.members !== 1 ? "s" : ""} &middot;{" "}
                          {membership.role}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/teams/${membership.team.slug}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-500"
                      >
                        View
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-12 text-center sm:px-6">
                <p className="text-sm text-gray-500">
                  No teams yet. Create one to start collaborating.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              href="/dashboard/new-project"
              className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-brand-400 hover:ring-1 hover:ring-brand-400 transition-all"
            >
              <div className="text-2xl">&#128196;</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">New Project</p>
                <p className="text-sm text-gray-500">Start building something new</p>
              </div>
            </Link>
            <Link
              href="/dashboard/teams/new"
              className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-brand-400 hover:ring-1 hover:ring-brand-400 transition-all"
            >
              <div className="text-2xl">&#128101;</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">Create Team</p>
                <p className="text-sm text-gray-500">Collaborate with others</p>
              </div>
            </Link>
            <Link
              href="/dashboard/billing"
              className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-brand-400 hover:ring-1 hover:ring-brand-400 transition-all"
            >
              <div className="text-2xl">&#128179;</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">Upgrade Plan</p>
                <p className="text-sm text-gray-500">Unlock more features</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
