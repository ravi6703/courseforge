export type ContentType =
  | "video"
  | "reading"
  | "practice_quiz"
  | "graded_quiz"
  | "plugin"
  | "ai_dialogue"
  | "discussion_prompt"
  | "case_study"
  | "role_play"
  | "coding_exercise"
  | "glossary";

export type ContentStatus =
  | "planned"
  | "generating"
  | "draft"
  | "in_review"
  | "review_complete"
  | "approved"
  | "locked";

export type Platform = "coursera" | "udemy" | "university" | "custom";

interface ContentTypeConfig {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
  platforms: Platform[];
  defaultDuration: number;
}

export const contentTypeMap: Record<ContentType, ContentTypeConfig> = {
  video: {
    icon: "🎥",
    label: "Video",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    description: "Video lecture or demonstration",
    platforms: ["coursera", "udemy", "university", "custom"],
    defaultDuration: 10,
  },
  reading: {
    icon: "📖",
    label: "Reading",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    description: "Article, chapter, or text-based content",
    platforms: ["coursera", "udemy", "university", "custom"],
    defaultDuration: 15,
  },
  practice_quiz: {
    icon: "❓",
    label: "Practice Quiz",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    description: "Ungraded practice questions",
    platforms: ["coursera", "udemy", "university", "custom"],
    defaultDuration: 5,
  },
  graded_quiz: {
    icon: "✓",
    label: "Graded Quiz",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    description: "Graded assessment with scoring",
    platforms: ["coursera", "udemy", "university", "custom"],
    defaultDuration: 10,
  },
  plugin: {
    icon: "🔌",
    label: "Plugin",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    description: "Interactive plugin or widget",
    platforms: ["coursera", "udemy", "custom"],
    defaultDuration: 8,
  },
  ai_dialogue: {
    icon: "💬",
    label: "AI Dialogue",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    description: "Interactive AI conversation",
    platforms: ["coursera", "university", "custom"],
    defaultDuration: 12,
  },
  discussion_prompt: {
    icon: "💭",
    label: "Discussion",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    description: "Discussion prompt for learners",
    platforms: ["coursera", "udemy", "university", "custom"],
    defaultDuration: 7,
  },
  case_study: {
    icon: "📋",
    label: "Case Study",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    description: "Real-world case study example",
    platforms: ["coursera", "udemy", "university", "custom"],
    defaultDuration: 20,
  },
  role_play: {
    icon: "🎭",
    label: "Role Play",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    description: "Interactive role play scenario",
    platforms: ["coursera", "university", "custom"],
    defaultDuration: 15,
  },
  coding_exercise: {
    icon: "💻",
    label: "Coding Exercise",
    color: "text-lime-400",
    bgColor: "bg-lime-500/10",
    description: "Hands-on coding challenge",
    platforms: ["udemy", "university", "custom"],
    defaultDuration: 25,
  },
  glossary: {
    icon: "📚",
    label: "Glossary",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    description: "Key terms and definitions",
    platforms: ["coursera", "udemy", "university", "custom"],
    defaultDuration: 3,
  },
};

export function getContentType(type: string): ContentTypeConfig | null {
  return contentTypeMap[type as ContentType] || null;
}

export function isAvailableOnPlatform(
  type: ContentType,
  platform: Platform
): boolean {
  const config = contentTypeMap[type];
  return config ? config.platforms.includes(platform) : false;
}

export function getStatusBadgeVariant(
  status: ContentStatus | string
): {
  bgColor: string;
  textColor: string;
  label: string;
  icon?: string;
} {
  const statusConfig: Record<
    ContentStatus,
    {
      bgColor: string;
      textColor: string;
      label: string;
      icon?: string;
    }
  > = {
    planned: {
      bgColor: "bg-gray-500/20",
      textColor: "text-gray-400",
      label: "Planned",
    },
    generating: {
      bgColor: "bg-blue-500/20",
      textColor: "text-blue-300",
      label: "Generating",
      icon: "⚙",
    },
    draft: {
      bgColor: "bg-gray-500/20",
      textColor: "text-gray-400",
      label: "Draft",
    },
    in_review: {
      bgColor: "bg-amber-500/20",
      textColor: "text-amber-300",
      label: "In Review",
    },
    review_complete: {
      bgColor: "bg-blue-500/20",
      textColor: "text-blue-300",
      label: "Review Complete",
    },
    approved: {
      bgColor: "bg-green-500/20",
      textColor: "text-green-300",
      label: "Approved",
      icon: "✓",
    },
    locked: {
      bgColor: "bg-green-500/20",
      textColor: "text-green-300",
      label: "Locked",
      icon: "🔒",
    },
  };

  return statusConfig[status as ContentStatus] || {
    bgColor: "bg-gray-500/20",
    textColor: "text-gray-400",
    label: status,
  };
}
