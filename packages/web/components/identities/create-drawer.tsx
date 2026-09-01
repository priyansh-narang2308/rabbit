"use client";

import React, { useState } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function CreateIdentityDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (res.ok) {
        setName("");
        setDescription("");
        setIsOpen(false);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger
        render={
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)] cursor-pointer" />
        }
      >
        Create Identity
      </DrawerTrigger>
      <DrawerContent className="bg-[#0a0a0a] border-white/10 text-white">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Create Identity</DrawerTitle>
            <DrawerDescription className="text-gray-400">
              Create a persistent Solari profile for the agent to use across
              sessions.
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-200">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Personal Gmail Account"
                className="bg-white/5 border-white/10 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-200">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Used for booking flights"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <DrawerFooter className="px-0">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 cursor-pointer hover:bg-purple-700 text-white"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
              <DrawerClose
                render={
                  <Button
                    variant="outline"
                    className="bg-transparent cursor-pointer border-white/10 text-white hover:bg-white/5"
                  />
                }
              >
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
