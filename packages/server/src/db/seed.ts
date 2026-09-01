import { db } from "./index";
import { profiles, tasks } from "./schema";

async function seed() {
  console.log("Seeding Rabbit database...");

  const profileId = crypto.randomUUID();

  await db.insert(profiles).values({
    id: profileId,
    name: "LinkedIn Recruiter - West Coast",
    description:
      "Authenticated LinkedIn session with premium recruiting access for SF/LA markets.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const demoTasks = [
    {
      id: crypto.randomUUID(),
      profileId,
      description:
        "Login to LinkedIn, search for 'Senior Machine Learning Engineer' in San Francisco, extract the top 5 profiles (Name, Headline, Company), and save the results as JSON.",
      status: "queued" as const,
      proxyCountry: "us",
      stealthEnabled: true,
      captchaEnabled: true,
      recordingEnabled: true,
      maxSteps: 50,
      timeoutMs: 300_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      profileId: null,
      description:
        "Go to Amazon.com, search for 'Sony WH-1000XM5 headphones', find the listing with the lowest price among 'New' items, add it to the cart, and verify the final checkout total including estimated tax.",
      status: "queued" as const,
      proxyCountry: "us",
      stealthEnabled: true,
      captchaEnabled: true,
      recordingEnabled: true,
      maxSteps: 40,
      timeoutMs: 300_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      profileId: null,
      description:
        "Navigate to GitHub trending repositories for TypeScript today. Open the number one trending repository, read the README to extract the core value proposition, and check the issues tab to see if there are any open critical or p0 bugs.",
      status: "queued" as const,
      proxyCountry: "us",
      stealthEnabled: false,
      captchaEnabled: false,
      recordingEnabled: true,
      maxSteps: 30,
      timeoutMs: 300_000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const task of demoTasks) {
    await db.insert(tasks).values(task);
  }

  console.log("Successfully seeded database with premium demo data.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
