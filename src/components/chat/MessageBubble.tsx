import Image from "next/image";

type ChatImagePart = { type: "image"; media: { url: string; mime?: string; caption?: string | null } };
type ChatTextPart = { type: "text"; text: string };
type ChatAudioPart = { type: "audio"; media: { url: string; mime?: string } };
type ChatFilePart = { type: "file"; media: { url: string; mime?: string } };
type ChatUnknownPart = { type: string; media?: { url: string; mime?: string } };
type ChatPart = ChatImagePart | ChatTextPart | ChatAudioPart | ChatFilePart | ChatUnknownPart;

type ChatMessage = { direction: "in" | "out" | string; parts: ChatPart[] };

export function MessageBubble({ msg }: { msg: ChatMessage }) {
  const out = msg.direction === "out"
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"} mb-2`}>
      <div className="max-w-[78%] rounded-2xl border border-border bg-surface px-3 py-2">
        {msg.parts.map((p, i) => {
          if (p.type === "text" && 'text' in p) return <p key={i} className="whitespace-pre-wrap">{p.text}</p>
          if (p.type === "image" && 'media' in p && p.media) return (
            <Image
              key={i}
              src={p.media.url}
              alt={'caption' in p.media && p.media.caption ? p.media.caption : "imagen"}
              width={360}
              height={360}
              unoptimized
              className="mt-2 rounded-xl object-contain h-auto w-[360px]"
            />
          )
          if (p.type === "audio" && 'media' in p && p.media) return (
            <audio key={i} controls className="mt-2 w-full">
              <source src={p.media.url} type={p.media.mime ?? undefined} />
            </audio>
          )
          if (p.type === "file" && 'media' in p && p.media) return (
            <a key={i} href={p.media.url} target="_blank" rel="noreferrer" className="mt-2 block underline">
              Abrir archivo
            </a>
          )
          return (
            <div key={i} className="mt-2 text-sm opacity-70">
              Contenido no soportado{('media' in p && p.media?.url) ? <> · <a href={p.media.url} target="_blank" rel="noreferrer" className="underline">abrir</a></> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
