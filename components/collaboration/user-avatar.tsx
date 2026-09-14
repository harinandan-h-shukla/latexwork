"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { colorForUser, initials } from "@/components/collaboration/collab-utils";
import type { User } from "@/lib/types";

interface UserAvatarProps {
  // Only these three fields are actually used — loosened from the full User
  // so callers can pass a minimal placeholder for an author that couldn't
  // be resolved (e.g. no longer a collaborator) without fabricating a fake
  // full User object (email, planTier, etc.) just to satisfy the type.
  user: Pick<User, "id" | "name" | "avatarUrl">;
  size?: "sm" | "default" | "lg";
  ring?: boolean;
}

export function UserAvatar({ user, size = "default", ring }: UserAvatarProps) {
  const color = colorForUser(user.id);
  return (
    <Avatar
      size={size}
      style={ring ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
      <AvatarFallback style={{ backgroundColor: `${color}26`, color }}>
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}
