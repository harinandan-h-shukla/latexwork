import type { User } from "@/lib/types";

export interface PlanTierInfo {
  tier: User["planTier"];
  name: string;
  price: string;
  priceNote: string;
  features: string[];
}

export const PLAN_ORDER: User["planTier"][] = ["free", "student", "pro", "team"];

export const PLANS: PlanTierInfo[] = [
  {
    tier: "free",
    name: "Free",
    price: "$0",
    priceNote: "/month",
    features: [
      "1 GB storage",
      "Up to 2 collaborators per project",
      "Standard compile queue",
      "Community support",
    ],
  },
  {
    tier: "student",
    name: "Student",
    price: "$4",
    priceNote: "/month",
    features: [
      "3 GB storage",
      "Up to 5 collaborators per project",
      "Priority compile queue",
      "Verified with .edu email",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$15",
    priceNote: "/month",
    features: [
      "5 GB storage",
      "Unlimited collaborators",
      "Full version history",
      "Git & Overleaf import",
      "Priority support",
    ],
  },
  {
    tier: "team",
    name: "Team",
    price: "$35",
    priceNote: "/month per seat",
    features: [
      "20 GB storage per seat",
      "Centralized billing",
      "Admin & permissions console",
      "SSO / institutional login",
      "Dedicated support",
    ],
  },
];
