import { CEO_LETTER } from "@/content/ceo-letter";

const CeoLetter = ({ firstName }: { firstName?: string | null }) => (
  <article className="space-y-4 text-sm leading-relaxed text-foreground/90">
    <p className="font-mono text-xs uppercase tracking-widest text-primary">A letter from our CEO</p>
    <h2 className="font-mono text-2xl font-bold text-foreground">
      {CEO_LETTER.greeting}{firstName ? `, ${firstName}` : ""}.
    </h2>
    {CEO_LETTER.paragraphs.map((p) => (
      <p key={p.slice(0, 24)}>{p}</p>
    ))}
    <div className="pt-2">
      <p className="text-muted-foreground">{CEO_LETTER.signOff}</p>
      <p className="font-mono text-lg font-semibold text-primary">{CEO_LETTER.name}</p>
      <p className="text-xs text-muted-foreground">{CEO_LETTER.title}</p>
    </div>
  </article>
);

export default CeoLetter;
