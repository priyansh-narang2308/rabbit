import React from "react";
import { fetchProfiles } from "@/lib/api";
import { UserCircle, KeyRound, Calendar, ShieldCheck } from "lucide-react";

import { CreateIdentityDrawer } from "@/components/identities/create-drawer";

export default async function ProfilesPage() {
  let profiles = [];
  try {
    profiles = await fetchProfiles();
  } catch (error) {
    console.error("Failed to load profiles:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Identities</h1>
          <p className="text-gray-400">
            Manage persistent Solari profiles (cookies, local storage, auth
            state).
          </p>
        </div>
        <CreateIdentityDrawer />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.length === 0 ? (
          <div className="col-span-full p-8 border border-white/10 bg-white/5 rounded-xl text-center text-gray-500">
            No identities configured. Create one to persist agent logins.
          </div>
        ) : (
          profiles.map((profile: any) => (
            <div
              key={profile.id}
              className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white leading-tight">
                      {profile.name}
                    </h3>
                    <span className="text-xs text-gray-500 font-mono">
                      ID: {profile.id.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-400 min-h-10">
                {profile.description || "No description provided."}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-2 border-t border-white/10 pt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" /> Last Used
                  </span>
                  <span className="text-sm text-gray-300 font-medium">
                    {profile.lastUsedAt
                      ? new Date(profile.lastUsedAt).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <ShieldCheck className="w-3 h-3" /> Sessions
                  </span>
                  <span className="text-sm text-gray-300 font-medium">
                    {profile.sessionCount || 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
