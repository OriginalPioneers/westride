import type { trackDifficulty } from "./schema";

type TrackDifficulty = (typeof trackDifficulty.enumValues)[number];

export type AcademyTrackSeed = {
  slug: string;
  title: string;
  description: string;
  difficulty: TrackDifficulty;
  category: string;
  estimatedDurationMinutes: number;
  lessonCount: number;
  order: number;
  icon: string;
  tags: string[];
  prerequisites: string[];
  learningObjectives: string[];
  achievementTitle: string;
};

export const academyTracks = [
  {
    slug: "ai-foundations",
    title: "AI Foundations: What AI Is and Why It Matters",
    description:
      "Start your AI journey with a clear, jargon-free introduction to artificial intelligence. Learn what AI can (and can't) do, how it evolved, and why it's transforming work, creativity, and everyday life.",
    difficulty: "BEGINNER",
    category: "Fundamentals",
    estimatedDurationMinutes: 90,
    lessonCount: 8,
    order: 1,
    icon: "Brain",
    tags: ["AI Basics", "Fundamentals", "Beginner Friendly"],
    prerequisites: [],
    learningObjectives: [
      "Define artificial intelligence, machine learning, and deep learning in plain language",
      "Understand the history and major milestones of modern AI",
      "Identify common AI applications in everyday products and services",
      "Recognize the limitations, risks, and ethical considerations of AI",
    ],
    achievementTitle: "AI Explorer",
  },
  {
    slug: "how-ai-models-learn",
    title: "How AI Models Learn: Machine Learning, Neural Networks & LLMs",
    description:
      "Go behind the scenes and discover how AI models are trained. Explore data, neural networks, transformers, and large language models — explained visually and without advanced math.",
    difficulty: "BEGINNER",
    category: "AI Models",
    estimatedDurationMinutes: 150,
    lessonCount: 10,
    order: 2,
    icon: "Network",
    tags: ["Machine Learning", "Neural Networks", "LLMs", "Transformers"],
    prerequisites: ["ai-foundations"],
    learningObjectives: [
      "Explain how machines learn from data through training and inference",
      "Understand neural networks, parameters, and tokens",
      "Describe how transformers power modern large language models like Llama",
      "Compare different types of AI models and their use cases",
    ],
    achievementTitle: "Model Thinker",
  },
  {
    slug: "generative-ai-explained",
    title: "Generative AI Explained: Creating Text, Images, Audio and Video",
    description:
      "Discover the technology behind AI that creates. Learn how generative models produce text, images, music, and video, and explore the tools reshaping creative and knowledge work.",
    difficulty: "BEGINNER",
    category: "Generative AI",
    estimatedDurationMinutes: 120,
    lessonCount: 9,
    order: 3,
    icon: "Sparkles",
    tags: ["Generative AI", "Text Generation", "Image Generation", "Creativity"],
    prerequisites: ["how-ai-models-learn"],
    learningObjectives: [
      "Explain how generative AI differs from traditional AI",
      "Understand how text, image, audio, and video generation models work",
      "Explore popular generative AI tools and their capabilities",
      "Evaluate the quality, originality, and limitations of AI-generated content",
    ],
    achievementTitle: "Generative Creator",
  },
  {
    slug: "meet-meta-ai-and-llama",
    title: "Meet Meta AI & Llama: Exploring Meta's Open AI Ecosystem",
    description:
      "Get hands-on with Meta AI and the Llama family of open models. Learn why open-source AI matters, how Llama compares to closed models, and where Meta AI appears across Meta's apps and devices.",
    difficulty: "BEGINNER",
    category: "Meta AI",
    estimatedDurationMinutes: 90,
    lessonCount: 8,
    order: 4,
    icon: "Bot",
    tags: ["Meta AI", "Llama", "Open Source", "Meta Ecosystem"],
    prerequisites: ["generative-ai-explained"],
    learningObjectives: [
      "Describe the Llama model family and its different sizes and capabilities",
      "Explain the benefits and trade-offs of open vs. closed AI models",
      "Use Meta AI across chat, search, and creative workflows",
      "Understand Meta's approach to responsible and open AI development",
    ],
    achievementTitle: "Llama Insider",
  },
  {
    slug: "prompt-engineering-mastery",
    title: "Prompt Engineering Mastery: Get Better Results from Any AI",
    description:
      "The quality of your results depends on the quality of your prompts. Master proven techniques — from clear instructions and few-shot examples to chain-of-thought and role-based prompting — using Meta AI and Llama.",
    difficulty: "INTERMEDIATE",
    category: "Prompt Engineering",
    estimatedDurationMinutes: 180,
    lessonCount: 12,
    order: 5,
    icon: "MessageSquareCode",
    tags: ["Prompt Engineering", "Meta AI", "Llama", "Productivity"],
    prerequisites: ["meet-meta-ai-and-llama"],
    learningObjectives: [
      "Write clear, structured prompts that produce reliable outputs",
      "Apply techniques like few-shot prompting, chain-of-thought, and system prompts",
      "Iterate and debug prompts to fix poor or inconsistent results",
      "Build reusable prompt templates for writing, coding, analysis, and learning",
    ],
    achievementTitle: "Prompt Master",
  },
  {
    slug: "build-with-llama",
    title: "Build with Llama: Create Your First AI-Powered Applications",
    description:
      "Move from user to builder. Learn how to access Llama via APIs and playgrounds, integrate it into apps, work with embeddings and RAG, and prototype your first working AI features — with low-code and code options.",
    difficulty: "INTERMEDIATE",
    category: "Development",
    estimatedDurationMinutes: 240,
    lessonCount: 12,
    order: 6,
    icon: "Code2",
    tags: ["Llama", "APIs", "RAG", "App Development", "Building"],
    prerequisites: ["prompt-engineering-mastery"],
    learningObjectives: [
      "Access and experiment with Llama models through APIs and hosted platforms",
      "Build a simple AI-powered app or chatbot from scratch",
      "Understand embeddings, vector search, and retrieval-augmented generation (RAG)",
      "Learn the basics of fine-tuning, evaluation, cost, and deployment",
    ],
    achievementTitle: "Llama Builder",
  },
  {
    slug: "ai-agents-and-automation",
    title: "AI Agents & Automation: Building Assistants That Take Action",
    description:
      "AI is evolving from answering questions to completing tasks. Learn how AI agents plan, use tools, browse, call APIs, and automate multi-step workflows — and build your own simple agent.",
    difficulty: "ADVANCED",
    category: "AI Agents",
    estimatedDurationMinutes: 210,
    lessonCount: 11,
    order: 7,
    icon: "Workflow",
    tags: ["AI Agents", "Automation", "Tool Use", "Workflows"],
    prerequisites: ["build-with-llama"],
    learningObjectives: [
      "Explain what AI agents are and how they differ from chatbots",
      "Understand planning, memory, tool use, and function calling",
      "Design multi-step automated workflows powered by LLMs",
      "Identify safety, reliability, and human-oversight requirements for agents",
    ],
    achievementTitle: "Agent Architect",
  },
  {
    slug: "multimodal-creative-ai",
    title: "Multimodal & Creative AI: Working with Images, Voice and Video",
    description:
      "AI no longer speaks only in text. Explore multimodal models that understand and create images, audio, and video, and learn creative workflows for design, content, marketing, and storytelling with Meta AI tools.",
    difficulty: "INTERMEDIATE",
    category: "Creative AI",
    estimatedDurationMinutes: 150,
    lessonCount: 9,
    order: 8,
    icon: "Image",
    tags: ["Multimodal AI", "Image AI", "Voice AI", "Video AI", "Creativity"],
    prerequisites: ["prompt-engineering-mastery"],
    learningObjectives: [
      "Understand how multimodal models process text, images, audio, and video together",
      "Create and edit images using effective visual prompting techniques",
      "Explore AI workflows for voice, music, and video content",
      "Combine multiple AI tools into a complete creative pipeline",
    ],
    achievementTitle: "Multimodal Creator",
  },
  {
    slug: "ai-in-action-real-world",
    title: "AI in Action: Real-World Use Cases for Work, Business and Life",
    description:
      "See how AI delivers real value today. Explore practical case studies across business, marketing, education, healthcare, customer support, and personal productivity — and learn to spot high-value AI opportunities.",
    difficulty: "INTERMEDIATE",
    category: "Applications",
    estimatedDurationMinutes: 120,
    lessonCount: 8,
    order: 9,
    icon: "Briefcase",
    tags: ["Business", "Productivity", "Careers", "Use Cases", "Case Studies"],
    prerequisites: ["prompt-engineering-mastery"],
    learningObjectives: [
      "Identify high-impact AI use cases in major industries and job roles",
      "Apply AI to productivity, communication, research, and decision-making",
      "Evaluate AI tools and opportunities using ROI and feasibility criteria",
      "Understand how AI is changing careers and the skills employers value",
    ],
    achievementTitle: "AI Practitioner",
  },
  {
    slug: "idea-to-launch-ai-product",
    title: "From Idea to Launch: Build Your Own AI Product",
    description:
      "Your capstone journey. Turn an idea into a working AI product — validate the problem, design the experience, build a prototype with Meta AI and Llama, test with users, and plan your launch.",
    difficulty: "ADVANCED",
    category: "Capstone",
    estimatedDurationMinutes: 300,
    lessonCount: 10,
    order: 10,
    icon: "Rocket",
    tags: ["Capstone", "Product Building", "Llama", "Entrepreneurship", "Launch"],
    prerequisites: [
      "build-with-llama",
      "ai-agents-and-automation",
      "ai-in-action-real-world",
    ],
    learningObjectives: [
      "Validate an AI product idea with a clear problem, audience, and value proposition",
      "Design an AI user experience with trust, safety, and human oversight built in",
      "Build and test a working prototype using Meta AI and Llama",
      "Create a launch, feedback, and iteration plan for your product",
    ],
    achievementTitle: "AI Founder",
  },
] satisfies AcademyTrackSeed[];
