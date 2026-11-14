// Welcome letter shown to every new account. Draft copy — replace with the CEO's approved wording.
export const CEO_LETTER = {
  greeting: "Welcome to LightOS",
  paragraphs: [
    "Thank you for joining LightRail AI. You signed up because GPU infrastructure is getting in the way of the work you actually care about — training, fine-tuning and shipping models. That is the problem we exist to remove.",
    "LightOS is our agent-first control plane. Today it does a few things honestly and well: it measures your GPUs before suggesting any change, it compares published GPU prices across providers, and it helps you plan workloads with an AI assistant that labels every estimate as an estimate.",
    "We will never show you numbers we did not measure. If a reading is missing, you will see a dash, not a guess. When something is a demo, it will say so.",
    "Your first step is simple: connect one GPU on the Free plan and watch real readings arrive. If anything feels unclear or broken, reply to any email from us — I read them.",
  ],
  signOff: "Building alongside you,",
  name: "Bola Olatunji",
  title: "CEO, LightRail AI",
} as const;
