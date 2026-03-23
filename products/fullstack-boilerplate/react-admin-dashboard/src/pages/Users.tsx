import { useState } from "react";
import { DataTable, Column } from "../components/DataTable";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  plan: string;
  joinedAt: string;
}

const mockUsers: User[] = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "active", plan: "Enterprise", joinedAt: "2024-01-15" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", role: "User", status: "active", plan: "Pro", joinedAt: "2024-02-03" },
  { id: "3", name: "Carol Williams", email: "carol@example.com", role: "User", status: "active", plan: "Pro", joinedAt: "2024-02-18" },
  { id: "4", name: "David Brown", email: "david@example.com", role: "User", status: "inactive", plan: "Free", joinedAt: "2024-03-01" },
  { id: "5", name: "Eva Martinez", email: "eva@example.com", role: "Moderator", status: "active", plan: "Pro", joinedAt: "2024-03-12" },
  { id: "6", name: "Frank Lee", email: "frank@example.com", role: "User", status: "suspended", plan: "Free", joinedAt: "2024-03-20" },
  { id: "7", name: "Grace Kim", email: "grace@example.com", role: "User", status: "active", plan: "Enterprise", joinedAt: "2024-04-05" },
  { id: "8", name: "Henry Davis", email: "henry@example.com", role: "User", status: "active", plan: "Pro", joinedAt: "2024-04-15" },
  { id: "9", name: "Ivy Chen", email: "ivy@example.com", role: "Admin", status: "active", plan: "Enterprise", joinedAt: "2024-05-02" },
  { id: "10", name: "Jack Wilson", email: "jack@example.com", role: "User", status: "inactive", plan: "Free", joinedAt: "2024-05-18" },
  { id: "11", name: "Kate Taylor", email: "kate@example.com", role: "User", status: "active", plan: "Pro", joinedAt: "2024-06-01" },
  { id: "12", name: "Leo Anderson", email: "leo@example.com", role: "User", status: "active", plan: "Free", joinedAt: "2024-06-15" },
  { id: "13", name: "Maya Patel", email: "maya@example.com", role: "Moderator", status: "active", plan: "Pro", joinedAt: "2024-07-03" },
  { id: "14", name: "Noah Garcia", email: "noah@example.com", role: "User", status: "active", plan: "Enterprise", joinedAt: "2024-07-22" },
  { id: "15", name: "Olivia Thomas", email: "olivia@example.com", role: "User", status: "suspended", plan: "Free", joinedAt: "2024-08-10" },
];

const statusStyles = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-red-50 text-red-700",
};

const planStyles = {
  Free: "bg-gray-100 text-gray-700",
  Pro: "bg-blue-50 text-blue-700",
  Enterprise: "bg-purple-50 text-purple-700",
};

export function Users() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">
              {row.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
    },
    {
      key: "status",
      header: "Status",
      render: (value) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            statusStyles[value as keyof typeof statusStyles]
          }`}
        >
          {String(value)}
        </span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (value) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            planStyles[value as keyof typeof planStyles] ?? planStyles.Free
          }`}
        >
          {String(value)}
        </span>
      ),
    },
    {
      key: "joinedAt",
      header: "Joined",
      render: (value) =>
        new Date(String(value)).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your application users and their permissions.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-gray-500">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{mockUsers.length}</p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {mockUsers.filter((u) => u.status === "active").length}
          </p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-gray-500">Pro & Enterprise</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {mockUsers.filter((u) => u.plan !== "Free").length}
          </p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
          <p className="text-xs font-medium text-gray-500">Suspended</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {mockUsers.filter((u) => u.status === "suspended").length}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={mockUsers}
        searchKeys={["name", "email", "role"]}
        pageSize={10}
        onRowClick={(user) => setSelectedUser(user)}
      />

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setShowAddModal(false);
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option>User</option>
                  <option>Moderator</option>
                  <option>Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plan</label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option>Free</option>
                  <option>Pro</option>
                  <option>Enterprise</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-sm bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-700">
                    {selectedUser.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{selectedUser.name}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Role</span>
                  <span className="text-sm font-medium text-gray-900">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[selectedUser.status]}`}>
                    {selectedUser.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Plan</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${planStyles[selectedUser.plan as keyof typeof planStyles] ?? planStyles.Free}`}>
                    {selectedUser.plan}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Joined</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(selectedUser.joinedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Edit
                </button>
                <button className="flex-1 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                  Suspend
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
