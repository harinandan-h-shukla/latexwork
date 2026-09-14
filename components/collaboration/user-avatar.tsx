"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { colorForUser, initials } from "@/components/collaboration/collab-utils";
import type { User } from "@/lib/types";

interface UserAvatarProps {
  user: User;
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
